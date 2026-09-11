import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 24000;

function decodeXml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractTextFromPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      return numA - numB;
    });

  let fullText = "";
  for (let i = 0; i < slideFiles.length; i++) {
    const xmlContent = await zip.files[slideFiles[i]].async("text");
    const matches = [...xmlContent.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)];
    const slideText = matches.map((m) => decodeXml(m[1])).join(" ").trim();
    if (slideText) {
      fullText += `\n--- Slide ${i + 1} ---\n${slideText}\n`;
    }
  }
  return fullText.trim();
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const cardCount = formData.get("cardCount") || "15";
    const focus = (formData.get("focus") || "").toString().trim();

    if (!file || typeof file === "string") {
      return Response.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Server is missing GEMINI_API_KEY. Add it to your environment variables." },
        { status: 500 }
      );
    }

    const filename = file.name || "uploaded_file";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const mime = file.type || "";
    const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const rawModel = (process.env.GEMINI_MODEL || "gemini-3.6-flash-lite").trim();
    // Map friendly names to real API model IDs
    // gemini-3.6-flash is the current recommended model
    const lc = rawModel.toLowerCase().replace(/\s+/g, "-");
    let requestedModel;
    if (lc.includes("flash-lite")) {
      requestedModel = "gemini-3.6-flash-lite";
    } else if (lc.includes("flash")) {
      requestedModel = "gemini-3.6-flash";
    } else {
      requestedModel = rawModel.startsWith("gemini-") ? rawModel : `gemini-${rawModel}`;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: requestedModel,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const focusLine = focus ? `Pay special attention to this topic/section: "${focus}".` : "";

    const systemInstructions = `You are an expert study assistant helping a student build a high-retention study deck from lecture slides, screenshots, notes, or textbook materials.

Produce:
1. A short, plain "title" for this deck (max 6 words, based on the actual material).
2. Exactly ${cardCount} high-yield flashcards testing key definitions, mechanisms, concepts, formulas, and relationships.
   For each flashcard, provide:
   - "front": concise question or prompt.
   - "back": clear, complete-sentence answer explanation (1-3 sentences).
   - "options": exactly 4 distinct choices (one correct answer and three plausible distractors).
   - "correctIndex": integer (0, 1, 2, or 3) indicating which option is correct.
3. 5 multiple-choice quiz questions drawn from the same material, each with "question", 4 "options", and a zero-indexed "correctIndex".

${focusLine}

Rules:
- Base everything strictly on the provided material. Do not hallucinate unsupported facts.
- Front questions should be punchy and clear.
- Distractors in "options" must be plausible and educational, not absurd.
- Shuffle the correct option position across different cards so correctIndex varies between 0, 1, 2, and 3.

Return ONLY valid JSON matching this exact shape, no markdown fences, no extra commentary:
{
  "title": "string",
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0
    }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0
    }
  ]
}`;

    let result;

    if (isImage) {
      // Multimodal processing directly with Gemini Vision
      const imagePart = {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mime || "image/png",
        },
      };

      const prompt = `${systemInstructions}\n\nAnalyze the provided image/screenshot carefully and generate the study deck from all visible slides, diagrams, and text.`;
      result = await model.generateContent([prompt, imagePart]);
    } else {
      let text = "";

      if (ext === "pptx" || mime.includes("presentation") || mime.includes("powerpoint")) {
        try {
          text = await extractTextFromPptx(buffer);
        } catch (e) {
          console.error("PPTX error:", e);
          return Response.json(
            { error: "Couldn't extract text from that PowerPoint presentation. Try saving as PDF or taking screenshots." },
            { status: 400 }
          );
        }
      } else if (ext === "docx" || mime.includes("wordprocessing")) {
        try {
          const res = await mammoth.extractRawText({ buffer });
          text = (res.value || "").trim();
        } catch (e) {
          console.error("DOCX error:", e);
          return Response.json(
            { error: "Couldn't read that Word document. Try saving as PDF or plain text." },
            { status: 400 }
          );
        }
      } else if (ext === "txt" || ext === "md" || mime.startsWith("text/")) {
        text = buffer.toString("utf-8").trim();
      } else {
        // Default to PDF parsing
        try {
          const parsed = await pdfParse(buffer);
          text = (parsed.text || "").trim();
        } catch (e) {
          return Response.json(
            { error: "Couldn't read that PDF. If it's a scanned PDF, try taking a screenshot or image instead!" },
            { status: 400 }
          );
        }
      }

      if (!text || text.length < 30) {
        return Response.json(
          {
            error:
              "Could not find sufficient text in that file. If your document is an image or scan, upload it as a PNG/JPG screenshot!",
          },
          { status: 400 }
        );
      }

      const trimmedText = text.slice(0, MAX_CHARS);
      const prompt = `${systemInstructions}\n\nSOURCE TEXT:\n"""\n${trimmedText}\n"""`;
      result = await model.generateContent(prompt);
    }

    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return Response.json({ error: "The AI returned an unexpected format. Please try again." }, { status: 502 });
      }
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      return Response.json({ error: "No flashcards generated. Try uploading clearer slides or notes." }, { status: 502 });
    }

    // Ensure all flashcards have options and correctIndex fallback if ever missing
    const formattedCards = parsed.flashcards.map((c, i) => {
      let options = Array.isArray(c.options) && c.options.length >= 2 ? c.options : null;
      let correctIndex = typeof c.correctIndex === "number" ? c.correctIndex : 0;

      if (!options) {
        options = [c.back, "Not mentioned in source", "Opposite is true", "Inconclusive evidence"];
        correctIndex = 0;
      }

      return {
        front: c.front,
        back: c.back,
        options,
        correctIndex,
      };
    });

    const fallbackTitle = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    return Response.json({
      title: parsed.title || fallbackTitle || "Study Deck",
      flashcards: formattedCards,
      quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
    });
  } catch (err) {
    console.error("API generate error:", err);
    const errorMsg = err?.message || "Something went wrong generating the deck. Please try again.";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}

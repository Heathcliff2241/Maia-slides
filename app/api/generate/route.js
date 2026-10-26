import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

function getKeys() {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

// In-memory cooldown tracking for keys that exhausted quota (per warm serverless instance)
const keyCooldown = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function classifyError(e) {
  const s = e?.status ?? e?.code ?? 0;
  const msg = e?.message || "";
  if (s === 429 || /429|quota|rate limit|resource has been exhausted/i.test(msg)) {
    return "quota";
  }
  if (s === 503 || s === 500 || s === 504 || /503|504|high demand|overloaded|unavailable/i.test(msg)) {
    return "busy";
  }
  if (s === 400 && /api key/i.test(msg)) {
    return "badkey";
  }
  if (s === 401 || s === 403 || /API_KEY_INVALID|permission|forbidden|unauthorized/i.test(msg)) {
    return "badkey";
  }
  return "fatal";
}

async function generateWithFailover({ contents, config, models }) {
  const keys = getKeys();
  if (!keys.length) {
    throw new Error(
      "Server is missing GEMINI_API_KEY or GEMINI_API_KEYS. Add it to your environment variables."
    );
  }

  // Randomize starting key index so concurrent requests load-balance across keys
  const start = Math.floor(Math.random() * keys.length);
  const orderedKeys = keys.map((_, i) => keys[(start + i) % keys.length]);
  let lastErr = null;

  for (const key of orderedKeys) {
    const cdUntil = keyCooldown.get(key) || 0;
    if (cdUntil > Date.now()) continue;

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    for (const modelName of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config,
          });
          return response;
        } catch (e) {
          lastErr = e;
          const kind = classifyError(e);
          if (kind === "fatal") throw e; // Fatal error (e.g. invalid request structure)
          if (kind === "quota" || kind === "badkey") {
            keyCooldown.set(key, Date.now() + 60_000); // Cooldown for 1 minute
            break; // Switch to next key
          }
          // Busy / 503 / 500: short exponential backoff before retrying attempt or fallback model
          await sleep(700 * 2 ** attempt + Math.random() * 300);
        }
      }
    }
  }

  throw (
    lastErr ||
    new Error("All Gemini API keys or models are currently busy. Please try again shortly.")
  );
}

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

function cleanExtractedText(rawText) {
  if (!rawText) return "";
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Identify lines that repeat 4+ times (headers, footers, course numbers)
  const lineCounts = new Map();
  for (const line of lines) {
    if (line.length < 90) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }
  }

  const filtered = lines.filter((line) => {
    if (lineCounts.get(line) >= 4) return false;
    // Drop standalone page or slide numbers
    if (/^(page\s+\d+(\s+of\s+\d+)?|\d+(\/\d+)?|slide\s+\d+)$/i.test(line)) return false;
    return true;
  });

  return filtered
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sampleDocumentText(text, targetChars) {
  if (!text || text.length <= targetChars) return text;

  // Split into logical sections
  const sections = text.split(/\n\s*\n/).filter((s) => s.trim().length > 15);
  if (sections.length <= 4) {
    const third = Math.floor(targetChars / 3);
    const midStart = Math.floor(text.length / 2 - third / 2);
    return `${text.slice(0, third)}\n\n[...]\n\n${text.slice(midStart, midStart + third)}\n\n[...]\n\n${text.slice(-third)}`;
  }

  // Sample evenly throughout the entire presentation or document
  const totalSections = sections.length;
  const avgSectionLen = text.length / totalSections;
  const sectionsNeeded = Math.min(totalSections, Math.max(6, Math.floor(targetChars / avgSectionLen)));
  const step = totalSections / sectionsNeeded;

  const sampled = [];
  let currentLen = 0;
  for (let i = 0; i < sectionsNeeded && currentLen < targetChars; i++) {
    const idx = Math.min(Math.floor(i * step), totalSections - 1);
    const sec = sections[idx];
    sampled.push(sec);
    currentLen += sec.length + 4;
  }
  return sampled.join("\n\n---\n\n");
}

function shuffleOptions(opts) {
  // opts[0] is the correct answer by contract from the model
  const safeOpts =
    Array.isArray(opts) && opts.length >= 2
      ? [...opts]
      : [opts?.[0] || "Correct Answer", "Option B", "Option C", "Option D"];

  while (safeOpts.length < 4) {
    safeOpts.push(`Distractor ${safeOpts.length + 1}`);
  }

  const idx = [0, 1, 2, 3].slice(0, safeOpts.length);
  // Fisher-Yates shuffle
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }

  return {
    options: idx.map((i) => safeOpts[i]),
    correctIndex: idx.indexOf(0),
  };
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

    const keys = getKeys();
    if (!keys.length) {
      return Response.json(
        {
          error:
            "Server is missing GEMINI_API_KEY or GEMINI_API_KEYS. Please add it to your environment variables.",
        },
        { status: 500 }
      );
    }

    const filename = file.name || "uploaded_file";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const mime = file.type || "";
    const isImage =
      mime.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Primary model and fallback cascade
    const rawModel = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
    const candidateModels = [
      rawModel,
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
    ].filter((m, i, a) => m && a.indexOf(m) === i);

    const focusLine = focus ? `Pay special attention to this topic or section: "${focus}".` : "";

    // Lean system instruction with prompt caching & minimal token footprint
    const systemInstruction = `You are an expert study assistant creating high-yield active-recall study flashcards.
Requirements:
1. Base flashcards strictly on the provided lecture or study material.
2. Produce exactly ${cardCount} flashcards.
3. For each flashcard:
   - "f": concise question or prompt testing a core concept, definition, mechanism, or relationship.
   - "b": 1-2 sentence clear answer explanation.
   - "o": exactly 4 options. The CORRECT answer MUST always be at index 0, followed by 3 plausible distractors.
${focusLine}`;

    // Highly optimized response schema with compact keys (f, b, o)
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Short, punchy deck title (max 6 words)",
        },
        cards: {
          type: Type.ARRAY,
          description: "List of flashcard objects",
          items: {
            type: Type.OBJECT,
            properties: {
              f: {
                type: Type.STRING,
                description: "Front prompt or question",
              },
              b: {
                type: Type.STRING,
                description: "Back 1-2 sentence answer explanation",
              },
              o: {
                type: Type.ARRAY,
                description:
                  "4 options where index 0 is ALWAYS the correct answer, followed by 3 distractors",
                items: { type: Type.STRING },
              },
            },
            required: ["f", "b", "o"],
          },
        },
      },
      required: ["title", "cards"],
    };

    const config = {
      responseMimeType: "application/json",
      responseSchema,
      systemInstruction,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    };

    let response;

    if (isImage) {
      const imagePart = {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mime || "image/jpeg",
        },
      };

      const userPrompt =
        "Analyze this slide or notes image and generate the requested study flashcards.";
      response = await generateWithFailover({
        contents: [imagePart, { text: userPrompt }],
        config,
        models: candidateModels,
      });
    } else {
      let rawText = "";

      if (ext === "pptx" || mime.includes("presentation") || mime.includes("powerpoint")) {
        try {
          rawText = await extractTextFromPptx(buffer);
        } catch (e) {
          console.error("PPTX extraction error:", e);
          return Response.json(
            {
              error:
                "Couldn't extract text from that PowerPoint presentation. Try saving as PDF or taking screenshots.",
            },
            { status: 400 }
          );
        }
      } else if (ext === "docx" || mime.includes("wordprocessing")) {
        try {
          const res = await mammoth.extractRawText({ buffer });
          rawText = (res.value || "").trim();
        } catch (e) {
          console.error("DOCX extraction error:", e);
          return Response.json(
            {
              error: "Couldn't read that Word document. Try saving as PDF or plain text.",
            },
            { status: 400 }
          );
        }
      } else if (ext === "txt" || ext === "md" || mime.startsWith("text/")) {
        rawText = buffer.toString("utf-8").trim();
      } else {
        try {
          const parsed = await pdfParse(buffer);
          rawText = (parsed.text || "").trim();
        } catch (e) {
          console.error("PDF parse error:", e);
          return Response.json(
            {
              error:
                "Couldn't read that PDF. If it's a scanned PDF, try taking a screenshot instead!",
            },
            { status: 400 }
          );
        }
      }

      if (!rawText || rawText.length < 30) {
        return Response.json(
          {
            error:
              "Could not find readable text in that file. If your document is scanned or an image, upload it as a PNG/JPG screenshot!",
          },
          { status: 400 }
        );
      }

      // Clean headers, footers, page numbers and sample intelligently across the full document
      const cleaned = cleanExtractedText(rawText);
      const targetBudgetChars = Math.min(32000, Math.max(8000, Number(cardCount) * 900));
      const sampledText = sampleDocumentText(cleaned, targetBudgetChars);

      const userPrompt = `SOURCE MATERIAL:\n"""\n${sampledText}\n"""`;
      response = await generateWithFailover({
        contents: userPrompt,
        config,
        models: candidateModels,
      });
    }

    const raw = response.text || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return Response.json(
          { error: "The AI returned an unexpected response format. Please try again." },
          { status: 502 }
        );
      }
      parsed = JSON.parse(match[0]);
    }

    const cardsList = Array.isArray(parsed.cards) ? parsed.cards : parsed.flashcards;
    if (!Array.isArray(cardsList) || cardsList.length === 0) {
      return Response.json(
        { error: "No flashcards generated. Try uploading clearer slides or notes." },
        { status: 502 }
      );
    }

    // Format cards and shuffle options in code to avoid LLM position bias and save tokens
    const formattedCards = cardsList.map((c, i) => {
      const front = c.f || c.front || `Card ${i + 1}`;
      const back = c.b || c.back || "";
      const rawOptions = c.o || c.options || [back];
      const { options, correctIndex } = shuffleOptions(rawOptions);

      return {
        front,
        back,
        options,
        correctIndex,
      };
    });

    // Synthesize the 5-question quiz client/server-side from the flashcards (saving ~350+ LLM output tokens)
    const quizCandidates = [...formattedCards].sort(() => 0.5 - Math.random());
    const quiz = quizCandidates.slice(0, Math.min(5, quizCandidates.length)).map((c, i) => ({
      id: `q${i}`,
      question: c.front,
      options: c.options,
      correctIndex: c.correctIndex,
    }));

    const fallbackTitle = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    return Response.json({
      title: parsed.title || fallbackTitle || "Study Deck",
      flashcards: formattedCards,
      quiz,
    });
  } catch (err) {
    console.error("API generate error:", err);
    const errorMsg =
      err?.message || "Something went wrong generating the deck. Please try again.";
    return Response.json({ error: errorMsg }, { status: 500 });
  }
}

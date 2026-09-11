import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 18000; // keep prompt + cost reasonable

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const cardCount = formData.get("cardCount") || "15";
    const focus = (formData.get("focus") || "").toString().trim();

    if (!file || typeof file === "string") {
      return Response.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Server is missing GEMINI_API_KEY. Add it to your environment variables." },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";
    try {
      const parsed = await pdfParse(buffer);
      text = (parsed.text || "").trim();
    } catch (e) {
      return Response.json(
        { error: "Couldn't read that PDF. It may be scanned/image-based or corrupted." },
        { status: 400 }
      );
    }

    if (!text || text.length < 40) {
      return Response.json(
        { error: "That PDF didn't have extractable text (it may be a scan). Try a text-based PDF." },
        { status: 400 }
      );
    }

    const trimmedText = text.slice(0, MAX_CHARS);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const focusLine = focus ? `Pay special attention to this topic/section: "${focus}".` : "";

    const prompt = `You are helping a student build a study deck from lecture/textbook material.

Read the source text below and produce:
1. A short, plain "title" for this deck (max 6 words, based on the actual content).
2. Exactly ${cardCount} flashcards testing the most important concepts, facts, definitions, or relationships. Each flashcard has a "front" (a question or term, concise) and "back" (a clear, complete-sentence answer, 1-3 sentences).
3. 5 multiple-choice quiz questions drawn from the same material, each with exactly 4 "options" and a zero-indexed "correctIndex".

${focusLine}

Rules:
- Base everything strictly on the provided text. Do not invent facts not supported by it.
- Vary flashcard difficulty and phrasing; avoid near-duplicate cards.
- Keep fronts short (a question or term), backs informative but not bloated.
- Quiz distractors should be plausible, not silly.

Return ONLY valid JSON matching this exact shape, no markdown fences, no commentary:
{
  "title": "string",
  "flashcards": [{ "front": "string", "back": "string" }],
  "quiz": [{ "question": "string", "options": ["string","string","string","string"], "correctIndex": 0 }]
}

SOURCE TEXT:
"""
${trimmedText}
"""`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return Response.json({ error: "Gemini returned an unexpected format. Try again." }, { status: 502 });
      }
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
      return Response.json({ error: "No flashcards came back. Try a different PDF or fewer cards." }, { status: 502 });
    }

    return Response.json({
      title: parsed.title || file.name?.replace(/\.pdf$/i, "") || "Untitled deck",
      flashcards: parsed.flashcards,
      quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Something went wrong generating the deck. Please try again." }, { status: 500 });
  }
}

"use client";

import { useRef, useState } from "react";

export default function UploadCard({ onDeckReady }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cardCount, setCardCount] = useState("15");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function pickFile(f) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleGenerate() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("cardCount", cardCount);
    formData.append("focus", focus);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      const now = Date.now();
      const deck = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        title: data.title,
        createdAt: now,
        cards: data.flashcards.map((c, i) => ({
          id: `c${i}`,
          front: c.front,
          back: c.back,
          box: 1,
          nextReview: now,
        })),
        quiz: (data.quiz || []).map((q, i) => ({ id: `q${i}`, ...q })),
      };

      onDeckReady(deck);
      setFile(null);
      setFocus("");
      setLoading(false);
    } catch (e) {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="card upload-card">
      <span className="punch" />
      <h2>New deck</h2>
      <p className="hint">Drop in a PDF — lecture slides, a chapter, notes — and get a deck to study.</p>

      <div
        className={`drop ${dragging ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          id="pdf-input"
          type="file"
          accept="application/pdf"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        <label htmlFor="pdf-input">{file ? "Choose a different PDF" : "Choose a PDF, or drag it here"}</label>
        {file && <div className="filename">{file.name}</div>}
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="cardCount">Cards to generate</label>
          <select id="cardCount" value={cardCount} onChange={(e) => setCardCount(e.target.value)}>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="30">30</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="focus">Focus on (optional)</label>
          <input
            id="focus"
            type="text"
            placeholder="e.g. chapter 3"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
      </div>

      <div className="upload-actions">
        {loading ? (
          <div className="loading-line">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            Reading the PDF and writing your cards…
          </div>
        ) : (
          <button className="btn btn-primary" disabled={!file} onClick={handleGenerate}>
            Generate deck
          </button>
        )}
      </div>

      {error && <p className="error-note">{error}</p>}
    </div>
  );
}

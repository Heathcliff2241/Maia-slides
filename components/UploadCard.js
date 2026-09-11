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
    if (f.type !== "application/pdf" && !f.name?.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a valid PDF file.");
      return;
    }
    setError("");
    setFile(f);
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
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
        setError(data.error || "Could not generate flashcards. Please try again.");
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
      setError("Network or server issue. Check your connection or API key and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="card upload-card" id="upload-section">
      <span className="punch" />
      <div className="card-header-row">
        <div>
          <h2>Create a New Study Deck</h2>
          <p className="hint">
            Drop in your lecture slides, readings, or notes to instantly generate smart flashcards and a quiz.
          </p>
        </div>
        <span className="deck-type-pill">PDF & Slides</span>
      </div>

      <div
        className={`drop ${dragging ? "active" : ""} ${file ? "has-file" : ""}`}
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
        
        {file ? (
          <div className="file-preview-box">
            <div className="file-icon-badge">📄</div>
            <div className="file-details">
              <span className="file-name-text">{file.name}</span>
              <span className="file-size-text">{formatFileSize(file.size)} · Ready to process</span>
            </div>
            <button
              type="button"
              className="file-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              title="Remove file"
            >
              ✕
            </button>
          </div>
        ) : (
          <label htmlFor="pdf-input" className="drop-inner-label">
            <span className="drop-icon">📑</span>
            <span className="drop-main-text">
              <strong>Click to upload</strong> or drag & drop your slides PDF
            </span>
            <span className="drop-subtext">Supports lecture presentations, textbook chapters, and study sheets</span>
          </label>
        )}
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="cardCount">Deck Size</label>
          <select id="cardCount" value={cardCount} onChange={(e) => setCardCount(e.target.value)}>
            <option value="10">10 cards (Quick review)</option>
            <option value="15">15 cards (Standard)</option>
            <option value="20">20 cards (Comprehensive)</option>
            <option value="30">30 cards (Deep dive)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="focus">Topic Focus (Optional)</label>
          <input
            id="focus"
            type="text"
            placeholder="e.g. Chapter 4, key formulas, dates, vocabulary..."
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>
      </div>

      <div className="upload-actions">
        {loading ? (
          <div className="loading-container">
            <div className="loading-line">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span>Maia is analyzing your slides and crafting cards & quiz…</span>
            </div>
            <div className="loading-subtext">Usually takes ~10-15 seconds with Gemini AI</div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-generate"
            disabled={!file}
            onClick={handleGenerate}
          >
            Generate Study Deck ✨
          </button>
        )}
      </div>

      {error && <p className="error-note">⚠️ {error}</p>}
    </div>
  );
}

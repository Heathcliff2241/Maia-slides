"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileImage,
  Presentation,
  FileDoc,
  FilePdf,
  FileText,
  X,
  CloudArrowUp,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";

export default function UploadCard({ onDeckReady }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [cardCount, setCardCount] = useState("15");
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function pickFile(f) {
    if (!f) return;
    setError("");
    setFile(f);
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function renderFileIcon(f) {
    if (!f) return <FileText size={26} weight="duotone" color="var(--rose)" />;
    const name = f.name.toLowerCase();
    if (f.type.startsWith("image/") || name.match(/\.(png|jpe?g|webp|gif)$/)) {
      return <FileImage size={26} weight="duotone" color="var(--rose)" />;
    }
    if (name.endsWith(".pptx")) {
      return <Presentation size={26} weight="duotone" color="var(--gold)" />;
    }
    if (name.endsWith(".docx")) {
      return <FileDoc size={26} weight="duotone" color="var(--rose-deep)" />;
    }
    if (name.endsWith(".pdf")) {
      return <FilePdf size={26} weight="duotone" color="var(--rose)" />;
    }
    return <FileText size={26} weight="duotone" color="var(--plum)" />;
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
          options: c.options || [],
          correctIndex: typeof c.correctIndex === "number" ? c.correctIndex : 0,
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
            Drop in lecture slides, textbook PDFs, PowerPoint, Word docs, or slide screenshots.
          </p>
        </div>
        <span className="deck-type-pill">PDF · PPTX · DOCX · Images</span>
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
          accept="application/pdf,image/*,.docx,.pptx,.txt,.md"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {file ? (
          <div className="file-preview-box">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="file-image-thumb" />
            ) : (
              <div className="file-icon-badge">{renderFileIcon(file)}</div>
            )}
            <div className="file-details">
              <span className="file-name-text">{file.name}</span>
              <span className="file-size-text">
                {formatFileSize(file.size)} · Ready to process with Gemini
              </span>
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
              <X size={13} weight="bold" />
            </button>
          </div>
        ) : (
          <label htmlFor="pdf-input" className="drop-inner-label">
            <CloudArrowUp size={36} weight="duotone" color="var(--rose)" style={{ marginBottom: 4 }} />
            <span className="drop-main-text">
              <strong>Click to upload</strong> or drag & drop files here
            </span>
            <span className="drop-subtext">
              Accepts PDF, PowerPoint (.pptx), Word (.docx), or Screenshots & Photos
            </span>
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
              <span>Maia is reading your material & crafting cards with multiple choices…</span>
            </div>
            <div className="loading-subtext">Gemini 3.5 Flash-Lite is analyzing text & diagrams (~10s)</div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-generate"
            disabled={!file}
            onClick={handleGenerate}
            type="button"
          >
            <Sparkle size={16} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
            Generate Study Deck
          </button>
        )}
      </div>

      {error && (
        <p className="error-note">
          <WarningCircle size={15} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { isDue, nextCardState } from "../lib/spacedRepetition";

export default function StudyView({ deck, onExit, onDeckUpdate }) {
  const initialQueue = useMemo(() => deck.cards.filter(isDue).map((c) => c.id), [deck.id]);
  const [queue, setQueue] = useState(initialQueue);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const totalToReview = initialQueue.length;
  const currentId = queue[0];
  const currentCard = deck.cards.find((c) => c.id === currentId);
  const done = totalToReview === 0 || queue.length === 0;

  function rate(rating) {
    if (!currentCard) return;

    const updatedCard = nextCardState(currentCard, rating);
    onDeckUpdate((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
    }));

    setReviewedCount((n) => n + 1);
    setFlipped(false);

    setQueue((q) => {
      const rest = q.slice(1);
      // "again" cards come back later in this same session
      if (rating === "again") return [...rest, currentId];
      return rest;
    });
  }

  if (totalToReview === 0) {
    return (
      <div className="card session-done">
        <span className="punch" />
        <div className="big">All caught up 🐰</div>
        <p className="sub">Nothing's due in "{deck.title}" right now. Come back later, or review anyway.</p>
        <button className="btn btn-primary" onClick={onExit}>
          Back to decks
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card session-done">
        <span className="punch" />
        <div className="big">Nice work, Maia 🎀</div>
        <p className="sub">You reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"} in "{deck.title}".</p>
        <button className="btn btn-primary" onClick={onExit}>
          Back to decks
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="study-head">
        <button className="back" onClick={onExit}>
          ← Back
        </button>
        <span className="meta" style={{ fontSize: 12.5, color: "var(--plum-soft)" }}>
          {deck.title}
        </span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(reviewedCount / totalToReview) * 100}%` }}
        />
      </div>

      <div className="flip-scene">
        <div className={`flip-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
          <div className="flip-inner">
            <div className="face front">
              <p>{currentCard.front}</p>
              <span className="tap-hint">Tap to flip</span>
            </div>
            <div className="face back">
              <p>{currentCard.back}</p>
              <span className="tap-hint">Tap to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="review-actions">
          <button className="again" onClick={() => rate("again")}>
            Again
            <small>review soon</small>
          </button>
          <button className="good" onClick={() => rate("good")}>
            Good
            <small>a few days</small>
          </button>
          <button className="easy" onClick={() => rate("easy")}>
            Easy
            <small>longer gap</small>
          </button>
        </div>
      ) : (
        <div className="review-actions">
          <button onClick={() => setFlipped(true)} style={{ gridColumn: "1 / -1" }}>
            Show answer
          </button>
        </div>
      )}
    </div>
  );
}

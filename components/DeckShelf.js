"use client";

import { dueCount, deckProgressPercent } from "../lib/spacedRepetition";

export default function DeckShelf({ decks, onStudy, onQuiz, onDelete }) {
  if (!decks.length) {
    return (
      <div className="card empty">
        <span className="punch" />
        No decks yet — upload a PDF above to make your first one.
      </div>
    );
  }

  return (
    <div className="shelf">
      <h3 className="label">Your decks</h3>
      {decks.map((deck) => {
        const due = dueCount(deck.cards);
        const progress = deckProgressPercent(deck.cards);
        return (
          <div className="card deck" key={deck.id}>
            <span className="punch" />
            <div className="info">
              <h4>{deck.title}</h4>
              <div className="meta">
                {deck.cards.length} cards · {progress}% mastered
              </div>
            </div>
            <div className="actions">
              {due > 0 && <span className="due-badge">{due} due</span>}
              {deck.quiz?.length > 0 && (
                <button className="btn btn-ghost" onClick={() => onQuiz(deck)}>
                  Quiz
                </button>
              )}
              <button className="btn btn-primary" onClick={() => onStudy(deck)}>
                Study
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (confirm(`Delete "${deck.title}"?`)) onDelete(deck.id);
                }}
                aria-label="Delete deck"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

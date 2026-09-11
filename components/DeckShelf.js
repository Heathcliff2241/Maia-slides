"use client";

import { dueCount, deckProgressPercent } from "../lib/spacedRepetition";

export default function DeckShelf({ decks, onStudy, onQuiz, onDelete, onScrollToUpload }) {
  if (!decks.length) {
    return (
      <div className="card empty-shelf" id="decks-shelf">
        <span className="punch" />
        <div className="empty-content">
          <div className="empty-emoji">📚</div>
          <h3>Your shelf is waiting for your first deck</h3>
          <p>
            Upload any lecture slide deck or PDF above, and Maia will organize
            your flashcards right here!
          </p>
          {onScrollToUpload && (
            <button
              onClick={onScrollToUpload}
              className="btn btn-ghost empty-cta"
              type="button"
            >
              Upload Slides Above ⬆
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalCards = decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);

  return (
    <div className="shelf" id="decks-shelf">
      <div className="shelf-head">
        <div>
          <h3 className="shelf-title">Your Study Decks</h3>
          <span className="shelf-subtitle">
            {decks.length} {decks.length === 1 ? "deck" : "decks"} · {totalCards} cards ready
          </span>
        </div>
      </div>

      <div className="decks-list">
        {decks.map((deck) => {
          const due = dueCount(deck.cards);
          const progress = deckProgressPercent(deck.cards);

          return (
            <div className="card deck-card" key={deck.id}>
              <span className="punch" />
              <div className="deck-main-info">
                <div className="deck-title-row">
                  <h4 className="deck-heading">{deck.title}</h4>
                  {due > 0 ? (
                    <span className="due-pill">{due} due today</span>
                  ) : (
                    <span className="all-reviewed-pill">✓ All caught up</span>
                  )}
                </div>

                <div className="deck-progress-bar-wrap">
                  <div
                    className="deck-progress-bar"
                    style={{ width: `${Math.max(5, progress)}%` }}
                  />
                </div>

                <div className="deck-meta">
                  <span>{deck.cards.length} flashcards</span>
                  <span className="meta-sep">·</span>
                  <span>{progress}% mastered (Box 4 & 5)</span>
                  {deck.quiz?.length > 0 && (
                    <>
                      <span className="meta-sep">·</span>
                      <span>{deck.quiz.length} quiz questions</span>
                    </>
                  )}
                </div>
              </div>

              <div className="deck-actions">
                {deck.quiz?.length > 0 && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => onQuiz(deck)}
                    title="Take multiple-choice practice quiz"
                  >
                    Quiz 📝
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => onStudy(deck)}
                  title="Practice active recall flashcards"
                >
                  Study Cards ➔
                </button>
                <button
                  className="btn btn-delete"
                  onClick={() => {
                    if (confirm(`Delete "${deck.title}"? This cannot be undone.`)) {
                      onDelete(deck.id);
                    }
                  }}
                  aria-label="Delete deck"
                  title="Delete deck"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { dueCount, deckProgressPercent } from "../lib/spacedRepetition";
import {
  Books,
  ArrowUp,
  CheckCircle,
  Exam,
  ArrowRight,
  Trash,
} from "@phosphor-icons/react";

export default function DeckShelf({ decks, onStudy, onQuiz, onDelete, onScrollToUpload }) {
  if (!decks.length) {
    return (
      <div className="card empty-shelf" id="decks-shelf">
        <span className="punch" />
        <div className="empty-content">
          <div className="empty-emoji">
            <Books size={38} weight="duotone" color="var(--rose)" />
          </div>
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
              Upload Slides Above <ArrowUp size={14} weight="bold" style={{ marginLeft: 4 }} />
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
                    <span className="all-reviewed-pill">
                      <CheckCircle size={13} weight="fill" style={{ marginRight: 4, verticalAlign: -1 }} />
                      All caught up
                    </span>
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
                    type="button"
                  >
                    <Exam size={15} weight="bold" style={{ marginRight: 5, verticalAlign: -2 }} />
                    Quiz
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => onStudy(deck)}
                  title="Practice active recall flashcards"
                  type="button"
                >
                  Study Cards
                  <ArrowRight size={14} weight="bold" style={{ marginLeft: 6, verticalAlign: -1 }} />
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
                  type="button"
                >
                  <Trash size={16} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

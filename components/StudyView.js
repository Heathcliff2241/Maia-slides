"use client";

import { useMemo, useState } from "react";
import { isDue, nextCardState } from "../lib/spacedRepetition";
import {
  CheckCircle,
  Trophy,
  ListChecks,
  Cards,
  ArrowLeft,
  ArrowRight,
  XCircle,
} from "@phosphor-icons/react";

export default function StudyView({ deck, onExit, onDeckUpdate }) {
  const initialQueue = useMemo(() => deck.cards.filter(isDue).map((c) => c.id), [deck.id]);
  const [queue, setQueue] = useState(initialQueue);
  const [studyMode, setStudyMode] = useState("choice"); // "choice" | "flip"
  const [flipped, setFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [reviewedCount, setReviewedCount] = useState(0);

  const totalToReview = initialQueue.length;
  const currentId = queue[0];
  const currentCard = deck.cards.find((c) => c.id === currentId);
  const done = totalToReview === 0 || queue.length === 0;

  // Derive multiple choice options for current card (fallback for older decks)
  const cardOptions = useMemo(() => {
    if (!currentCard) return [];
    if (Array.isArray(currentCard.options) && currentCard.options.length >= 2) {
      return currentCard.options;
    }
    // Dynamic fallback distractors from other cards
    const otherAnswers = deck.cards
      .filter((c) => c.id !== currentCard.id)
      .map((c) => c.back)
      .slice(0, 3);
    const combined = [currentCard.back, ...otherAnswers];
    return combined.sort(() => 0.5 - Math.random());
  }, [currentCard?.id]);

  const correctIndex = useMemo(() => {
    if (!currentCard) return 0;
    if (typeof currentCard.correctIndex === "number" && currentCard.options) {
      return currentCard.correctIndex;
    }
    return cardOptions.indexOf(currentCard.back);
  }, [currentCard?.id, cardOptions]);

  function advanceCard(rating) {
    if (!currentCard) return;

    const updatedCard = nextCardState(currentCard, rating);
    onDeckUpdate((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
    }));

    setReviewedCount((n) => n + 1);
    setFlipped(false);
    setSelectedChoice(null);

    setQueue((q) => {
      const rest = q.slice(1);
      // "again" cards return later in the same session for reinforcement
      if (rating === "again") return [...rest, currentId];
      return rest;
    });
  }

  function handleChoiceClick(index) {
    if (selectedChoice !== null) return;
    setSelectedChoice(index);
  }

  function handleChoiceNext() {
    if (selectedChoice === null) return;
    const isCorrect = selectedChoice === correctIndex;
    advanceCard(isCorrect ? "good" : "again");
  }

  if (totalToReview === 0) {
    return (
      <div className="card session-done">
        <span className="punch" />
        <div className="big">
          <CheckCircle size={32} weight="fill" color="var(--good)" style={{ verticalAlign: -4, marginRight: 8 }} />
          All caught up
        </div>
        <p className="sub">Nothing is due for review in "{deck.title}" right now. Great job!</p>
        <button className="btn btn-primary" onClick={onExit} type="button">
          Back to Decks
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card session-done">
        <span className="punch" />
        <div className="big">
          <Trophy size={32} weight="fill" color="var(--gold)" style={{ verticalAlign: -4, marginRight: 8 }} />
          Splendid study session, Maia!
        </div>
        <p className="sub">
          You mastered {reviewedCount} review{reviewedCount === 1 ? "" : "s"} in "{deck.title}".
        </p>
        <button className="btn btn-primary" onClick={onExit} type="button">
          Back to Decks
        </button>
      </div>
    );
  }

  return (
    <div className="study-container">
      {/* Top Header & Mode Toggle */}
      <div className="study-head">
        <button className="back" onClick={onExit} type="button">
          <ArrowLeft size={14} weight="bold" /> Back to Decks
        </button>

        <div className="mode-switcher-pills">
          <button
            type="button"
            className={`mode-pill ${studyMode === "choice" ? "active" : ""}`}
            onClick={() => {
              setStudyMode("choice");
              setFlipped(false);
              setSelectedChoice(null);
            }}
          >
            <ListChecks size={14} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
            Multiple Choice
          </button>
          <button
            type="button"
            className={`mode-pill ${studyMode === "flip" ? "active" : ""}`}
            onClick={() => {
              setStudyMode("flip");
              setSelectedChoice(null);
            }}
          >
            <Cards size={14} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
            Flip Card
          </button>
        </div>

        <span className="study-deck-title">{deck.title}</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(reviewedCount / totalToReview) * 100}%` }}
        />
      </div>

      <div className="study-status-row">
        <span className="study-status-pill">
          Card {reviewedCount + 1} of {totalToReview} · Box {currentCard.box || 1}
        </span>
        <span className="study-status-due">{queue.length} left in session</span>
      </div>

      {/* 1. MULTIPLE CHOICE STUDY MODE */}
      {studyMode === "choice" && (
        <div className="card choice-study-card">
          <span className="punch" />
          <div className="choice-prompt-badge">QUESTION</div>
          <h3 className="choice-card-question">{currentCard.front}</h3>

          <div className="choice-options-list">
            {cardOptions.map((opt, i) => {
              let btnClass = "choice-option-btn";
              if (selectedChoice !== null) {
                if (i === correctIndex) {
                  btnClass += " correct";
                } else if (i === selectedChoice) {
                  btnClass += " wrong";
                }
              }
              return (
                <button
                  key={i}
                  className={btnClass}
                  disabled={selectedChoice !== null}
                  onClick={() => handleChoiceClick(i)}
                  type="button"
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="option-text">{opt}</span>
                </button>
              );
            })}
          </div>

          {selectedChoice !== null && (
            <div className="choice-explanation-box">
              <div className="explanation-header">
                {selectedChoice === correctIndex ? (
                  <span className="result-tag result-correct">
                    <CheckCircle size={15} weight="fill" style={{ marginRight: 4, verticalAlign: -2 }} />
                    Correct! Nicely done!
                  </span>
                ) : (
                  <span className="result-tag result-wrong">
                    <XCircle size={15} weight="fill" style={{ marginRight: 4, verticalAlign: -2 }} />
                    Not quite — reviewing soon
                  </span>
                )}
              </div>
              <p className="explanation-text">{currentCard.back}</p>

              <div className="choice-next-row">
                <button
                  className="btn btn-primary btn-choice-next"
                  onClick={handleChoiceNext}
                  type="button"
                >
                  Continue to Next Card
                  <ArrowRight size={15} weight="bold" style={{ marginLeft: 6, verticalAlign: -2 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CLASSIC FLIP STUDY MODE */}
      {studyMode === "flip" && (
        <>
          <div className="flip-scene">
            <div
              className={`flip-card ${flipped ? "flipped" : ""}`}
              onClick={() => setFlipped((f) => !f)}
            >
              <div className="flip-inner">
                <div className="face front">
                  <p>{currentCard.front}</p>
                  <span className="tap-hint">Tap card to flip</span>
                </div>
                <div className="face back">
                  <p>{currentCard.back}</p>
                  <span className="tap-hint">Tap card to flip back</span>
                </div>
              </div>
            </div>
          </div>

          {flipped ? (
            <div className="review-actions">
              <button className="again" onClick={() => advanceCard("again")} type="button">
                Again
                <small>Review in this session</small>
              </button>
              <button className="good" onClick={() => advanceCard("good")} type="button">
                Good
                <small>Moves to next box</small>
              </button>
              <button className="easy" onClick={() => advanceCard("easy")} type="button">
                Easy
                <small>Mastered card</small>
              </button>
            </div>
          ) : (
            <div className="flip-prompt-hint">
              Tap the card above to reveal the answer and rate your memory.
            </div>
          )}
        </>
      )}
    </div>
  );
}

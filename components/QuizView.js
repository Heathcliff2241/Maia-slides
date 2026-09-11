"use client";

import { useState } from "react";

export default function QuizView({ deck, onExit }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = deck.quiz;
  const q = questions[index];

  function choose(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  if (finished) {
    return (
      <div className="card quiz-score">
        <span className="punch" />
        <div className="big serif" style={{ fontSize: 26, marginBottom: 8 }}>
          {score}/{questions.length}
        </div>
        <p className="sub" style={{ color: "var(--plum-soft)", marginBottom: 22 }}>
          on "{deck.title}"
        </p>
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
        <span style={{ fontSize: 12.5, color: "var(--plum-soft)" }}>{deck.title}</span>
      </div>

      <div className="card quiz-card">
        <span className="punch" />
        <div className="quiz-progress">
          Question {index + 1} of {questions.length}
        </div>
        <div className="quiz-q">{q.question}</div>
        <div className="quiz-opts">
          {q.options.map((opt, i) => {
            let cls = "quiz-opt";
            if (selected !== null) {
              if (i === q.correctIndex) cls += " correct";
              else if (i === selected) cls += " wrong";
            }
            return (
              <button key={i} className={cls} disabled={selected !== null} onClick={() => choose(i)}>
                {opt}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className="quiz-next">
            <button className="btn btn-primary" onClick={next}>
              {index + 1 >= questions.length ? "See score" : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

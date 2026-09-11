"use client";

import { useEffect, useState } from "react";
import UploadCard from "../components/UploadCard";
import DeckShelf from "../components/DeckShelf";
import StudyView from "../components/StudyView";
import QuizView from "../components/QuizView";
import { getDecks, addDeck, updateDeck, deleteDeck } from "../lib/storage";

const GREETING_NAME = "Maia bunny";

export default function Home() {
  const [decks, setDecks] = useState([]);
  const [view, setView] = useState("home"); // "home" | "study" | "quiz"
  const [activeDeckId, setActiveDeckId] = useState(null);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  const activeDeck = decks.find((d) => d.id === activeDeckId) || null;

  function handleDeckReady(deck) {
    const next = addDeck(deck);
    setDecks(next);
  }

  function handleDeckUpdate(updaterFn) {
    if (!activeDeckId) return;
    const next = updateDeck(activeDeckId, updaterFn);
    setDecks(next);
  }

  function handleDelete(id) {
    const next = deleteDeck(id);
    setDecks(next);
  }

  return (
    <main className="wrap">
      {view === "home" && (
        <>
          <div className="top">
            <div>
              <h1 className="greeting">
                Study time, <span className="name">{GREETING_NAME}</span> 🐰
              </h1>
              <div className="tagline">Turn any PDF into flashcards and a quiz.</div>
            </div>
          </div>

          <UploadCard onDeckReady={handleDeckReady} />

          <DeckShelf
            decks={decks}
            onStudy={(deck) => {
              setActiveDeckId(deck.id);
              setView("study");
            }}
            onQuiz={(deck) => {
              setActiveDeckId(deck.id);
              setView("quiz");
            }}
            onDelete={handleDelete}
          />
        </>
      )}

      {view === "study" && activeDeck && (
        <StudyView
          deck={activeDeck}
          onExit={() => {
            setView("home");
            setActiveDeckId(null);
          }}
          onDeckUpdate={handleDeckUpdate}
        />
      )}

      {view === "quiz" && activeDeck && (
        <QuizView
          deck={activeDeck}
          onExit={() => {
            setView("home");
            setActiveDeckId(null);
          }}
        />
      )}
    </main>
  );
}

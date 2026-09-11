"use client";

import { useEffect, useState } from "react";
import LandingHero from "../components/LandingHero";
import UploadCard from "../components/UploadCard";
import DeckShelf from "../components/DeckShelf";
import StudyView from "../components/StudyView";
import QuizView from "../components/QuizView";
import { getDecks, addDeck, updateDeck, deleteDeck } from "../lib/storage";
import { GraduationCap } from "@phosphor-icons/react";

const GREETING_NAME = "Maia";

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
    // Smooth scroll down to the newly added deck on shelf
    setTimeout(() => {
      document.getElementById("decks-shelf")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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

  function scrollToUpload() {
    document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToDecks() {
    document.getElementById("decks-shelf")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="page-container">
      {view === "home" && (
        <>
          <LandingHero
            deckCount={decks.length}
            onScrollToUpload={scrollToUpload}
            onScrollToDecks={scrollToDecks}
          />

          <main className="wrap study-studio" id="study-studio">
            <div className="studio-divider">
              <span className="divider-line"></span>
              <span className="divider-badge">
                <GraduationCap size={15} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
                STUDY STUDIO
              </span>
              <span className="divider-line"></span>
            </div>

            <div className="top">
              <div>
                <h2 className="greeting">
                  Ready to study, <span className="name">{GREETING_NAME}</span>?
                </h2>
                <div className="tagline">
                  Generate new cards from slides or jump right into an existing deck.
                </div>
              </div>
            </div>

            <UploadCard onDeckReady={handleDeckReady} />

            <DeckShelf
              decks={decks}
              onStudy={(deck) => {
                setActiveDeckId(deck.id);
                setView("study");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onQuiz={(deck) => {
                setActiveDeckId(deck.id);
                setView("quiz");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDelete={handleDelete}
              onScrollToUpload={scrollToUpload}
            />
          </main>

          <footer className="page-footer">
            <div className="footer-content">
              <div className="footer-brand">
                <img src="/bunny-study.png" alt="Maia" className="footer-avatar" />
                <span>Maia Flashcards</span>
              </div>
              <p className="footer-note">
                Made with love for Maia · Powered by Gemini AI & Leitner Spaced Repetition
              </p>
            </div>
          </footer>
        </>
      )}

      {view === "study" && activeDeck && (
        <main className="wrap">
          <StudyView
            deck={activeDeck}
            onExit={() => {
              setView("home");
              setActiveDeckId(null);
            }}
            onDeckUpdate={handleDeckUpdate}
          />
        </main>
      )}

      {view === "quiz" && activeDeck && (
        <main className="wrap">
          <QuizView
            deck={activeDeck}
            onExit={() => {
              setView("home");
              setActiveDeckId(null);
            }}
          />
        </main>
      )}
    </div>
  );
}

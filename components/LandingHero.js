"use client";

import Image from "next/image";

export default function LandingHero({ deckCount, onScrollToUpload, onScrollToDecks }) {
  return (
    <section className="landing-wrap">
      {/* Top Brand Navigation */}
      <header className="landing-nav">
        <div className="brand-group">
          <div className="avatar-ring">
            <img
              src="/bunny-study.png"
              alt="Maia study bunny"
              className="brand-avatar"
            />
          </div>
          <div className="brand-text">
            <span className="brand-title">Maia Flashcards</span>
            <span className="brand-badge">AI Study Buddy</span>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#how-it-works" className="nav-link">
            How It Works
          </a>
          <a href="#features" className="nav-link">
            Features
          </a>
          {deckCount > 0 && (
            <button
              onClick={onScrollToDecks}
              className="nav-link nav-btn-link"
              type="button"
            >
              My Decks <span className="nav-count">{deckCount}</span>
            </button>
          )}
          <button
            onClick={onScrollToUpload}
            className="btn btn-primary nav-cta"
            type="button"
          >
            Upload Slides 🐰
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="hero-grid">
        <div className="hero-content">
          <div className="hero-pill">
            <span className="pill-dot"></span>
            <span>Study Smarter · Stress Less</span>
          </div>

          <h1 className="hero-heading">
            Turn Heavy Slides into{" "}
            <span className="hero-accent">Bite-Sized Brilliance</span>.
          </h1>

          <p className="hero-subheading">
            Meet Maia — your personal AI study companion who transforms lecture
            slides, syllabi, and textbook PDFs into active-recall flashcards and
            interactive quizzes in seconds. Ace your exams without burning out.
          </p>

          <div className="hero-actions">
            <button
              onClick={onScrollToUpload}
              className="btn btn-hero-primary"
              type="button"
            >
              <span>Upload Your Slides</span>
              <span className="btn-arrow">➔</span>
            </button>
            <a href="#how-it-works" className="btn btn-hero-secondary">
              See How It Works
            </a>
          </div>

          <div className="hero-trust">
            <span className="trust-item">
              <span className="trust-icon">⚡</span> 10-Second Generation
            </span>
            <span className="trust-bullet">·</span>
            <span className="trust-item">
              <span className="trust-icon">🧠</span> Spaced Repetition
            </span>
            <span className="trust-bullet">·</span>
            <span className="trust-item">
              <span className="trust-icon">🔒</span> Private in Browser
            </span>
          </div>
        </div>

        {/* Hero Artwork with Floating Badges */}
        <div className="hero-visual">
          <div className="visual-card-wrap">
            <div className="visual-glow"></div>
            <div className="visual-frame card">
              <span className="punch" />
              <img
                src="/bunny-study.png"
                alt="Maia the bunny studying flashcards at her desk"
                className="bunny-hero-img"
              />
              <div className="visual-caption">
                <span className="caption-dot"></span>
                <span>Maia reviewing Biology & Organic Chemistry</span>
              </div>
            </div>

            {/* Floating Badges */}
            <div className="floating-badge badge-top-right">
              <span className="badge-emoji">✨</span>
              <div className="badge-text">
                <strong>Instant Cards</strong>
                <span>Extracted key formulas</span>
              </div>
            </div>

            <div className="floating-badge badge-bottom-left">
              <span className="badge-emoji">🎯</span>
              <div className="badge-text">
                <strong>Leitner Box System</strong>
                <span>Active recall retention</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Encouragement Banner */}
      <div className="quote-banner card">
        <span className="punch" />
        <div className="quote-body">
          <span className="quote-emoji">🌸</span>
          <p className="quote-text">
            “Take a deep breath. You don’t have to master every slide in one
            night — just one card at a time. I’m cheering for you!”
          </p>
          <span className="quote-author">— Maia Bunny</span>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="section-head">
        <span className="section-eyebrow">EFFORTLESS STUDYING</span>
        <h2 className="section-title">How Maia Powers Your Study Sessions</h2>
        <p className="section-desc">
          Upload any lecture deck or reading, and let Gemini AI curate your
          active study material.
        </p>
      </div>

      <div className="steps-grid" id="features">
        <div className="step-card card">
          <span className="punch" />
          <div className="step-number">01</div>
          <h3>Upload Lecture PDFs</h3>
          <p>
            Drop your slide presentations, lecture notes, or chapter handouts.
            Maia handles multi-page documents seamlessly.
          </p>
          <div className="step-tag">Fast & Simple</div>
        </div>

        <div className="step-card card">
          <span className="punch" />
          <div className="step-number">02</div>
          <h3>AI Flashcard Synthesis</h3>
          <p>
            Gemini AI pinpoints high-yield definitions, core mechanisms, and
            exam-tested concepts into crisp question-and-answer pairs.
          </p>
          <div className="step-tag">Active Recall</div>
        </div>

        <div className="step-card card">
          <span className="punch" />
          <div className="step-number">03</div>
          <h3>Interactive Quizzes</h3>
          <p>
            Test yourself with multiple-choice questions with instant scoring
            and deep explanations for both right and wrong answers.
          </p>
          <div className="step-tag">Exam Simulation</div>
        </div>

        <div className="step-card card">
          <span className="punch" />
          <div className="step-number">04</div>
          <h3>Spaced Repetition Mastery</h3>
          <p>
            Cards progress through Leitner boxes (1 to 5). Maia schedules
            reviews right as you're about to forget them.
          </p>
          <div className="step-tag">Long-Term Memory</div>
        </div>
      </div>
    </section>
  );
}

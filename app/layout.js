import "./globals.css";

export const metadata = {
  title: "Maia Flashcards — Turn Slides & PDFs into Smart Study Decks",
  description:
    "Transform lecture slides and textbook PDFs into active-recall flashcards and quizzes in seconds. Study with spaced repetition and cozy encouragement from Maia.",
  metadataBase: new URL("https://maia-slides.vercel.app"),
  openGraph: {
    title: "Maia Flashcards — Turn Slides & PDFs into Smart Study Decks",
    description:
      "Transform lecture slides and textbook PDFs into active-recall flashcards and quizzes in seconds. Study with spaced repetition and cozy encouragement from Maia.",
    url: "https://maia-slides.vercel.app",
    siteName: "Maia Flashcards",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Maia Flashcards - AI Study Companion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maia Flashcards — Turn Slides & PDFs into Smart Study Decks",
    description:
      "Transform lecture slides and textbook PDFs into active-recall flashcards and quizzes in seconds. Study with spaced repetition and cozy encouragement from Maia.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/bunny-study.png",
    apple: "/bunny-study.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

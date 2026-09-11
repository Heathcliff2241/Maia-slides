import "./globals.css";

export const metadata = {
  title: "Maia Bunny's Flashcards",
  description: "Turn any PDF into flashcards and quizzes for Maia to study with.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

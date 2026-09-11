const KEY = "maia-flashcards-decks";

// A deck looks like:
// {
//   id, title, createdAt,
//   cards: [{ id, front, back, box, nextReview }],
//   quiz: [{ id, question, options, correctIndex }]
// }

export function getDecks() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(decks));
}

export function addDeck(deck) {
  const decks = getDecks();
  decks.unshift(deck);
  saveDecks(decks);
  return decks;
}

export function updateDeck(deckId, updater) {
  const decks = getDecks();
  const next = decks.map((d) => (d.id === deckId ? updater(d) : d));
  saveDecks(next);
  return next;
}

export function deleteDeck(deckId) {
  const decks = getDecks().filter((d) => d.id !== deckId);
  saveDecks(decks);
  return decks;
}

// Simple 5-box Leitner system.
// Box 1 = just learned / missed, reviewed again almost immediately.
// Box 5 = well known, reviewed a month out.
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 30];

export function initCardProgress(card) {
  return {
    ...card,
    box: 1,
    nextReview: Date.now(),
  };
}

export function isDue(card) {
  return !card.nextReview || card.nextReview <= Date.now();
}

export function dueCount(cards) {
  return cards.filter(isDue).length;
}

// rating: "again" | "good" | "easy"
export function nextCardState(card, rating) {
  let box = card.box || 1;

  if (rating === "again") {
    box = 1;
  } else if (rating === "good") {
    box = Math.min(box + 1, 5);
  } else if (rating === "easy") {
    box = Math.min(box + 2, 5);
  }

  const days = BOX_INTERVAL_DAYS[box];
  const nextReview =
    days === 0
      ? Date.now() + 1000 * 60 * 10 // 10 min — come back to it same session
      : Date.now() + days * 24 * 60 * 60 * 1000;

  return { ...card, box, nextReview };
}

export function deckProgressPercent(cards) {
  if (!cards.length) return 0;
  const mastered = cards.filter((c) => (c.box || 1) >= 5).length;
  return Math.round((mastered / cards.length) * 100);
}

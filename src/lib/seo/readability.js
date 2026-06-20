// Readability scoring — pure, dependency-free.
//
// Flesch Reading Ease: 206.835 − 1.015·(words/sentences) − 84.6·(syllables/word).
// Higher = easier. We map the score to a human label (Very easy … Very difficult)
// for the SEO tab's "Readability" card.

// Count syllables in a word with a vowel-group heuristic (good enough for an
// aggregate score; not a dictionary lookup).
function syllablesIn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "") // drop common silent endings
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

// Bucket a Flesch Reading Ease score into a short label.
export function readingEaseLabel(ease) {
  if (ease >= 80) return "Very easy";
  if (ease >= 60) return "Easy";
  if (ease >= 50) return "Standard";
  if (ease >= 30) return "Difficult";
  return "Very difficult";
}

// Compute Flesch Reading Ease for a block of plain text.
// Returns { ease (0–100, clamped), grade (label), words, sentences } or null
// when there isn't enough text to score meaningfully.
export function fleschReadingEase(text) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return null;

  const words = clean.split(" ").filter(Boolean);
  if (words.length < 30) return null; // too little text for a stable score

  const sentences = Math.max(1, (clean.match(/[.!?]+(?:\s|$)/g) || []).length);

  // Guard against non-prose: nav/marketing fragments extracted from a page often
  // have very little sentence punctuation, which would yield an absurd
  // words/sentence ratio and a meaningless "Very difficult". Don't score those.
  if (words.length / sentences > 60) return null;

  const syllables = words.reduce((sum, w) => sum + syllablesIn(w), 0);

  const raw = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  const ease = Math.max(0, Math.min(100, Math.round(raw)));
  return { ease, grade: readingEaseLabel(ease), words: words.length, sentences };
}

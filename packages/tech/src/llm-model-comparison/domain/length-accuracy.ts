// Length-specification accuracy probe. Pure functions: a prompt builder, a word
// counter, and a 0..1 accuracy score for how closely the model hit a requested
// word count.

// Ask the model to write about `topic` in exactly `targetWords` words. The
// instruction is explicit so the response can be word-counted directly.
export const buildLengthPrompt = (targetWords: number, topic: string): string =>
  `Write a single paragraph about ${topic} that is exactly ${targetWords} words ` +
  `long. Respond with the paragraph only — no preamble, no word count, no markdown.`;

// Count words as runs of non-whitespace separated by whitespace. Empty or
// whitespace-only text is zero words.
export const wordCount = (text: string): number => {
  const trimmed = text.trim();
  if (trimmed === "") {
    return 0;
  }
  return trimmed.split(/\s+/).length;
};

// Score how close `actual` is to `target`, in [0, 1]. An exact match scores 1;
// the score falls linearly with the relative error and is clamped at 0. A target
// of zero or less is undefined input and scores 0.
export const lengthAccuracy = (target: number, actual: number): number => {
  if (target <= 0) {
    return 0;
  }
  return 1 - Math.min(1, Math.abs(actual - target) / target);
};

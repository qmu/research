import type { Stat } from "./types";

/**
 * Pure scoring for the speech benchmark. The single quality measure is
 * word-accuracy (1 − word error rate), computed mechanically from a reference
 * transcript and a hypothesis — used both for speech-to-text (subject
 * transcription vs reference) and for text-to-speech intelligibility (a fixed
 * STT judge's transcription vs the synthesized text). No subjective listening
 * judgement enters the score.
 */

/** Lowercase, drop punctuation, split on whitespace — case- and
 * punctuation-insensitive word tokens, matching the image topic's tokenizer. */
export const normalizeWords = (text: string): ReadonlyArray<string> =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token !== "");

/** Word-level Levenshtein distance (substitutions + insertions + deletions). */
const wordEditDistance = (
  reference: ReadonlyArray<string>,
  hypothesis: ReadonlyArray<string>,
): number => {
  const rows = reference.length;
  const cols = hypothesis.length;
  // distance[i][j] = edits to turn reference[0..i) into hypothesis[0..j).
  let previous = Array.from({ length: cols + 1 }, (_, j) => j);
  for (let i = 1; i <= rows; i += 1) {
    const current = [i, ...new Array<number>(cols).fill(0)];
    for (let j = 1; j <= cols; j += 1) {
      const substitutionCost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] ?? 0) + 1, // deletion
        (current[j - 1] ?? 0) + 1, // insertion
        (previous[j - 1] ?? 0) + substitutionCost, // substitution
      );
    }
    previous = current;
  }
  return previous[cols] ?? 0;
};

/**
 * Word error rate: edit distance over reference word count. An empty reference
 * scores 0 against an empty hypothesis and 1 otherwise (no division by zero).
 * WER can exceed 1 when the hypothesis inserts many extra words.
 */
export const wordErrorRate = (
  reference: string,
  hypothesis: string,
): number => {
  const referenceWords = normalizeWords(reference);
  const hypothesisWords = normalizeWords(hypothesis);
  if (referenceWords.length === 0) {
    return hypothesisWords.length === 0 ? 0 : 1;
  }
  return (
    wordEditDistance(referenceWords, hypothesisWords) / referenceWords.length
  );
};

/** Word-accuracy: 1 − WER, floored at 0 so a badly-off transcription reads as
 * 0% rather than negative. A perfect transcription scores 1. */
export const wordAccuracy = (reference: string, hypothesis: string): number =>
  Math.max(0, 1 - wordErrorRate(reference, hypothesis));

/** Mean, sample standard deviation, and count. n=0 yields all-zero; n=1 yields
 * stdDev 0 — the same aggregation convention as the other topics. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};

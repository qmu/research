import type { ImagePrompt, JudgeAnswer, Stat } from "./types";

/**
 * Pure scoring for the image-generation benchmark. Both scores are ratios in
 * [0, 1] computed mechanically from the judge's rubric answers / transcription;
 * no aesthetic judgement enters here.
 */

/** Satisfied constraints over total. Answers for unknown constraint ids are
 * ignored; a constraint the judge did not answer counts as unsatisfied, so a
 * partial judge response can only lower the score, never inflate it. */
export const scorePromptAdherence = (
  prompt: ImagePrompt,
  answers: ReadonlyArray<JudgeAnswer>,
): number => {
  if (prompt.constraints.length === 0) return 0;
  const satisfied = prompt.constraints.filter((constraint) =>
    answers.some(
      (answer) => answer.constraintId === constraint.id && answer.satisfied,
    ),
  ).length;
  return satisfied / prompt.constraints.length;
};

const normalizeTokens = (text: string): ReadonlyArray<string> =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token !== "");

/** Expected tokens found in the transcription, in order-insensitive multiset
 * overlap, over the expected token count. "hello benchmark" transcribed as
 * "HELLO, BENCHMARK!" scores 1; a missing or altered word lowers the ratio. */
export const scoreTextRenderAccuracy = (
  expectedText: string,
  transcription: string,
): number => {
  const expected = normalizeTokens(expectedText);
  if (expected.length === 0) return 0;
  const remaining = [...normalizeTokens(transcription)];
  let matched = 0;
  for (const token of expected) {
    const index = remaining.indexOf(token);
    if (index === -1) continue;
    remaining.splice(index, 1);
    matched += 1;
  }
  return matched / expected.length;
};

/** Mean, sample standard deviation, and count. n=0 yields all-zero; n=1 yields
 * stdDev 0 — mirroring the other topics' aggregation conventions. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};

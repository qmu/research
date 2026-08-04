// Throughput probe: end-to-end output tokens per second.
//
// HISTORY — this definition has been reversed once, deliberately, and the
// reasoning on both sides is kept because the trade-off is real (see
// docs/adr/0009-end-to-end-throughput.md).
//
// The metric was originally tokens / total-wall-clock. It was changed to
// SUSTAINED throughput — tokens / (total − time-to-first-token) — on the
// argument that the original was round-trip latency in disguise: a
// slow-to-first-token model with a tiny output read as low "tok/s" even when it
// emitted fast.
//
// That change introduced a worse failure. Dividing by the post-first-token
// window makes the denominator the time AFTER thinking, so a model that shifts
// work into pre-emission reasoning measures as faster the more it thinks. The
// 2026-08-04 Claude frame reported Opus 5 at +785% sustained throughput over
// Opus 4.8 at effort `low` while its total response time REGRESSED 127% — two
// contradicting directions from the same three trials. One trial divided 2048
// tokens by a 948 ms window and reported 2160 tok/s.
//
// So the window is the whole request again. This metric is comparable across
// models regardless of how they split their time between thinking and emitting,
// and it moves in the same direction as total response time, which is what a
// caller actually waits for. The known cost, accepted: a model that thinks long
// and then emits quickly reads as slow, and its emission speed is no longer
// visible in this number. Time to first token is reported separately (see
// `latency.ts`), so the split is still readable — it is just no longer divided
// out of the rate.

// Ask for a long, free-flowing output so the generation window is large enough
// for the throughput number to be meaningful. The exact length is orchestration
// policy passed in by the runner.
export const buildThroughputPrompt = (
  targetWords: number,
  topic: string,
): string =>
  `Write a detailed, flowing explanation of ${topic} of at least ${targetWords} ` +
  `words. Write continuous prose only — no lists, headings, or code. Do not stop ` +
  `early; keep going until you have written at least ${targetWords} words.`;

// End-to-end tokens/second: output tokens divided by the whole request time in
// seconds. A non-positive token count or total time returns 0 (the runner flags
// the row as not measured).
//
// There is deliberately no time-to-first-token parameter. It is not that the
// value is unused here — taking it at all is what allowed an uncaptured
// first-token event (recorded as `ttftMs: 0`) to silently change the
// denominator, so the SAME configuration measured ~90 tok/s on the trials where
// the event was missed and ~2160 tok/s on the trial where it was caught. A rate
// that depends on whether an unrelated measurement succeeded is not a rate.
// Removing the parameter makes that class of error unrepresentable rather than
// merely guarded against.
export const endToEndTokensPerSecond = (
  outputTokens: number,
  totalMs: number,
): number => {
  if (outputTokens <= 0 || totalMs <= 0) {
    return 0;
  }
  return (outputTokens * 1000) / totalMs;
};

// Throughput probe: sustained output tokens per second during generation.
//
// This replaces the old "speed = tokens / total-wall-clock" metric, which was
// round-trip latency in disguise: a slow-to-first-token model with a tiny output
// read as a low "tok/s" even when it generated fast. Sustained throughput
// divides the generated tokens by the GENERATION window — total time minus the
// time-to-first-token — so it measures how fast the model emits tokens once it
// has started, not how long the request took to come back. Latency is reported
// separately (see `latency.ts`).

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

// Sustained tokens/second: output tokens divided by the generation window
// (`totalMs - ttftMs`) in seconds. Guards keep a missing or degenerate
// measurement from producing a misleading rate:
//  - a non-positive token count or total time returns 0 (the runner flags the
//    row as not measured);
//  - when the first-token time is missing or not strictly less than the total
//    (a non-streamed or instantaneous response), the whole `totalMs` is used as
//    the window rather than dividing by zero or a negative interval.
export const sustainedTokensPerSecond = (
  outputTokens: number,
  totalMs: number,
  ttftMs: number,
): number => {
  if (outputTokens <= 0 || totalMs <= 0) {
    return 0;
  }
  const generationMs =
    ttftMs > 0 && ttftMs < totalMs ? totalMs - ttftMs : totalMs;
  return (outputTokens * 1000) / generationMs;
};

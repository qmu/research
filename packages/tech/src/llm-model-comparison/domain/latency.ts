// Latency probe: time-to-first-token (TTFT) and total response time, reported
// separately from throughput. A small, fixed prompt isolates responsiveness —
// how quickly the model starts answering and how long the whole exchange takes —
// from generation speed (which the throughput probe measures on a long output).

// A short, cheap prompt whose only job is to elicit a quick, bounded response so
// TTFT and total time are about responsiveness, not output length.
export const buildLatencyPrompt = (topic: string): string =>
  `In one short sentence, state a single interesting fact about ${topic}.`;

// A latency measurement: time to the first token and the total response time,
// both in milliseconds. Kept as its own shape so the report can present the two
// numbers side by side with units.
export type Latency = Readonly<{
  ttftMs: number;
  totalMs: number;
}>;

// Normalize a raw (ttft, total) pair into a well-formed `Latency`: negatives are
// clamped to 0, and TTFT can never exceed the total response time (a first token
// cannot arrive after the last). A non-streamed call with no first-token signal
// passes `ttftMs: 0`, which reads as "not separately measured".
export const normalizeLatency = (ttftMs: number, totalMs: number): Latency => {
  const total = Math.max(0, totalMs);
  const ttft = Math.min(Math.max(0, ttftMs), total);
  return { ttftMs: ttft, totalMs: total };
};

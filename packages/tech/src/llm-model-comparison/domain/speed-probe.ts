// Instrument-v2 unified speed probe: ONE streamed generation of an exact word
// count yields four metrics at once — time-to-first-token (first streamed
// token), total latency (the call's wall clock), sustained throughput (tokens
// over the generation window, via `sustainedTokensPerSecond`), and length
// accuracy (word count against the target, via `lengthAccuracy`). v1 measured
// these on three separate calls with different prompts; the v2 definitions are
// therefore not comparable with v1's, which `instrumentVersion` records.

// The exact-count instruction keeps the output word-countable; the fixed target
// keeps the generation window long enough for a meaningful throughput number.
export const buildSpeedPrompt = (targetWords: number, topic: string): string =>
  `Write a single flowing passage about ${topic} that is exactly ` +
  `${targetWords} words long. Write continuous prose only — no lists, ` +
  `headings, or code. Respond with the passage only — no preamble, no word ` +
  `count, no markdown.`;

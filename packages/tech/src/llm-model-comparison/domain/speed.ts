// Speed probe: output throughput in tokens per second. A one-liner with guards so
// a missing or zero measurement never produces a misleading rate.

// Tokens per second from an output-token count and an elapsed wall-clock time in
// milliseconds. Returns 0 when either input is non-positive — the runner treats a
// zero here as a signal to flag the row as not measured rather than reporting a
// corrupt rate.
export const tokensPerSecond = (
  outputTokens: number,
  elapsedMs: number,
): number => {
  if (outputTokens <= 0 || elapsedMs <= 0) {
    return 0;
  }
  return (outputTokens * 1000) / elapsedMs;
};

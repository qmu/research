import type { ComputerUseCallRecord, ComputerUseStats, Stat } from "./types";

/**
 * Pure scoring for the computer-use benchmark. Every figure is computed
 * mechanically from an attempt's trajectory and token usage; no aesthetic or
 * LLM judgement enters here. Kept free of vendor types so it stays unit-testable
 * and provider-agnostic — the run layer maps a vendor `TaskAttempt` into the
 * primitives these helpers consume.
 */

/** Token cost of one attempt in USD, at the card's catalog per-MTok prices. */
export const costFromTokens = (
  inputTokens: number,
  outputTokens: number,
  inputCostPerMTok: number,
  outputCostPerMTok: number,
): number =>
  (inputTokens * inputCostPerMTok + outputTokens * outputCostPerMTok) /
  1_000_000;

/** Mean per-action latency over an attempt's trajectory. An empty trajectory
 * (a task that produced no action) scores 0 rather than dividing by zero. */
export const meanActionLatencyMs = (
  latencies: ReadonlyArray<number>,
): number =>
  latencies.length === 0
    ? 0
    : latencies.reduce((sum, value) => sum + value, 0) / latencies.length;

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

/**
 * Aggregate a subject's per-attempt records into the six reported metrics.
 * `stepsToComplete` is measured over SUCCESSFUL attempts only (the step count of
 * a failed attempt is not a solve cost); the other metrics span every attempt.
 * Success rate and recovery rate are means of 1/0 indicators, so they read as
 * ratios in [0, 1].
 */
export const aggregateRunStats = (
  calls: ReadonlyArray<ComputerUseCallRecord>,
): ComputerUseStats => {
  const successful = calls.filter((call) => call.succeeded);
  return {
    taskSuccessRate: summarizeStat(
      calls.map((call) => (call.succeeded ? 1 : 0)),
    ),
    stepsToComplete: summarizeStat(successful.map((call) => call.steps)),
    latencyPerActionMs: summarizeStat(
      calls.map((call) => call.latencyPerActionMs),
    ),
    wallClockPerTaskMs: summarizeStat(calls.map((call) => call.wallClockMs)),
    costPerTaskUsd: summarizeStat(calls.map((call) => call.costUsd)),
    recoveryRate: summarizeStat(calls.map((call) => (call.recovered ? 1 : 0))),
  };
};

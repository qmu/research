import {
  average,
  percentile as calculatePercentile,
  stdDev,
} from "./aggregate";
import type { OperationalMetrics } from "./types";

export type OperationalTrial = Readonly<{
  ingestMs: number;
  queryLatencyMs: ReadonlyArray<number>;
  costUsd: number;
  maxScale: number;
}>;

export const summarizeOperationalTrials = (
  trials: ReadonlyArray<OperationalTrial>,
): OperationalMetrics => {
  const ingestValues = trials.map((trial) => trial.ingestMs);
  const p50Values = trials.map((trial) =>
    calculatePercentile(trial.queryLatencyMs, 50),
  );
  const p95Values = trials.map((trial) =>
    calculatePercentile(trial.queryLatencyMs, 95),
  );
  return {
    ingestMs: average(ingestValues),
    ingestMsStdDev: stdDev(ingestValues),
    queryLatencyMs: trials.flatMap((trial) => trial.queryLatencyMs),
    queryLatencyP50Ms: average(p50Values),
    queryLatencyP50MsStdDev: stdDev(p50Values),
    queryLatencyP95Ms: average(p95Values),
    queryLatencyP95MsStdDev: stdDev(p95Values),
    trialCount: trials.length,
    costUsd: trials.reduce((sum, trial) => sum + trial.costUsd, 0),
    maxScale: Math.max(0, ...trials.map((trial) => trial.maxScale)),
  };
};

export const percentile = calculatePercentile;

export const elapsedMs = (start: bigint, end: bigint): number =>
  Number(end - start) / 1_000_000;

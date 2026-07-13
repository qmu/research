import type { ConfidenceInterval } from "./types";

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

export const average = (values: ReadonlyArray<number>): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

export const stdDev = (values: ReadonlyArray<number>): number => {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

export const percentile = (
  values: ReadonlyArray<number>,
  percentileValue: number,
): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
};

export const wilsonInterval = (
  successes: number,
  total: number,
  z: number = 1.96,
): ConfidenceInterval => {
  if (total === 0) return { lower: 0, upper: 0 };
  const n = total;
  const p = successes / n;
  const z2 = z ** 2;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denominator;
  return {
    lower: clampUnit(center - margin),
    upper: clampUnit(center + margin),
  };
};

export const normalInterval = (
  values: ReadonlyArray<number>,
  z: number = 1.96,
): ConfidenceInterval => {
  if (values.length === 0) return { lower: 0, upper: 0 };
  const mean = average(values);
  const standardError = stdDev(values) / Math.sqrt(values.length);
  return {
    lower: clampUnit(mean - z * standardError),
    upper: clampUnit(mean + z * standardError),
  };
};

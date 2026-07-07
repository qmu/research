export const percentile = (
  values: ReadonlyArray<number>,
  percentileValue: number,
): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

export const elapsedMs = (start: bigint, end: bigint): number =>
  Number(end - start) / 1_000_000;

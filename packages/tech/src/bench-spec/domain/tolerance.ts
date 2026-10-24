// Pure tolerance check: does a measured value stay within the allowed
// deviation from its expected value, given how the metric is judged?

/** How a metric is judged against its expected value.
 * - `higher-is-better`: only a shortfall below `expected` can fail.
 * - `lower-is-better`: only an excess above `expected` can fail.
 * - `within-range`: a deviation in either direction can fail. */
export type ToleranceMode =
  | "higher-is-better"
  | "lower-is-better"
  | "within-range";

export type ToleranceCheck = Readonly<{
  mode: ToleranceMode;
  expected: number;
  /** Allowed deviation, in the metric's unit. Must be finite and >= 0. */
  tolerance: number;
  actual: number;
}>;

/** True when `actual` is acceptable. A deviation exactly equal to the
 * tolerance passes; anything beyond it fails. Non-finite input never passes. */
export const isWithinTolerance = (check: ToleranceCheck): boolean => {
  const { mode, expected, tolerance, actual } = check;
  if (![expected, tolerance, actual].every(Number.isFinite)) return false;
  if (tolerance < 0) return false;
  const shortfall = expected - actual;
  const excess = actual - expected;
  if (mode === "higher-is-better") return shortfall <= tolerance;
  if (mode === "lower-is-better") return excess <= tolerance;
  return Math.abs(excess) <= tolerance;
};

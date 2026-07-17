import type {
  ClassErrorStat,
  FamilyCalibration,
  SampleClass,
  SampleCountRow,
} from "./types";
import { SAMPLE_CLASSES } from "./types";

/**
 * Calibration and error accounting. One affine counting model covers both
 * counting methods:
 *
 *   predicted = contentTokens + overheadTokens
 *
 * where `overheadTokens` is the provider's message-framing cost (chat
 * template, role headers) fitted from the calibration rows, and
 * `contentTokens` is either the exact self-BPE count (exact families) or
 * `round(rate_class × chars)` with per-class tokens-per-character rates
 * (estimator families). Medians are used throughout: the calibration sets are
 * small (5 rows per class) and a single outlier must not drag the fit.
 */

export const median = (values: ReadonlyArray<number>): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted[middle - 1] ?? 0;
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 === 0 ? (lower + upper) / 2 : upper;
};

type CalibrationRow = Readonly<{
  class: SampleClass;
  chars: number;
  apiTokens: number;
  selfContentTokens?: number;
}>;

const ratesAgainstOverhead = (
  rows: ReadonlyArray<CalibrationRow>,
  overheadTokens: number,
): Readonly<Record<SampleClass, number>> => {
  const rateOf = (sampleClass: SampleClass): number =>
    median(
      rows
        .filter((row) => row.class === sampleClass && row.chars > 0)
        .map((row) => Math.max(row.apiTokens - overheadTokens, 1) / row.chars),
    );
  return {
    english: rateOf("english"),
    japanese: rateOf("japanese"),
    code: rateOf("code"),
  };
};

/**
 * Fit the calibration from calibration-role rows that hold an API count.
 * Exact families solve the overhead directly (`api − selfContent`); estimator
 * families alternate rate/overhead twice, which converges on these sizes
 * because the overhead is a small constant next to the content counts.
 * The per-class rates are kept for BOTH methods — for estimator families they
 * are the predictor, for exact families the descriptive tokens-per-character
 * statistics the article reports.
 */
export const fitCalibration = (
  rows: ReadonlyArray<CalibrationRow>,
): FamilyCalibration => {
  const exactRows = rows.filter((row) => row.selfContentTokens !== undefined);
  if (exactRows.length === rows.length && rows.length > 0) {
    const overheadTokens = Math.max(
      Math.round(
        median(
          exactRows.map((row) => row.apiTokens - (row.selfContentTokens ?? 0)),
        ),
      ),
      0,
    );
    return {
      overheadTokens,
      tokensPerChar: ratesAgainstOverhead(rows, overheadTokens),
    };
  }
  // Estimator families: least squares with per-class slopes and one shared
  // intercept, solved by coordinate descent (the objective is a convex
  // quadratic, so alternating the closed-form slope and intercept updates
  // converges; 20 rounds is far past convergence at these sizes).
  let intercept = 0;
  let slopes: Record<SampleClass, number> = {
    english: 0,
    japanese: 0,
    code: 0,
  };
  for (let pass = 0; pass < 20; pass += 1) {
    const nextSlopes = { ...slopes };
    for (const sampleClass of SAMPLE_CLASSES) {
      const ofClass = rows.filter((row) => row.class === sampleClass);
      const numerator = ofClass.reduce(
        (sum, row) => sum + row.chars * (row.apiTokens - intercept),
        0,
      );
      const denominator = ofClass.reduce(
        (sum, row) => sum + row.chars * row.chars,
        0,
      );
      nextSlopes[sampleClass] = denominator === 0 ? 0 : numerator / denominator;
    }
    slopes = nextSlopes;
    intercept =
      rows.length === 0
        ? 0
        : rows.reduce(
            (sum, row) => sum + row.apiTokens - slopes[row.class] * row.chars,
            0,
          ) / rows.length;
  }
  const overheadTokens = Math.max(Math.round(intercept), 0);
  return {
    overheadTokens,
    tokensPerChar: {
      english: Math.max(slopes.english, 0),
      japanese: Math.max(slopes.japanese, 0),
      code: Math.max(slopes.code, 0),
    },
  };
};

/** Predict the API-reported total for one sample under a fitted calibration. */
export const predictTokens = (
  calibration: FamilyCalibration,
  row: Readonly<{
    class: SampleClass;
    chars: number;
    selfContentTokens?: number;
  }>,
): number =>
  row.selfContentTokens !== undefined
    ? row.selfContentTokens + calibration.overheadTokens
    : Math.round(calibration.tokensPerChar[row.class] * row.chars) +
      calibration.overheadTokens;

export const errorPct = (predicted: number, apiTokens: number): number =>
  apiTokens === 0 ? 0 : (100 * (predicted - apiTokens)) / apiTokens;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Per-class error statistics over the holdout rows that carry an error. */
export const classErrorStats = (
  rows: ReadonlyArray<SampleCountRow>,
  targetPct: number,
): ReadonlyArray<ClassErrorStat> =>
  SAMPLE_CLASSES.map((sampleClass) => {
    const errors = rows
      .filter(
        (row) =>
          row.class === sampleClass &&
          row.role === "holdout" &&
          row.errorPct !== undefined,
      )
      .map((row) => row.errorPct ?? 0);
    const absolute = errors.map((value) => Math.abs(value));
    const maxAbs = absolute.length === 0 ? 0 : Math.max(...absolute);
    return {
      class: sampleClass,
      holdoutCount: errors.length,
      meanAbsErrorPct: round2(
        absolute.length === 0
          ? 0
          : absolute.reduce((sum, value) => sum + value, 0) / absolute.length,
      ),
      maxAbsErrorPct: round2(maxAbs),
      errorBandPct: [
        round2(errors.length === 0 ? 0 : Math.min(...errors)),
        round2(errors.length === 0 ? 0 : Math.max(...errors)),
      ],
      withinTarget: errors.length > 0 && maxAbs <= targetPct,
    };
  });

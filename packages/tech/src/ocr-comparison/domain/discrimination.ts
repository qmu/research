/**
 * Whether a hard class actually separates the models, and which model wins.
 *
 * This is the point of the whole hard corpus. The v1 comparison's defect was not
 * that its numbers were wrong but that they were all the same: a page of ~100%
 * scores tells a reader nothing about which OCR model to use. So the corpus is
 * only half the fix — the other half is refusing to publish a class that failed
 * to separate anything, rather than dressing its noise up as a ranking.
 *
 * Two rules, both deliberately conservative:
 *
 * 1. **A class discriminates when the best and worst measured models differ by
 *    more than `MIN_DISCRIMINATING_SPREAD` on the class's primary metric.** The
 *    spread is between measured runs only; a `fixtured` or `error` row is not a
 *    measurement and can neither create nor destroy separation.
 * 2. **A class with fewer than two measured models cannot discriminate at all**,
 *    and says so with its own reason rather than reporting a spread of zero — a
 *    zero spread and an unanswerable question must not render alike.
 */

export type DiscriminationMetric =
  "characterErrorRate" | "wordErrorRate" | "fieldAccuracy";

/** Lower is better for the error rates; higher is better for field accuracy. */
export const METRIC_DIRECTION: Readonly<
  Record<DiscriminationMetric, "lower-is-better" | "higher-is-better">
> = {
  characterErrorRate: "lower-is-better",
  wordErrorRate: "lower-is-better",
  fieldAccuracy: "higher-is-better",
};

/**
 * Five percentage points.
 *
 * Chosen as the smallest gap this instrument can defend rather than as a
 * statistical threshold: the v1 corpus produced gaps well under one point, and
 * anything below a few points on a nine-document corpus is within the range a
 * different seed could produce. It is a stated, adjustable bar — not a
 * significance test, and the report must not describe it as one.
 */
export const MIN_DISCRIMINATING_SPREAD = 0.05;

export type ClassModelScore = Readonly<{
  modelId: string;
  modelName: string;
  /** Only `"measured"` rows count toward separation. */
  provenance: "measured" | "fixtured" | "error" | "out-of-scope";
  value: number;
}>;

export type DiscriminationVerdict =
  "discriminating" | "not-discriminating" | "insufficient-measurements";

export type ClassDiscrimination = Readonly<{
  classId: string;
  metric: DiscriminationMetric;
  verdict: DiscriminationVerdict;
  /** Absolute best-to-worst gap across measured models; 0 when undecidable. */
  spread: number;
  measuredCount: number;
  bestModelId: string | undefined;
  bestValue: number | undefined;
  worstModelId: string | undefined;
  worstValue: number | undefined;
  /** Why the verdict reads as it does, in one publishable sentence. */
  reason: string;
}>;

const better = (metric: DiscriminationMetric, a: number, b: number): boolean =>
  METRIC_DIRECTION[metric] === "lower-is-better" ? a < b : a > b;

export const discriminationFor = (
  classId: string,
  metric: DiscriminationMetric,
  scores: ReadonlyArray<ClassModelScore>,
): ClassDiscrimination => {
  const measured = scores.filter((score) => score.provenance === "measured");
  if (measured.length < 2) {
    return {
      classId,
      metric,
      verdict: "insufficient-measurements",
      spread: 0,
      measuredCount: measured.length,
      bestModelId: undefined,
      bestValue: undefined,
      worstModelId: undefined,
      worstValue: undefined,
      reason: `Only ${measured.length} model row is measured for this class, so separation is not established either way.`,
    };
  }
  const sorted = [...measured].sort((a, b) =>
    better(metric, a.value, b.value)
      ? -1
      : better(metric, b.value, a.value)
        ? 1
        : 0,
  );
  const best = sorted[0] as ClassModelScore;
  const worst = sorted[sorted.length - 1] as ClassModelScore;
  const spread = Math.abs(best.value - worst.value);
  const discriminating = spread > MIN_DISCRIMINATING_SPREAD;
  return {
    classId,
    metric,
    verdict: discriminating ? "discriminating" : "not-discriminating",
    spread,
    measuredCount: measured.length,
    bestModelId: best.modelId,
    bestValue: best.value,
    worstModelId: worst.modelId,
    worstValue: worst.value,
    reason: discriminating
      ? `Best and worst measured models differ by ${(spread * 100).toFixed(1)}pp on ${metric}, above the stated ${(MIN_DISCRIMINATING_SPREAD * 100).toFixed(0)}pp bar.`
      : `Best and worst measured models differ by only ${(spread * 100).toFixed(1)}pp on ${metric}, at or below the stated ${(MIN_DISCRIMINATING_SPREAD * 100).toFixed(0)}pp bar, so this class is reported as non-discriminating rather than as a ranking.`,
  };
};

export type BestOcrModel = Readonly<{
  modelId: string | undefined;
  modelName: string | undefined;
  /** Classes that discriminated and therefore contributed a vote. */
  decidedByClasses: ReadonlyArray<string>;
  /** Classes that were measured but did not separate the models. */
  ignoredClasses: ReadonlyArray<string>;
  reason: string;
}>;

/**
 * The machine-readable winner the image-generation readability metric consumes
 * (ticket step 5) — a defined output of the frame, never a hardcoded name.
 *
 * The rule: only discriminating classes vote, one vote each for their best
 * model, ties broken by the summed spread the model won by. **With no
 * discriminating class there is no winner**, and the result says so with
 * `modelId: undefined` rather than falling back to the best of a set of
 * indistinguishable scores — a downstream judge chosen by a coin flip is worse
 * than a downstream metric that reports it has no judge.
 */
export const bestOcrModel = (
  discriminations: ReadonlyArray<ClassDiscrimination>,
  scores: ReadonlyArray<ClassModelScore>,
): BestOcrModel => {
  const deciding = discriminations.filter(
    (entry) => entry.verdict === "discriminating",
  );
  const ignored = discriminations
    .filter((entry) => entry.verdict !== "discriminating")
    .map((entry) => entry.classId);
  if (deciding.length === 0) {
    return {
      modelId: undefined,
      modelName: undefined,
      decidedByClasses: [],
      ignoredClasses: ignored,
      reason:
        "No hard class separated the models by more than the stated bar, so this frame names no best OCR model.",
    };
  }
  const tally = new Map<string, { wins: number; margin: number }>();
  for (const entry of deciding) {
    if (entry.bestModelId === undefined) continue;
    const current = tally.get(entry.bestModelId) ?? { wins: 0, margin: 0 };
    tally.set(entry.bestModelId, {
      wins: current.wins + 1,
      margin: current.margin + entry.spread,
    });
  }
  const ranked = [...tally.entries()].sort((a, b) =>
    b[1].wins !== a[1].wins ? b[1].wins - a[1].wins : b[1].margin - a[1].margin,
  );
  const winner = ranked[0];
  if (winner === undefined) {
    return {
      modelId: undefined,
      modelName: undefined,
      decidedByClasses: [],
      ignoredClasses: ignored,
      reason:
        "Classes discriminated but named no best model, which should not happen; treat this frame as having no winner.",
    };
  }
  const [modelId, record] = winner;
  const name = scores.find((score) => score.modelId === modelId)?.modelName;
  return {
    modelId,
    modelName: name,
    decidedByClasses: deciding
      .filter((entry) => entry.bestModelId === modelId)
      .map((entry) => entry.classId),
    ignoredClasses: ignored,
    reason: `Won ${record.wins} of ${deciding.length} discriminating hard classes, by a summed margin of ${(record.margin * 100).toFixed(1)}pp.`,
  };
};

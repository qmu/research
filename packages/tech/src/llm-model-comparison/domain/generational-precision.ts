/**
 * The standard error of the difference of two means — the statistic that
 * matches the claim the generational section actually makes.
 *
 * The existing gate in `generational-delta.ts` admits a direction only when
 *
 *     |mean_new − mean_former|  >  sd_former + sd_new
 *
 * and that gate is correct at what it does: it stops run-to-run scatter being
 * published as a generational finding. But `sd` estimates how far *individual
 * trials* scatter, and that does not shrink as trials are added — only the
 * estimate of it stabilises. So the threshold stands still however much is
 * spent, and **no trial count can convert an `indistinguishable` result into a
 * supported direction.** The project has no lever.
 *
 * The section's claim is about the two *means* ("this generation is faster"),
 * and the matching statistic is the standard error of their difference:
 *
 *     se_diff = sqrt( sd_former² / n_former  +  sd_new² / n_new )
 *
 * which does shrink with n — at rate 1/√n. Under it, 3 trials is still weak and
 * 10 or 20 becomes genuinely discriminating, so buying trials buys something.
 *
 * **Nothing here is wired into the published gate.** This module computes the
 * alternative and nothing more; `outcomeOf` in `generational-delta.ts` is
 * untouched, so no published label moves. Which statistic gates the
 * `indistinguishable` label, and at what band, changes which findings the
 * article asserts — a research-reporting decision with an owner (ticket
 * `20260801124500`, step 2; ADR 0008 records the current position as
 * deliberate). What this module and `comparePrecisionRules` provide is the
 * evidence that decision needs: the measured list of which directions would
 * change, from the committed frames rather than from intuition.
 */

export type PrecisionInput = Readonly<{
  previousMean: number;
  currentMean: number;
  previousStdDev: number;
  currentStdDev: number;
  previousTrials: number;
  currentTrials: number;
}>;

/**
 * Multiples of `se_diff` that form the band a difference must clear.
 *
 * 2.0 is the conventional ~95% two-sided band for a difference of means and is
 * offered as the default *candidate*, not as a chosen threshold — the choice is
 * the owner's. `comparePrecisionRules` takes the multiplier explicitly so the
 * decision can be made against measured consequences at more than one value.
 */
export const DEFAULT_BAND_MULTIPLIER = 2;

/**
 * `sqrt(sd_former²/n_former + sd_new²/n_new)`.
 *
 * Returns `null` when either side has no usable sample: `n < 1` is not a
 * measurement, and a mean with `n = 1` has no estimable standard error at all
 * (its `stdDev` is 0 by construction, which would make the band 0 and admit
 * every difference). A `null` band means "this statistic cannot judge this
 * pair", and callers must carry that through rather than defaulting it to a
 * pass — the whole defect this ticket names is a threshold that answers a
 * question it cannot actually answer.
 */
export const standardErrorOfDifference = (
  input: PrecisionInput,
): number | null => {
  const { previousStdDev, currentStdDev, previousTrials, currentTrials } =
    input;
  if (!Number.isFinite(previousTrials) || !Number.isFinite(currentTrials)) {
    return null;
  }
  if (previousTrials < 2 || currentTrials < 2) return null;
  if (previousStdDev < 0 || currentStdDev < 0) return null;
  return Math.sqrt(
    (previousStdDev * previousStdDev) / previousTrials +
      (currentStdDev * currentStdDev) / currentTrials,
  );
};

/** `multiplier × se_diff`, or `null` when the standard error is unavailable. */
export const precisionBand = (
  input: PrecisionInput,
  multiplier: number = DEFAULT_BAND_MULTIPLIER,
): number | null => {
  const se = standardErrorOfDifference(input);
  return se === null ? null : se * multiplier;
};

/** The dispersion threshold the published gate uses today: `sd_a + sd_b`. */
export const dispersionBand = (input: PrecisionInput): number =>
  input.previousStdDev + input.currentStdDev;

export type BandVerdict = "clears" | "within" | "undecidable";

/**
 * Whether the observed difference clears a band.
 *
 * Kept deliberately separate from `DeltaOutcome`: this answers only "is the gap
 * bigger than the threshold", and says `undecidable` where the band could not be
 * computed. Turning that into `improved` / `regressed` / `indistinguishable` is
 * the published gate's job, and this module does not do it.
 */
export const bandVerdict = (
  difference: number,
  band: number | null,
): BandVerdict => {
  if (band === null) return "undecidable";
  return Math.abs(difference) > band ? "clears" : "within";
};

export type PrecisionComparison = Readonly<{
  difference: number;
  dispersionBand: number;
  dispersionVerdict: BandVerdict;
  standardError: number | null;
  precisionBand: number | null;
  precisionVerdict: BandVerdict;
  /** True when the two rules disagree about this metric. */
  differs: boolean;
}>;

/**
 * Both rules over one metric, side by side.
 *
 * This is the unit the label-diff report is built from: for every measured
 * generational metric in a committed frame, what today's gate says, what the
 * candidate statistic says, and whether they disagree.
 */
export const comparePrecisionRules = (
  input: PrecisionInput,
  multiplier: number = DEFAULT_BAND_MULTIPLIER,
): PrecisionComparison => {
  const difference = input.currentMean - input.previousMean;
  const dispersion = dispersionBand(input);
  const band = precisionBand(input, multiplier);
  const dispersionVerdict = bandVerdict(difference, dispersion);
  const precisionVerdict = bandVerdict(difference, band);
  return {
    difference,
    dispersionBand: dispersion,
    dispersionVerdict,
    standardError: standardErrorOfDifference(input),
    precisionBand: band,
    precisionVerdict,
    differs:
      precisionVerdict !== "undecidable" &&
      precisionVerdict !== dispersionVerdict,
  };
};

/**
 * The trial count at which a given observed difference would clear the band,
 * holding the measured standard deviations fixed and sampling both sides
 * equally.
 *
 * This is the lever the current gate does not have, made explicit: it answers
 * "how many trials would it take to resolve this direction?" — the question a
 * `--trials` decision needs an answer to. Returns `null` when the difference is
 * zero or the standard deviations are zero (nothing to resolve, or already
 * resolvable at any n), and caps its search so a hopeless pair terminates.
 *
 * Derivation: with n per side, `band = m × sqrt((sd_a² + sd_b²)/n)`, so the
 * difference clears when `n > m² × (sd_a² + sd_b²) / diff²`.
 */
export const trialsToResolve = (
  input: PrecisionInput,
  multiplier: number = DEFAULT_BAND_MULTIPLIER,
  maximum = 1000,
): number | null => {
  const difference = Math.abs(input.currentMean - input.previousMean);
  if (difference === 0) return null;
  const varianceSum =
    input.previousStdDev * input.previousStdDev +
    input.currentStdDev * input.currentStdDev;
  if (varianceSum === 0) return null;
  const needed =
    (multiplier * multiplier * varianceSum) / (difference * difference);
  const n = Math.floor(needed) + 1;
  return n > maximum ? null : Math.max(2, n);
};

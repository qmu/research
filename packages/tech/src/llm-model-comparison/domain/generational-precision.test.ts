import { describe, expect, it } from "vitest";
import {
  DEFAULT_BAND_MULTIPLIER,
  bandVerdict,
  comparePrecisionRules,
  dispersionBand,
  precisionBand,
  standardErrorOfDifference,
  trialsToResolve,
} from "./generational-precision";
import type { PrecisionInput } from "./generational-precision";

const at = (
  trials: number,
  overrides: Partial<PrecisionInput> = {},
): PrecisionInput => ({
  previousMean: 100,
  currentMean: 120,
  previousStdDev: 20,
  currentStdDev: 20,
  previousTrials: trials,
  currentTrials: trials,
  ...overrides,
});

describe("standard error of the difference", () => {
  it("computes sqrt(sd_a^2/n_a + sd_b^2/n_b)", () => {
    const se = standardErrorOfDifference({
      previousMean: 0,
      currentMean: 0,
      previousStdDev: 3,
      currentStdDev: 4,
      previousTrials: 9,
      currentTrials: 16,
    });
    // 9/9 + 16/16 = 2
    expect(se).toBeCloseTo(Math.SQRT2, 12);
  });

  /**
   * The load-bearing property the published gate lacks, and the whole reason
   * this module exists: the SAME measured spread at a larger n gives a NARROWER
   * band, so trials buy resolution.
   */
  it("narrows as the trial count grows, at the same measured spread", () => {
    const bands = [3, 10, 30, 100].map((n) => precisionBand(at(n)));
    for (const band of bands) expect(band).not.toBeNull();
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i] as number).toBeLessThan(bands[i - 1] as number);
    }
  });

  it("narrows at the 1/sqrt(n) rate", () => {
    const small = precisionBand(at(4)) as number;
    const large = precisionBand(at(16)) as number;
    expect(small / large).toBeCloseTo(2, 10);
  });

  /**
   * The contrast the ticket names: today's threshold does not move with n at
   * all, which is why no trial count can resolve a suppressed direction.
   */
  it("contrasts with the dispersion band, which does not move with n", () => {
    expect(dispersionBand(at(3))).toBe(dispersionBand(at(300)));
  });

  it("refuses to judge a sample it cannot estimate from", () => {
    expect(standardErrorOfDifference(at(1))).toBeNull();
    expect(standardErrorOfDifference(at(0))).toBeNull();
    expect(standardErrorOfDifference(at(3, { currentTrials: 1 }))).toBeNull();
    expect(
      standardErrorOfDifference(at(3, { previousTrials: Number.NaN })),
    ).toBeNull();
  });

  it("never reports an undecidable band as a pass", () => {
    expect(bandVerdict(999, null)).toBe("undecidable");
    expect(comparePrecisionRules(at(1)).precisionVerdict).toBe("undecidable");
    expect(comparePrecisionRules(at(1)).differs).toBe(false);
  });
});

describe("band verdicts", () => {
  it("treats the band as exclusive on both rules", () => {
    expect(bandVerdict(10, 10)).toBe("within");
    expect(bandVerdict(10.0001, 10)).toBe("clears");
  });

  /**
   * Regression coverage carried over from the gate the dispersion rule was
   * added for (32d5165): a wide-dispersion move must stay suppressed under the
   * published rule, and a tight-dispersion move must stay admitted.
   */
  it("keeps suppressing a move swamped by wide dispersion", () => {
    const wide = comparePrecisionRules({
      previousMean: 100,
      currentMean: 110,
      previousStdDev: 40,
      currentStdDev: 45,
      previousTrials: 3,
      currentTrials: 3,
    });
    expect(wide.dispersionVerdict).toBe("within");
  });

  it("keeps admitting a move that clears a tight dispersion", () => {
    const tight = comparePrecisionRules({
      previousMean: 100,
      currentMean: 160,
      previousStdDev: 2,
      currentStdDev: 3,
      previousTrials: 3,
      currentTrials: 3,
    });
    expect(tight.dispersionVerdict).toBe("clears");
    expect(tight.precisionVerdict).toBe("clears");
  });

  it("flags the disagreement the owner has to rule on", () => {
    // A 10-unit move with sd 12 on each side over 12 trials: inside the
    // dispersion band (24), outside the 2-se precision band (~9.8).
    const comparison = comparePrecisionRules({
      previousMean: 100,
      currentMean: 110,
      previousStdDev: 12,
      currentStdDev: 12,
      previousTrials: 12,
      currentTrials: 12,
    });
    expect(comparison.dispersionVerdict).toBe("within");
    expect(comparison.precisionVerdict).toBe("clears");
    expect(comparison.differs).toBe(true);
  });

  it("does not disagree when both rules suppress at a small sample", () => {
    const comparison = comparePrecisionRules({
      previousMean: 100,
      currentMean: 105,
      previousStdDev: 30,
      currentStdDev: 30,
      previousTrials: 3,
      currentTrials: 3,
    });
    expect(comparison.dispersionVerdict).toBe("within");
    expect(comparison.precisionVerdict).toBe("within");
    expect(comparison.differs).toBe(false);
  });

  it("uses the stated default multiplier", () => {
    expect(DEFAULT_BAND_MULTIPLIER).toBe(2);
    const input = at(9);
    expect(precisionBand(input)).toBeCloseTo(
      (standardErrorOfDifference(input) as number) * 2,
      12,
    );
  });
});

describe("trials to resolve", () => {
  it("answers the question the current gate cannot", () => {
    // diff 10, sd 12 each side, m=2 → n > 4*288/100 = 11.52 → 12
    expect(
      trialsToResolve({
        previousMean: 100,
        currentMean: 110,
        previousStdDev: 12,
        currentStdDev: 12,
        previousTrials: 3,
        currentTrials: 3,
      }),
    ).toBe(12);
  });

  it("is verified by the band it predicts", () => {
    const base = {
      previousMean: 100,
      currentMean: 110,
      previousStdDev: 12,
      currentStdDev: 12,
    };
    const n = trialsToResolve({
      ...base,
      previousTrials: 3,
      currentTrials: 3,
    }) as number;
    const atN = { ...base, previousTrials: n, currentTrials: n };
    const belowN = { ...base, previousTrials: n - 1, currentTrials: n - 1 };
    expect(bandVerdict(10, precisionBand(atN))).toBe("clears");
    expect(bandVerdict(10, precisionBand(belowN))).toBe("within");
  });

  it("reports no answer where there is nothing to resolve", () => {
    expect(trialsToResolve(at(3, { currentMean: 100 }))).toBeNull();
    expect(
      trialsToResolve(at(3, { previousStdDev: 0, currentStdDev: 0 })),
    ).toBeNull();
  });

  it("reports no answer rather than a hopeless number", () => {
    expect(
      trialsToResolve({
        previousMean: 100,
        currentMean: 100.01,
        previousStdDev: 50,
        currentStdDev: 50,
        previousTrials: 3,
        currentTrials: 3,
      }),
    ).toBeNull();
  });
});

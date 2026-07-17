import { describe, expect, it } from "vitest";
import {
  classErrorStats,
  errorPct,
  fitCalibration,
  median,
  predictTokens,
} from "./estimator";
import type { SampleCountRow } from "./types";

describe("median", () => {
  it("handles odd, even, and empty inputs", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("fitCalibration (exact families)", () => {
  it("solves the wrapper overhead from api − selfContent", () => {
    const calibration = fitCalibration([
      { class: "english", chars: 100, apiTokens: 32, selfContentTokens: 25 },
      { class: "japanese", chars: 50, apiTokens: 57, selfContentTokens: 50 },
      { class: "code", chars: 80, apiTokens: 31, selfContentTokens: 24 },
    ]);
    expect(calibration.overheadTokens).toBe(7);
  });

  it("never fits a negative overhead", () => {
    const calibration = fitCalibration([
      { class: "english", chars: 100, apiTokens: 20, selfContentTokens: 25 },
    ]);
    expect(calibration.overheadTokens).toBe(0);
  });
});

describe("fitCalibration (estimator families)", () => {
  it("recovers per-class rates and a shared overhead", () => {
    // Synthetic ground truth: rate en=0.25, ja=1.0, code=0.32, overhead 7.
    const row = (
      sampleClass: "english" | "japanese" | "code",
      chars: number,
      rate: number,
    ): {
      class: "english" | "japanese" | "code";
      chars: number;
      apiTokens: number;
    } => ({
      class: sampleClass,
      chars,
      apiTokens: Math.round(rate * chars) + 7,
    });
    const calibration = fitCalibration([
      row("english", 200, 0.25),
      row("english", 400, 0.25),
      row("japanese", 100, 1.0),
      row("japanese", 300, 1.0),
      row("code", 250, 0.32),
      row("code", 500, 0.32),
    ]);
    expect(calibration.overheadTokens).toBeGreaterThanOrEqual(5);
    expect(calibration.overheadTokens).toBeLessThanOrEqual(9);
    expect(calibration.tokensPerChar.japanese).toBeCloseTo(1.0, 1);
    expect(calibration.tokensPerChar.english).toBeCloseTo(0.25, 1);
    const predicted = predictTokens(calibration, {
      class: "japanese",
      chars: 200,
    });
    expect(Math.abs(errorPct(predicted, 207))).toBeLessThanOrEqual(5);
  });
});

describe("predictTokens", () => {
  it("prefers the exact self-count when present", () => {
    const calibration = {
      overheadTokens: 7,
      tokensPerChar: { english: 0.25, japanese: 1, code: 0.32 },
    };
    expect(
      predictTokens(calibration, {
        class: "english",
        chars: 100,
        selfContentTokens: 40,
      }),
    ).toBe(47);
    expect(predictTokens(calibration, { class: "english", chars: 100 })).toBe(
      32,
    );
  });
});

describe("classErrorStats", () => {
  const row = (
    sampleClass: "english" | "japanese" | "code",
    role: "calibration" | "holdout",
    error: number | undefined,
  ): SampleCountRow => ({
    sampleId: "x",
    class: sampleClass,
    role,
    chars: 10,
    utf8Bytes: 10,
    provenance: "measured",
    ...(error === undefined ? {} : { errorPct: error }),
  });

  it("judges the target on holdout rows only, per class", () => {
    const stats = classErrorStats(
      [
        row("english", "holdout", 2),
        row("english", "holdout", -4.5),
        row("english", "calibration", 90), // ignored: calibration role
        row("japanese", "holdout", 8),
        row("code", "holdout", undefined), // ignored: no error recorded
      ],
      5,
    );
    const english = stats.find((stat) => stat.class === "english");
    expect(english?.withinTarget).toBe(true);
    expect(english?.errorBandPct).toEqual([-4.5, 2]);
    expect(english?.maxAbsErrorPct).toBe(4.5);
    const japanese = stats.find((stat) => stat.class === "japanese");
    expect(japanese?.withinTarget).toBe(false);
    const code = stats.find((stat) => stat.class === "code");
    expect(code?.holdoutCount).toBe(0);
    expect(code?.withinTarget).toBe(false);
  });
});

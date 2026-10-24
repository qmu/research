import { describe, expect, it } from "vitest";
import { isWithinTolerance, type ToleranceMode } from "./tolerance";

const check = (mode: ToleranceMode, actual: number) =>
  isWithinTolerance({ mode, expected: 100, tolerance: 5, actual });

describe("isWithinTolerance: higher-is-better", () => {
  it("passes at or above expected, and at the tolerance edge", () => {
    expect(check("higher-is-better", 120)).toBe(true);
    expect(check("higher-is-better", 100)).toBe(true);
    expect(check("higher-is-better", 95)).toBe(true);
  });
  it("fails when the shortfall exceeds the tolerance", () => {
    expect(check("higher-is-better", 94.9)).toBe(false);
  });
});

describe("isWithinTolerance: lower-is-better", () => {
  it("passes at or below expected, and at the tolerance edge", () => {
    expect(check("lower-is-better", 80)).toBe(true);
    expect(check("lower-is-better", 100)).toBe(true);
    expect(check("lower-is-better", 105)).toBe(true);
  });
  it("fails when the excess exceeds the tolerance", () => {
    expect(check("lower-is-better", 105.1)).toBe(false);
  });
});

describe("isWithinTolerance: within-range", () => {
  it("passes inside the band, including both edges", () => {
    expect(check("within-range", 100)).toBe(true);
    expect(check("within-range", 95)).toBe(true);
    expect(check("within-range", 105)).toBe(true);
  });
  it("fails beyond the band on either side", () => {
    expect(check("within-range", 94.9)).toBe(false);
    expect(check("within-range", 105.1)).toBe(false);
  });
});

describe("isWithinTolerance: invalid input", () => {
  it("never passes non-finite values or a negative tolerance", () => {
    expect(check("within-range", Number.NaN)).toBe(false);
    expect(check("higher-is-better", Number.POSITIVE_INFINITY)).toBe(false);
    expect(
      isWithinTolerance({
        mode: "lower-is-better",
        expected: 100,
        tolerance: -1,
        actual: 100,
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { percentile } from "./operational";

describe("percentile", () => {
  it("returns nearest-rank percentiles", () => {
    expect(percentile([5, 1, 9, 3], 50)).toBe(3);
    expect(percentile([5, 1, 9, 3], 95)).toBe(9);
  });

  it("returns zero for an empty sample", () => {
    expect(percentile([], 95)).toBe(0);
  });
});

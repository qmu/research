import { describe, expect, it } from "vitest";
import {
  MIN_DISCRIMINATING_SPREAD,
  bestOcrModel,
  discriminationFor,
} from "./discrimination";
import type { ClassModelScore } from "./discrimination";

const measured = (
  modelId: string,
  value: number,
  modelName = modelId,
): ClassModelScore => ({
  modelId,
  modelName,
  provenance: "measured",
  value,
});

describe("class discrimination", () => {
  it("reports a wide spread as discriminating and names the best model", () => {
    const result = discriminationFor("low-quality-scan", "characterErrorRate", [
      measured("a", 0.08),
      measured("b", 0.41),
    ]);
    expect(result.verdict).toBe("discriminating");
    expect(result.bestModelId).toBe("a");
    expect(result.worstModelId).toBe("b");
    expect(result.spread).toBeCloseTo(0.33, 10);
  });

  it("respects the metric's direction", () => {
    const result = discriminationFor("nested-table", "fieldAccuracy", [
      measured("a", 0.4),
      measured("b", 0.92),
    ]);
    expect(result.bestModelId).toBe("b");
    expect(result.worstModelId).toBe("a");
  });

  it("refuses to call a near-identical class a ranking", () => {
    const result = discriminationFor("high-density", "characterErrorRate", [
      measured("a", 0.01),
      measured("b", 0.02),
      measured("c", 0.015),
    ]);
    expect(result.verdict).toBe("not-discriminating");
    expect(result.reason).toContain("non-discriminating");
  });

  it("treats the bar as exclusive, so an exactly-at-bar gap does not qualify", () => {
    const result = discriminationFor("high-density", "characterErrorRate", [
      measured("a", 0),
      measured("b", MIN_DISCRIMINATING_SPREAD),
    ]);
    expect(result.verdict).toBe("not-discriminating");
  });

  it("distinguishes 'no separation' from 'not enough measurements'", () => {
    const result = discriminationFor("nested-table", "fieldAccuracy", [
      measured("a", 0.9),
      { modelId: "b", modelName: "b", provenance: "fixtured", value: 0.1 },
      { modelId: "c", modelName: "c", provenance: "error", value: 0 },
    ]);
    expect(result.verdict).toBe("insufficient-measurements");
    expect(result.spread).toBe(0);
    expect(result.measuredCount).toBe(1);
  });

  it("ignores non-measured rows when computing the spread", () => {
    const result = discriminationFor("low-quality-scan", "characterErrorRate", [
      measured("a", 0.1),
      measured("b", 0.2),
      { modelId: "c", modelName: "c", provenance: "out-of-scope", value: 0.99 },
    ]);
    expect(result.spread).toBeCloseTo(0.1, 10);
    expect(result.measuredCount).toBe(2);
  });
});

describe("best OCR model", () => {
  const scores = [measured("a", 0), measured("b", 0)];

  it("names the model that wins the most discriminating classes", () => {
    const winner = bestOcrModel(
      [
        discriminationFor("low-quality-scan", "characterErrorRate", [
          measured("a", 0.05),
          measured("b", 0.4),
        ]),
        discriminationFor("nested-table", "fieldAccuracy", [
          measured("a", 0.95),
          measured("b", 0.5),
        ]),
        discriminationFor("high-density", "characterErrorRate", [
          measured("a", 0.3),
          measured("b", 0.05),
        ]),
      ],
      scores,
    );
    expect(winner.modelId).toBe("a");
    expect(winner.decidedByClasses).toEqual([
      "low-quality-scan",
      "nested-table",
    ]);
  });

  it("names no winner when nothing discriminated", () => {
    const winner = bestOcrModel(
      [
        discriminationFor("high-density", "characterErrorRate", [
          measured("a", 0.01),
          measured("b", 0.02),
        ]),
      ],
      scores,
    );
    expect(winner.modelId).toBeUndefined();
    expect(winner.reason).toContain("names no best OCR model");
    expect(winner.ignoredClasses).toEqual(["high-density"]);
  });

  it("breaks a tie on summed margin, not order", () => {
    const winner = bestOcrModel(
      [
        discriminationFor("low-quality-scan", "characterErrorRate", [
          measured("a", 0.1),
          measured("b", 0.2),
        ]),
        discriminationFor("nested-table", "fieldAccuracy", [
          measured("a", 0.1),
          measured("b", 0.9),
        ]),
      ],
      scores,
    );
    expect(winner.modelId).toBe("b");
  });

  it("carries the classes it ignored, so the report can say what was dropped", () => {
    const winner = bestOcrModel(
      [
        discriminationFor("low-quality-scan", "characterErrorRate", [
          measured("a", 0.05),
          measured("b", 0.4),
        ]),
        discriminationFor("high-density", "characterErrorRate", [
          measured("a", 0.01),
          measured("b", 0.02),
        ]),
      ],
      scores,
    );
    expect(winner.modelId).toBe("a");
    expect(winner.ignoredClasses).toEqual(["high-density"]);
  });
});

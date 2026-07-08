import { describe, expect, it } from "vitest";
import {
  NO_EFFORT_LEVEL,
  hasOnlyNoEffortLevel,
  isDeclaredEffortLevel,
  isEffortLevel,
  isNoEffortLevel,
} from "./effort";

describe("effort helpers", () => {
  it("recognizes the no-effort sentinel distinctly from metric n/a labels", () => {
    expect(isNoEffortLevel(NO_EFFORT_LEVEL)).toBe(true);
    expect(isNoEffortLevel("n/a (fixtured)")).toBe(false);
    expect(isNoEffortLevel("n/a (error)")).toBe(false);
  });

  it("recognizes only supported effort vocabulary", () => {
    expect(isEffortLevel("n/a")).toBe(true);
    expect(isEffortLevel("minimal")).toBe(false);
  });

  it("detects models whose entire effort axis is not applicable", () => {
    expect(hasOnlyNoEffortLevel(["n/a"])).toBe(true);
    expect(hasOnlyNoEffortLevel(["low", "high"])).toBe(false);
  });

  it("checks a requested effort against a model's declared levels", () => {
    expect(isDeclaredEffortLevel(["n/a"], "n/a")).toBe(true);
    expect(isDeclaredEffortLevel(["n/a"], "low")).toBe(false);
    expect(isDeclaredEffortLevel(["low", "high"], "minimal")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { summarize } from "./score";
import type { Grade } from "./types";

const grade = (id: string, correct: boolean): Grade => ({
  id,
  expected: "x",
  output: "x",
  correct,
});

describe("summarize", () => {
  it("returns zero accuracy for an empty grade set", () => {
    const result = summarize("m", []);
    expect(result.total).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  it("computes full accuracy when all grades are correct", () => {
    const result = summarize("m", [grade("a", true), grade("b", true)]);
    expect(result.correct).toBe(2);
    expect(result.accuracy).toBe(1);
  });

  it("computes a partial accuracy", () => {
    const result = summarize("m", [
      grade("a", true),
      grade("b", false),
      grade("c", true),
      grade("d", false),
    ]);
    expect(result.correct).toBe(2);
    expect(result.accuracy).toBe(0.5);
  });
});

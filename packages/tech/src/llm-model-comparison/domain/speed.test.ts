import { describe, it, expect } from "vitest";
import { tokensPerSecond } from "./speed";

describe("tokensPerSecond", () => {
  it("computes a normal rate", () => {
    expect(tokensPerSecond(2048, 4000)).toBe(512);
  });

  it("returns 0 when elapsed time is non-positive", () => {
    expect(tokensPerSecond(2048, 0)).toBe(0);
    expect(tokensPerSecond(2048, -10)).toBe(0);
  });

  it("returns 0 when there are no output tokens", () => {
    expect(tokensPerSecond(0, 4000)).toBe(0);
  });
});

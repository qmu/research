import { describe, it, expect } from "vitest";
import { buildThroughputPrompt, endToEndTokensPerSecond } from "./throughput";

describe("buildThroughputPrompt", () => {
  it("asks for a long generation on the topic", () => {
    const p = buildThroughputPrompt(400, "the water cycle");
    expect(p).toContain("400");
    expect(p).toContain("the water cycle");
  });
});

describe("endToEndTokensPerSecond", () => {
  it("divides tokens by the whole request time", () => {
    // 100 tokens over 1000 ms.
    expect(endToEndTokensPerSecond(100, 1000)).toBeCloseTo(100, 6);
    // 2048 tokens over 22699 ms — the Opus 5 `max` trial that the previous
    // definition reported as 2160 tok/s by dividing out a 21751 ms think.
    expect(endToEndTokensPerSecond(2048, 22699)).toBeCloseTo(90.22, 2);
  });

  it("returns 0 for a non-positive token count or elapsed time", () => {
    expect(endToEndTokensPerSecond(0, 1000)).toBe(0);
    expect(endToEndTokensPerSecond(100, 0)).toBe(0);
    expect(endToEndTokensPerSecond(-1, 1000)).toBe(0);
    expect(endToEndTokensPerSecond(100, -1)).toBe(0);
  });

  // THE PROPERTY THE PREVIOUS DEFINITION LACKED.
  //
  // Under `tokens / (total - ttft)` the rate rose without bound as a model
  // spent more of its wall clock thinking: the same 2048 tokens in the same
  // 22.7 s request measured 90 tok/s when the first-token event was missed and
  // 2160 tok/s when it was caught late. These two cases pin that the reported
  // rate now depends only on what was produced and how long the caller waited.
  it("does not reward spending more of the request on thinking", () => {
    const tokens = 2048;
    const totalMs = 22_699;
    const rate = endToEndTokensPerSecond(tokens, totalMs);

    // A long think followed by a fast burst, and a slow steady emission, are
    // the same request from the caller's side and must report the same rate.
    // (There is no ttft parameter to vary — that is the fix. This asserts the
    // consequence: the rate is a pure function of tokens and elapsed time.)
    expect(endToEndTokensPerSecond(tokens, totalMs)).toBe(rate);

    // And the rate can never exceed the whole-request rate, which is exactly
    // what the divided-out window allowed it to do.
    expect(rate).toBeLessThanOrEqual((tokens * 1000) / totalMs + 1e-9);
  });

  it("moves in the same direction as total response time", () => {
    // Same output, slower response -> strictly lower throughput. Under the
    // previous definition this could invert: a slower response that spent the
    // extra time thinking reported HIGHER throughput.
    const fast = endToEndTokensPerSecond(1000, 5_000);
    const slow = endToEndTokensPerSecond(1000, 10_000);
    expect(slow).toBeLessThan(fast);
  });

  it("scales linearly with output for a fixed elapsed time", () => {
    expect(endToEndTokensPerSecond(200, 1000)).toBeCloseTo(
      2 * endToEndTokensPerSecond(100, 1000),
      6,
    );
  });
});

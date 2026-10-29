import { describe, expect, it } from "vitest";
import measured from "./fixtures/strata-warmup.json";
import { normalizeStrataSpeed } from "./strata-speed";

const missing = { value: null, unit: "tokens/s", reason: "NO-FIELD" };
const failed = { value: null, unit: "tokens/s", reason: "MEASURE-FAILED" };

describe("normalizeStrataSpeed", () => {
  it("replays published warmup rates, with engine provenance and JSON roundtrip", () => {
    const result = normalizeStrataSpeed(measured);
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      prompt_tps: { value: 112, unit: "tokens/s", source: "engine" },
      generation_tps: { value: 50.3, unit: "tokens/s", source: "engine" },
    });
  });

  it("uses reported rates even when usage counts or durations disagree", () => {
    expect(
      normalizeStrataSpeed({
        ...measured,
        usage: { prompt_tokens: 99999, completion_tokens: 99999 },
        timings: { ...measured.timings, predicted_n: 999, predicted_ms: 1 },
      }),
    ).toEqual(normalizeStrataSpeed(measured));
  });

  it("preserves a measured zero and keeps missing phases separate", () => {
    expect(
      normalizeStrataSpeed({
        ...measured,
        timings: { prompt_per_second: 0 },
      }),
    ).toEqual({
      prompt_tps: { value: 0, unit: "tokens/s", source: "engine" },
      generation_tps: missing,
    });
  });

  it.each([undefined, null, [], "bad", {}])(
    "keeps absent or malformed timing containers as missing: %j",
    (timings) => {
      expect(normalizeStrataSpeed({ ...measured, timings })).toEqual({
        prompt_tps: missing,
        generation_tps: missing,
      });
    },
  );

  it.each([-1, NaN, Infinity, -Infinity, "50.3", true, {}, []])(
    "rejects invalid speed without losing the other phase: %j",
    (value) => {
      expect(
        normalizeStrataSpeed({
          ...measured,
          timings: { prompt_per_second: value, predicted_per_second: 50.3 },
        }),
      ).toEqual({
        prompt_tps: failed,
        generation_tps: { value: 50.3, unit: "tokens/s", source: "engine" },
      });
    },
  );

  it.each([
    null,
    [],
    {},
    { ...measured, error: { kind: "timeout" } },
    { ...measured, error: undefined },
    { ...measured, http_status: 500 },
    { ...measured, http_status: "200" },
    { ...measured, http_status: 200.5 },
    { ...measured, finish_reason: null },
    { ...measured, finish_reason: "error" },
  ])("marks unsuccessful or incomplete records as failed: %j", (row) => {
    expect(normalizeStrataSpeed(row)).toEqual({
      prompt_tps: failed,
      generation_tps: failed,
    });
  });

  it.each(["stop", "length", "tool_calls"])(
    "retains speed for %s without judging quality",
    (finish_reason) => {
      expect(normalizeStrataSpeed({ ...measured, finish_reason })).toEqual(
        normalizeStrataSpeed(measured),
      );
    },
  );
});

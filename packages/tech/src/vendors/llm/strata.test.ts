import { describe, expect, it } from "vitest";
import measured from "./fixtures/strata/measured.json";
import { normalizeStrataCompletion } from "./strata";

const model = "fixture-model-provenance";

describe("normalizeStrataCompletion", () => {
  it("imports a published measurement into the existing Completion JSON", () => {
    const before = JSON.stringify(measured);
    const result = normalizeStrataCompletion(measured, model);
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      text: measured.final_answer,
      outputTokens: 128,
      elapsedMs: 3400.295,
      model,
    });
    expect(JSON.stringify(measured)).toBe(before);
  });

  it("uses client time and usage, not engine timings or reasoning latency", () => {
    expect(
      normalizeStrataCompletion(
        {
          ...measured,
          dispatch_offset_s: 10,
          end_offset_s: 12.5,
          timings: { predicted_n: 999, predicted_ms: 1 },
        },
        model,
      ).elapsedMs,
    ).toBe(2500);
    expect(
      normalizeStrataCompletion({ ...measured, timings: null }, model)
        .outputTokens,
    ).toBe(128);
  });

  it("preserves measured zero and an empty answer", () => {
    expect(
      normalizeStrataCompletion(
        {
          ...measured,
          final_answer: "",
          finish_reason: "stop",
          usage: { completion_tokens: 0 },
          end_offset_s: 0,
        },
        model,
      ),
    ).toEqual({ text: "", outputTokens: 0, elapsedMs: 0, model });
  });

  it.each([
    null,
    [],
    "response",
    {},
    { ...measured, usage: null },
    { ...measured, final_answer: null },
    { ...measured, error: { message: "sensitive-upstream-text" } },
    { ...measured, error: undefined },
    { ...measured, http_status: 500 },
    { ...measured, finish_reason: null },
    { ...measured, finish_reason: "tool_calls" },
    { ...measured, finish_reason: "cancel" },
  ])(
    "rejects malformed, failed, incomplete or non-text records (%#)",
    (input) => {
      expect(() => normalizeStrataCompletion(input, model)).toThrow(
        "Invalid Strata result:",
      );
    },
  );

  it.each([
    undefined,
    null,
    "128",
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid or missing token counts (%#)", (completion_tokens) => {
    expect(() =>
      normalizeStrataCompletion(
        { ...measured, usage: { completion_tokens } },
        model,
      ),
    ).toThrow();
  });

  it.each([
    { dispatch_offset_s: null },
    { end_offset_s: undefined },
    { end_offset_s: "3.4" },
    { end_offset_s: -1 },
    { end_offset_s: NaN },
    { end_offset_s: Infinity },
    { dispatch_offset_s: 5, end_offset_s: 4 },
    { end_offset_s: Number.MAX_VALUE },
  ])("rejects unavailable or invalid client timing (%#)", (timing) => {
    expect(() =>
      normalizeStrataCompletion({ ...measured, ...timing }, model),
    ).toThrow();
  });

  it("requires explicit model provenance", () => {
    expect(() => normalizeStrataCompletion(measured, " ")).toThrow(
      "model provenance",
    );
  });

  it("does not expose upstream error details", () => {
    expect(() =>
      normalizeStrataCompletion(
        { ...measured, error: { message: "sensitive-upstream-text" } },
        model,
      ),
    ).toThrow(/^Invalid Strata result: failed or missing request status$/);
  });
});

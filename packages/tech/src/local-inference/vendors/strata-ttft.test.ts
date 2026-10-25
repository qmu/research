import { describe, expect, it } from "vitest";
import measured from "./fixtures/strata-ttft-warmup.json";
import { normalizeStrataTtft } from "./strata-ttft";

const missing = { value: null, unit: "s", reason: "NO-FIELD" };
const failed = { value: null, unit: "s", reason: "MEASURE-FAILED" };

describe("normalizeStrataTtft", () => {
  it("replays the published warmup offset, with client provenance", () => {
    const result = normalizeStrataTtft(measured);
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      value: 2.689731,
      unit: "s",
      source: "client",
    });
  });

  it("ignores first_delta, even disagreeing with the answer offset", () => {
    expect(
      normalizeStrataTtft({
        ...measured,
        first_delta: { offset_s: 999, kind: "reasoning" },
      }),
    ).toEqual(normalizeStrataTtft(measured));
  });

  it("preserves a measured zero offset", () => {
    expect(
      normalizeStrataTtft({
        ...measured,
        dispatch_offset_s: 0,
        first_answer_offset_s: 0,
      }),
    ).toEqual({ value: 0, unit: "s", source: "client" });
  });

  it.each(["dispatch_offset_s", "first_answer_offset_s"])(
    "marks a missing %s as NO-FIELD",
    (field) => {
      const rest: Record<string, unknown> = { ...measured };
      delete rest[field];
      expect(normalizeStrataTtft(rest)).toEqual(missing);
    },
  );

  it.each([-1, NaN, Infinity, -Infinity, "2.69", true, {}, []])(
    "rejects an invalid first_answer_offset_s as MEASURE-FAILED: %j",
    (value) => {
      expect(
        normalizeStrataTtft({ ...measured, first_answer_offset_s: value }),
      ).toEqual(failed);
    },
  );

  it("rejects an offset ordering that would make TTFT negative", () => {
    expect(
      normalizeStrataTtft({
        ...measured,
        dispatch_offset_s: 5,
        first_answer_offset_s: 1,
      }),
    ).toEqual(failed);
  });

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
    expect(normalizeStrataTtft(row)).toEqual(failed);
  });

  it("rejects a tool_calls finish, not a reliable answer offset", () => {
    expect(
      normalizeStrataTtft({ ...measured, finish_reason: "tool_calls" }),
    ).toEqual(failed);
  });

  it("retains TTFT for stop, same as the fixture's length finish", () => {
    expect(normalizeStrataTtft({ ...measured, finish_reason: "stop" })).toEqual(
      normalizeStrataTtft(measured),
    );
  });
});

it.each([-1, NaN, Infinity, -Infinity, null, "0", true, {}, []])(
  "rejects invalid dispatch offsets: %j",
  (dispatch_offset_s) => {
    expect(normalizeStrataTtft({ ...measured, dispatch_offset_s })).toEqual(
      failed,
    );
  },
);

it("subtracts a nonzero dispatch offset rather than returning the answer offset", () => {
  expect(
    normalizeStrataTtft({
      ...measured,
      dispatch_offset_s: 12.5,
      first_answer_offset_s: 14.75,
    }),
  ).toEqual({ value: 2.25, unit: "s", source: "client" });
});

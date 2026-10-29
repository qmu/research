import { describe, expect, it } from "vitest";
import { comparisonMissingReasons, type ComparisonEvidence } from "../index.js";

const measured = (): ComparisonEvidence => ({
  speed: { value: 12 },
  quality: { value: 0.8 },
  memory: { value: 1024 },
});
const readUnknown = (input: unknown) =>
  comparisonMissingReasons(input as ComparisonEvidence);

describe("comparisonMissingReasons public boundary", () => {
  it("returns speed, quality, memory order regardless of property order", () => {
    expect(
      comparisonMissingReasons({
        memory: { value: null, missingReason: "not-recorded" },
        quality: { value: null, missingReason: "failed" },
        speed: { value: null, missingReason: "unsupported" },
      }),
    ).toEqual([
      { metric: "speed", reason: "unsupported" },
      { metric: "quality", reason: "failed" },
      { metric: "memory", reason: "not-recorded" },
    ]);
  });

  it("omits measured metrics, including zero, without judging adoption", () => {
    expect(comparisonMissingReasons(measured())).toEqual([]);
    expect(
      comparisonMissingReasons({
        speed: { value: 0 },
        quality: { value: null, missingReason: "not-recorded" },
        memory: { value: 0 },
      }),
    ).toEqual([{ metric: "quality", reason: "not-recorded" }]);
  });

  it.each([null, undefined, [], {}, { speed: { value: 1 } }])(
    "rejects incomplete input %j instead of inventing missing causes",
    (input) => expect(() => readUnknown(input)).toThrow(TypeError),
  );

  it.each([NaN, Infinity, -Infinity, -1, "1", undefined])(
    "rejects invalid measured value %s",
    (value) =>
      expect(() => readUnknown({ ...measured(), speed: { value } })).toThrow(
        TypeError,
      ),
  );

  it.each([
    null,
    {},
    { value: null },
    { value: null, missingReason: "timeout: secret diagnostic" },
    { value: null, missingReason: undefined },
    { value: 1, missingReason: "failed" },
    { value: 1, missingReason: undefined },
  ])("rejects ambiguous evidence %j", (memory) => {
    expect(() => readUnknown({ ...measured(), memory })).toThrow(TypeError);
  });

  it("does not leak diagnostics, mutate inputs, or share returned objects", () => {
    const speed = Object.freeze({
      value: null,
      missingReason: "failed",
      error: "private",
    });
    const input = Object.freeze({ ...measured(), speed });
    const first = readUnknown(input);
    expect(first).toEqual([{ metric: "speed", reason: "failed" }]);
    const entry = first.at(0);
    if (!entry) throw new Error("Expected a missing speed reason");
    entry.reason = "unsupported";
    expect(readUnknown(input)).toEqual([{ metric: "speed", reason: "failed" }]);
  });

  it("rejects inherited metrics and inherited values", () => {
    expect(() => readUnknown(Object.create(measured()))).toThrow(TypeError);
    expect(() =>
      readUnknown({ ...measured(), speed: Object.create({ value: 1 }) }),
    ).toThrow(TypeError);
  });

  it("reports only fixed metric names in validation errors", () => {
    expect(() =>
      readUnknown({ ...measured(), memory: { value: "private" } }),
    ).toThrow("Invalid measured value: memory");
  });
});

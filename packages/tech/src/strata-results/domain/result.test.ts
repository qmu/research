import { describe, expect, it } from "vitest";
import { buildStrataResult } from "./result.js";

function execution() {
  return {
    model: "synthetic-model",
    fixedTier: { id: "fixture-16GiB", capacityMiB: 16384 },
    speed: { value: 20, unit: "tokens/s", tierId: "fixture-16GiB" },
    quality: { value: 0.8, unit: "fraction", tierId: "fixture-16GiB" },
    peakMemory: { value: 12288, unit: "MiB", tierId: "fixture-16GiB" },
    adoption: "adopt",
  };
}

describe("fixed-tier Strata result", () => {
  it("keeps speed, quality and computed headroom in one result without mutating input", () => {
    const input = execution();
    const before = structuredClone(input);
    expect(buildStrataResult(input)).toMatchObject({
      speed: input.speed,
      quality: input.quality,
      memoryHeadroom: { value: 4096, unit: "MiB", tierId: "fixture-16GiB" },
      adoption: "adopt",
    });
    expect(input).toEqual(before);
  });

  it.each(["speed", "quality", "peakMemory"] as const)(
    "excludes missing %s",
    (field) => {
      const input: Record<string, unknown> = execution();
      delete input[field];
      expect(buildStrataResult(input).adoption).toBe("undetermined");
    },
  );

  it.each(["NO-FIELD", "MEASURE-FAILED", "NOT-RUN"])(
    "preserves %s on missing memory",
    (reason) => {
      const input = {
        ...execution(),
        peakMemory: {
          value: null,
          unit: "MiB",
          tierId: "fixture-16GiB",
          reason,
        },
      };
      expect(buildStrataResult(input)).toMatchObject({
        memoryHeadroom: { value: null, reason },
        adoption: "undetermined",
      });
    },
  );

  it.each([NaN, Infinity, -1, "123", null])(
    "does not adopt invalid peak %s",
    (value) => {
      const input = execution();
      expect(
        buildStrataResult({
          ...input,
          peakMemory: { ...input.peakMemory, value },
        }).adoption,
      ).toBe("undetermined");
    },
  );

  it.each(["speed", "quality", "peakMemory"] as const)(
    "excludes %s from another tier",
    (field) => {
      const input = execution();
      input[field].tierId = "other-tier";
      expect(buildStrataResult(input).adoption).toBe("undetermined");
    },
  );

  it("retains negative headroom and rejects insufficient capacity; accepts exact capacity", () => {
    const input = execution();
    input.peakMemory.value = 16385;
    expect(buildStrataResult(input)).toMatchObject({
      memoryHeadroom: { value: -1 },
      adoption: "reject",
    });
    input.peakMemory.value = 16384;
    expect(buildStrataResult(input).adoption).toBe("adopt");
  });

  it("excludes unknown rejections, retains complete rejections and never infers adoption", () => {
    expect(
      buildStrataResult({ ...execution(), adoption: "reject" }).adoption,
    ).toBe("reject");
    expect(() =>
      buildStrataResult({ ...execution(), engine: "ollama" }),
    ).toThrow();
    expect(
      buildStrataResult({
        ...execution(),
        adoption: "reject",
        speed: undefined,
      }).adoption,
    ).toBe("undetermined");
    expect(
      buildStrataResult({ ...execution(), adoption: undefined }).adoption,
    ).toBe("undetermined");
  });

  it("rejects wrong units and out-of-range quality", () => {
    const input = execution();
    expect(
      buildStrataResult({
        ...input,
        peakMemory: { ...input.peakMemory, unit: "bytes" },
      }).adoption,
    ).toBe("undetermined");
    expect(
      buildStrataResult({ ...input, quality: { ...input.quality, value: 1.1 } })
        .adoption,
    ).toBe("undetermined");
  });

  it.each([0, -1, Infinity, NaN])(
    "requires explicit positive finite tier capacity %s",
    (capacityMiB) => {
      expect(() =>
        buildStrataResult({
          ...execution(),
          fixedTier: { id: "tier", capacityMiB },
        }),
      ).toThrow();
    },
  );
});

import { describe, expect, it } from "vitest";
import { reproductionId, type ReproductionConditions } from "./identity";

const conditions: ReproductionConditions = {
  engine: "vllm",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

describe("reproductionId", () => {
  it("pins the v1 identity format", () => {
    expect(reproductionId(conditions)).toBe(
      "lirid-v1-ea2a5a8f42cfde5f05cb49d0e0c3c272509cd3976d7025c140dfcc0cf9b6f0ac",
    );
  });

  it("matches the documented shape", () => {
    expect(reproductionId(conditions)).toMatch(/^lirid-v1-[a-f0-9]{64}$/);
  });

  it("is stable across property order and targetCommit letter case", () => {
    expect(
      reproductionId({
        targetCommit: conditions.targetCommit.toUpperCase(),
        runnerVersion: conditions.runnerVersion,
        fixture: conditions.fixture,
        model: conditions.model,
        engine: conditions.engine,
      }),
    ).toBe(reproductionId(conditions));
  });

  it("is deterministic across repeated calls", () => {
    expect(reproductionId(conditions)).toBe(reproductionId({ ...conditions }));
  });

  it.each(Object.keys(conditions) as (keyof ReproductionConditions)[])(
    "changes when %s changes",
    (key) => {
      const value =
        key === "targetCommit" ? "f".repeat(40) : `${conditions[key]}-2`;
      expect(reproductionId({ ...conditions, [key]: value })).not.toBe(
        reproductionId(conditions),
      );
    },
  );

  it("does not confuse delimiter-containing fields across adjacent conditions", () => {
    expect(
      reproductionId({ ...conditions, engine: "a|b", model: "c" }),
    ).not.toBe(reproductionId({ ...conditions, engine: "a", model: "b|c" }));
  });

  it.each(["", " ", "main", "abcdef0", "g".repeat(40)])(
    "rejects an invalid targetCommit: %s",
    (targetCommit) => {
      expect(() => reproductionId({ ...conditions, targetCommit })).toThrow();
    },
  );

  it.each(Object.keys(conditions) as (keyof ReproductionConditions)[])(
    "rejects missing or blank %s",
    (key) => {
      for (const value of [undefined, null, false, "", "  "]) {
        expect(() =>
          reproductionId({
            ...conditions,
            [key]: value,
          } as unknown as ReproductionConditions),
        ).toThrow();
      }
    },
  );
});

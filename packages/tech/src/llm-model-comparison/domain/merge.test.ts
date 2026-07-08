import { describe, it, expect } from "vitest";
import { configKey, mergeConfigs } from "./merge";
import type { Aggregate, ConfigRun, Provenance } from "./types";
import type { EffortLevel } from "./effort";

// A minimal ConfigRun factory — only the fields the merge policy keys on
// (id, effort, provenance) plus enough shape to be a valid ConfigRun. The `tag`
// rides in `apiModelId` so a test can prove WHICH run survived a merge.
const zero: Aggregate = { mean: 0, stdDev: 0, min: 0, max: 0, n: 0 };
const cfg = (
  id: string,
  effort: EffortLevel,
  provenance: Provenance,
  tag: string,
): ConfigRun => ({
  id,
  provider: "anthropic",
  tier: "flagship",
  modelName: id,
  apiModelId: tag,
  released: "2026",
  inputCostPerMTok: 5,
  outputCostPerMTok: 25,
  effortLevels: [effort],
  source: "https://example.com",
  effort,
  provenance,
  measuredAt: "2026-01-01T00:00:00.000Z",
  trialsRequested: 1,
  trials: [],
  stats: {
    throughputTokensPerSec: zero,
    ttftMs: zero,
    totalLatencyMs: zero,
    maxSchemaDepth: zero,
    maxSchemaBreadth: zero,
    lengthAccuracy: zero,
  },
  review: {
    provenance: "skipped",
    judgeModel: "judge",
    strengths: "",
    weaknesses: "",
    bestFor: "",
    raw: "",
  },
});

const tagAt = (runs: ConfigRun[], id: string, effort: EffortLevel): string =>
  runs.find((r) => r.id === id && r.effort === effort)?.apiModelId ?? "MISSING";

describe("configKey", () => {
  it("distinguishes (id, effort) even when a slug contains hyphens", () => {
    expect(configKey({ id: "a-b", effort: "low" })).not.toBe(
      configKey({ id: "a", effort: "high" }),
    );
  });
});

describe("mergeConfigs", () => {
  it("passes through a previous config not re-run this pass", () => {
    const prev = [cfg("m1", "low", "measured", "old")];
    const merged = mergeConfigs(prev, [cfg("m2", "low", "measured", "new")]);
    expect(tagAt(merged, "m1", "low")).toBe("old");
    expect(merged).toHaveLength(2);
  });

  it("a fresh measured cell replaces the previous measured cell (newer wins)", () => {
    const merged = mergeConfigs(
      [cfg("m1", "low", "measured", "old")],
      [cfg("m1", "low", "measured", "new")],
    );
    expect(merged).toHaveLength(1);
    expect(tagAt(merged, "m1", "low")).toBe("new");
  });

  it("a fresh measured cell replaces a previous error cell (the repair path)", () => {
    const merged = mergeConfigs(
      [cfg("m1", "low", "error", "old-error")],
      [cfg("m1", "low", "measured", "repaired")],
    );
    expect(tagAt(merged, "m1", "low")).toBe("repaired");
    expect(merged[0]?.provenance).toBe("measured");
  });

  it("downgrade guard: a fresh error never clobbers a previous measurement", () => {
    const merged = mergeConfigs(
      [cfg("m1", "low", "measured", "real")],
      [cfg("m1", "low", "error", "re-errored")],
    );
    expect(tagAt(merged, "m1", "low")).toBe("real");
    expect(merged[0]?.provenance).toBe("measured");
  });

  it("downgrade guard: a fresh fixtured cell never clobbers a measurement", () => {
    const merged = mergeConfigs(
      [cfg("m1", "low", "measured", "real")],
      [cfg("m1", "low", "fixtured", "keyless")],
    );
    expect(tagAt(merged, "m1", "low")).toBe("real");
  });

  it("appends a brand-new configuration after the previous ones", () => {
    const prev = [cfg("m1", "low", "measured", "a")];
    const merged = mergeConfigs(prev, [cfg("m9", "high", "measured", "b")]);
    expect(merged.map((r) => r.id)).toEqual(["m1", "m9"]);
  });

  it("merges only the selected cell, leaving same-model other-effort cells intact", () => {
    const prev = [
      cfg("m1", "low", "measured", "low-old"),
      cfg("m1", "high", "error", "high-error"),
    ];
    const merged = mergeConfigs(prev, [
      cfg("m1", "high", "measured", "high-fixed"),
    ]);
    expect(tagAt(merged, "m1", "low")).toBe("low-old");
    expect(tagAt(merged, "m1", "high")).toBe("high-fixed");
    expect(merged).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildGenerationDeltas,
  computeGenerationDelta,
  findGenerationPairs,
  renderGenerationDeltaSection,
} from "./generational-delta";
import type { Aggregate, ConfigRun, ProbeStats } from "./types";
import type { EffortLevel } from "./effort";

const agg = (mean: number, n = 3): Aggregate => ({
  mean,
  stdDev: 0.5,
  min: mean - 1,
  max: mean + 1,
  n,
});

const stats = (
  over: Partial<Record<keyof ProbeStats, number>> = {},
): ProbeStats => ({
  throughputTokensPerSec: agg(over.throughputTokensPerSec ?? 100),
  ttftMs: agg(over.ttftMs ?? 300),
  totalLatencyMs: agg(over.totalLatencyMs ?? 900),
  maxSchemaDepth: agg(over.maxSchemaDepth ?? 12),
  maxSchemaBreadth: agg(over.maxSchemaBreadth ?? 48),
  lengthAccuracy: agg(over.lengthAccuracy ?? 0.9),
  informationAccuracy: agg(over.informationAccuracy ?? 0.8),
});

const config = (o: {
  id: string;
  modelName: string;
  effort: EffortLevel;
  provenance: ConfigRun["provenance"];
  inputCost?: number;
  outputCost?: number;
  generation?: "current" | "previous";
  supersedes?: string;
  supersededBy?: string;
  stats?: ProbeStats;
}): ConfigRun => ({
  id: o.id,
  provider: "google",
  tier: "mid",
  modelName: o.modelName,
  apiModelId: o.id,
  released: "2026",
  inputCostPerMTok: o.inputCost ?? 1,
  outputCostPerMTok: o.outputCost ?? 5,
  effortLevels: ["low", "medium", "high"],
  source: "https://example.com",
  ...(o.generation ? { generation: o.generation } : {}),
  ...(o.supersedes ? { supersedes: o.supersedes } : {}),
  ...(o.supersededBy ? { supersededBy: o.supersededBy } : {}),
  effort: o.effort,
  provenance: o.provenance,
  measuredAt: "2026-07-23T00:00:00.000Z",
  trialsRequested: 3,
  trials: [],
  stats: o.stats ?? stats(),
  review: {
    provenance: "judged",
    judgeModel: "claude-opus-4-8",
    strengths: "s",
    weaknesses: "w",
    bestFor: "b",
    raw: "{}",
  },
});

describe("findGenerationPairs", () => {
  it("reads the pairing from registry metadata, both directions, deduped", () => {
    const cards = [
      { id: "new", generation: "current" as const, supersedes: "old" },
      { id: "old", generation: "previous" as const, supersededBy: "new" },
    ];
    expect(findGenerationPairs(cards)).toEqual([
      { previousId: "old", currentId: "new" },
    ]);
  });

  it("omits a pairing whose counterpart card is absent", () => {
    const cards = [
      { id: "new", generation: "current" as const, supersedes: "gone" },
    ];
    expect(findGenerationPairs(cards)).toEqual([]);
  });

  it("returns nothing for an unpaired registry", () => {
    expect(findGenerationPairs([{ id: "a" }, { id: "b" }])).toEqual([]);
  });
});

describe("computeGenerationDelta math", () => {
  it("computes signed absolute and relative deltas per metric", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      outputCost: 9,
      stats: stats({ throughputTokensPerSec: 100, informationAccuracy: 0.8 }),
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      supersedes: "old",
      generation: "current",
      outputCost: 7.5,
      stats: stats({ throughputTokensPerSec: 120, informationAccuracy: 0.8 }),
    });
    const delta = computeGenerationDelta(previous, current);
    const tp = delta.measuredMetrics.find(
      (m) => m.key === "throughputTokensPerSec",
    );
    expect(tp?.absolute).toBe(20);
    expect(tp?.relative).toBeCloseTo(0.2, 6);
    expect(tp?.outcome).toBe("improved"); // higher-is-better, +20%

    // Saturated accuracy (0.8 → 0.8): delta ≈ 0 is a finding, not a gap.
    const info = delta.measuredMetrics.find(
      (m) => m.key === "informationAccuracy",
    );
    expect(info?.absolute).toBe(0);
    expect(info?.outcome).toBe("unchanged");

    // Cheaper output cost is an improvement (lower-is-better).
    const outCost = delta.costMetrics.find(
      (m) => m.key === "outputCostPerMTok",
    );
    expect(outCost?.absolute).toBeCloseTo(-1.5, 6);
    expect(outCost?.outcome).toBe("improved");
  });

  it("net verdict is 'improved' when a metric improves and none regress", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      stats: stats({ throughputTokensPerSec: 100 }),
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      stats: stats({ throughputTokensPerSec: 130 }),
    });
    expect(computeGenerationDelta(previous, current).verdict).toBe("improved");
  });

  it("net verdict is 'mixed' when faster but pricier (never netted to improved)", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      outputCost: 5,
      stats: stats({ throughputTokensPerSec: 100 }),
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      outputCost: 8, // pricier → regressed
      stats: stats({ throughputTokensPerSec: 130 }), // faster → improved
    });
    expect(computeGenerationDelta(previous, current).verdict).toBe("mixed");
  });

  it("net verdict is 'unchanged' when every metric holds within threshold", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
    });
    expect(computeGenerationDelta(previous, current).verdict).toBe("unchanged");
  });
});

describe("computeGenerationDelta not-measured guard", () => {
  it("refuses a measured delta when the new side is fixtured; no synthesized values", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "fixtured",
    });
    const delta = computeGenerationDelta(previous, current);
    expect(delta.measured).toBe(false);
    expect(delta.measuredMetrics).toEqual([]);
    expect(delta.verdict).toBe("not-measured");
    // Cost deltas remain (curated registry facts, not measurement).
    expect(delta.costMetrics.length).toBeGreaterThan(0);
  });

  it("refuses when either side errored", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "error",
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
    });
    expect(computeGenerationDelta(previous, current).verdict).toBe(
      "not-measured",
    );
  });
});

describe("buildGenerationDeltas", () => {
  it("emits one delta per effort measured on both sides, in effort order", () => {
    const configs = [
      config({
        id: "new",
        modelName: "New",
        effort: "high",
        provenance: "measured",
        generation: "current",
        supersedes: "old",
      }),
      config({
        id: "new",
        modelName: "New",
        effort: "low",
        provenance: "measured",
        generation: "current",
        supersedes: "old",
      }),
      config({
        id: "old",
        modelName: "Old",
        effort: "low",
        provenance: "measured",
        generation: "previous",
        supersededBy: "new",
      }),
      config({
        id: "old",
        modelName: "Old",
        effort: "high",
        provenance: "measured",
        generation: "previous",
        supersededBy: "new",
      }),
      // An effort present only on the new side is not paired.
      config({
        id: "new",
        modelName: "New",
        effort: "medium",
        provenance: "measured",
        generation: "current",
        supersedes: "old",
      }),
    ];
    const deltas = buildGenerationDeltas(configs);
    expect(deltas.map((d) => d.effort)).toEqual(["low", "high"]);
  });

  it("returns nothing when the sweep carries no pairing", () => {
    const configs = [
      config({
        id: "a",
        modelName: "A",
        effort: "low",
        provenance: "measured",
      }),
    ];
    expect(buildGenerationDeltas(configs)).toEqual([]);
  });
});

describe("renderGenerationDeltaSection", () => {
  const paired = (
    provenance: ConfigRun["provenance"],
  ): ReadonlyArray<ConfigRun> => [
    config({
      id: "old",
      modelName: "Gemini 3.5 Flash",
      effort: "low",
      provenance,
      generation: "previous",
      supersededBy: "new",
      outputCost: 9,
      stats: stats({ throughputTokensPerSec: 100 }),
    }),
    config({
      id: "new",
      modelName: "Gemini 3.6 Flash",
      effort: "low",
      provenance,
      generation: "current",
      supersedes: "old",
      outputCost: 7.5,
      stats: stats({ throughputTokensPerSec: 120 }),
    }),
  ];

  it("is empty for an unpaired sweep (byte-stable for unrelated reports)", () => {
    expect(
      renderGenerationDeltaSection([
        config({
          id: "a",
          modelName: "A",
          effort: "low",
          provenance: "measured",
        }),
      ]),
    ).toBe("");
  });

  it("renders the former→new heading, a verdict, and real numbers when measured", () => {
    const md = renderGenerationDeltaSection(paired("measured"));
    expect(md).toContain("Generational comparison (former → new)");
    expect(md).toContain("Gemini 3.5 Flash → Gemini 3.6 Flash");
    expect(md).toContain("Net verdict: **improved**");
    expect(md).toContain("+20%");
  });

  it("shows the not-measured note and no synthesized speed rows on the fixture path", () => {
    const md = renderGenerationDeltaSection(paired("fixtured"), {
      displayGroups: ["speed"],
    });
    expect(md).toContain("Net verdict: **not-measured**");
    expect(md).toContain("Speed and accuracy deltas are omitted");
    expect(md).not.toContain("Sustained throughput");
    // Cost rows still render (curated facts).
    expect(md).toContain("Output cost");
  });
});

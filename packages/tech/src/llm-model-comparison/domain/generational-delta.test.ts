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

  // A measured change must clear the two models' combined run-to-run spread before
  // it earns a direction. Re-running an identical scoped sweep hours apart moved
  // sustained throughput by up to 88% on the same configuration, so a bare
  // percentage change at this trial count is not evidence of a generational move.
  it("labels a material change inside the combined spread as indistinguishable", () => {
    const wide = (mean: number): Aggregate => ({
      mean,
      stdDev: 30, // combined spread 60 — wider than the 20-unit gap below
      min: mean - 60,
      max: mean + 60,
      n: 3,
    });
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      stats: { ...stats(), throughputTokensPerSec: wide(100) },
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      supersedes: "old",
      generation: "current",
      stats: { ...stats(), throughputTokensPerSec: wide(120) },
    });
    const delta = computeGenerationDelta(previous, current);
    const tp = delta.measuredMetrics.find(
      (m) => m.key === "throughputTokensPerSec",
    );
    // The +20% change is real and still reported; only the DIRECTION is withheld.
    expect(tp?.absolute).toBe(20);
    expect(tp?.relative).toBeCloseTo(0.2, 6);
    expect(tp?.spread).toBe(60);
    expect(tp?.outcome).toBe("indistinguishable");
    // Excluded from the tally, and said so rather than silently dropped.
    expect(delta.verdictReason).toContain("indistinguishable");
  });

  it("keeps the direction when the change clears the combined spread", () => {
    const tight = (mean: number): Aggregate => ({
      mean,
      stdDev: 2, // combined spread 4 — well under the 20-unit gap
      min: mean - 4,
      max: mean + 4,
      n: 3,
    });
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      stats: { ...stats(), throughputTokensPerSec: tight(100) },
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      supersedes: "old",
      generation: "current",
      stats: { ...stats(), throughputTokensPerSec: tight(120) },
    });
    const tp = computeGenerationDelta(previous, current).measuredMetrics.find(
      (m) => m.key === "throughputTokensPerSec",
    );
    expect(tp?.outcome).toBe("improved");
  });

  // Cost is a curated registry fact, not a measurement, so it has no spread and
  // must never be suppressed by the spread test.
  it("never withholds a direction from a cost metric", () => {
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      outputCost: 9,
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      supersedes: "old",
      generation: "current",
      outputCost: 7.5,
    });
    const cost = computeGenerationDelta(previous, current).costMetrics.find(
      (m) => m.key === "outputCostPerMTok",
    );
    expect(cost?.spread).toBeNull();
    expect(cost?.outcome).toBe("improved");
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

// A direction is only readable against the sample that produced it. Re-running an
// identical sweep hours apart moved sustained throughput by up to 88% on the same
// configuration, so "−38% over 3 trials" and "−38% over 30" are different claims
// and the section must not leave the reader to infer which one it is showing.
describe("trial counts are stated where verdicts are stated", () => {
  const pair = (previousN: number, currentN: number) => {
    const withN = (mean: number, n: number): ProbeStats => ({
      ...stats(),
      throughputTokensPerSec: { ...agg(mean, n) },
    });
    const previous = config({
      id: "old",
      modelName: "Old",
      effort: "low",
      provenance: "measured",
      stats: withN(100, previousN),
    });
    const current = config({
      id: "new",
      modelName: "New",
      effort: "low",
      provenance: "measured",
      supersedes: "old",
      generation: "current",
      stats: withN(130, currentN),
    });
    return { previous, current };
  };

  it("carries each mean's contributing trial count onto the metric", () => {
    const { previous, current } = pair(3, 3);
    const delta = computeGenerationDelta(previous, current);
    const tp = delta.measuredMetrics.find(
      (m) => m.key === "throughputTokensPerSec",
    );
    expect(tp?.previousTrials).toBe(3);
    expect(tp?.currentTrials).toBe(3);
  });

  it("renders a Trials column beside the spread", () => {
    const { previous, current } = pair(3, 3);
    const markdown = renderGenerationDeltaSection([previous, current]);
    expect(markdown).toContain("| Run-to-run spread | Trials | Direction |");
  });

  it("shows both counts when the two generations differ in sample size", () => {
    // An --only-errored repair can re-measure one side more often than the other,
    // so a single number would misdescribe the pair.
    const { previous, current } = pair(3, 5);
    const delta = computeGenerationDelta(previous, current);
    const tp = delta.measuredMetrics.find(
      (m) => m.key === "throughputTokensPerSec",
    );
    expect(tp?.previousTrials).toBe(3);
    expect(tp?.currentTrials).toBe(5);
    expect(renderGenerationDeltaSection([previous, current])).toContain(
      "| 3 / 5 |",
    );
  });

  it("leaves curated cost facts without a trial count", () => {
    // Cost is a registry fact, not a measurement — a trial count there would be
    // a fabricated sample.
    const { previous, current } = pair(3, 3);
    const delta = computeGenerationDelta(previous, current);
    for (const metric of delta.costMetrics) {
      expect(metric.previousTrials).toBeNull();
      expect(metric.currentTrials).toBeNull();
    }
  });

  it("no longer hardcodes a trial count in the section intro", () => {
    // The count is derived from the artifact, so it cannot drift from what ran.
    const { previous, current } = pair(3, 3);
    expect(renderGenerationDeltaSection([previous, current])).not.toContain(
      "Each measurement is three trials",
    );
  });

  it("records that deltas stay per effort level", () => {
    const { previous, current } = pair(3, 3);
    expect(renderGenerationDeltaSection([previous, current])).toContain(
      "per effort level",
    );
  });
});

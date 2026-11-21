import { describe, expect, it } from "vitest";
import {
  decideAdoptionRationale,
  renderAdoptionRationaleRow,
  renderAdoptionRationaleSection,
  renderAdoptionVerdictSummary,
  QUALITY_ADOPT_FLOOR_RECALL_AT_K,
  SPEED_ADOPT_CEILING_P50_MS,
} from "./adoption-rationale";
import type { Backend, BackendRun } from "./types";

const backend: Backend = {
  id: "sqlite-vec",
  name: "sqlite-vec",
  kind: "self-managed",
  embeddingCoupling: "fixed",
  isolatedStore: true,
  retrievalDeterministic: true,
  source: "test",
  costNote: "local, no per-call cost",
  metadataFiltering: false,
};

const baseRun = (overrides: Partial<BackendRun> = {}): BackendRun => ({
  backend,
  provenance: "measured",
  measuredAt: "2026-07-09T00:00:00.000Z",
  embeddingModel: "fixture-embedding",
  datasetId: "scifact-subset",
  k: 3,
  retrieval: {
    recallAtK: 0.72,
    ndcgAtK: 0.6,
    mrr: 0.5,
    recallAtKCi95: { lower: 0.6, upper: 0.84 },
    ndcgAtKCi95: { lower: 0.5, upper: 0.7 },
    mrrCi95: { lower: 0.4, upper: 0.6 },
    queryCount: 10,
    trialCount: 1,
    intervalNote: "Wilson interval.",
  },
  operational: {
    ingestMs: 100,
    ingestMsStdDev: 5,
    queryLatencyMs: [120, 128, 136],
    queryLatencyP50Ms: 128,
    queryLatencyP50MsStdDev: 8,
    queryLatencyP95Ms: 136,
    queryLatencyP95MsStdDev: 8,
    trialCount: 1,
    costUsd: 0,
    maxScale: 10,
  },
  queryResults: [],
  ...overrides,
});

describe("decideAdoptionRationale", () => {
  it("adopts a measured run whose speed and quality both pass their thresholds", () => {
    const rationale = decideAdoptionRationale(baseRun());
    expect(rationale.verdict).toBe("adopt");
    expect(rationale.verdictReason).toBe(
      "speed and quality both meet their thresholds",
    );
  });

  it("orders factors speed, quality, peak memory, missing-data reason", () => {
    const rationale = decideAdoptionRationale(baseRun());
    expect(rationale.factors.map((factor) => factor.label)).toEqual([
      "Speed",
      "Quality",
      "Peak memory",
      "Missing-data reason",
    ]);
  });

  it("reports peak memory as not measured, named in missing-data reason", () => {
    const rationale = decideAdoptionRationale(baseRun());
    const [, , peakMemory, missingDataReason] = rationale.factors;
    expect(peakMemory.summary).toBe("not measured");
    expect(missingDataReason.summary).toBe("peak memory");
    expect(missingDataReason.detail).toContain("peak memory");
  });

  it("does not let a disclosed peak-memory gap alone block adoption", () => {
    const rationale = decideAdoptionRationale(baseRun());
    expect(rationale.verdict).toBe("adopt");
  });

  it("rejects when query p50 latency exceeds the speed ceiling", () => {
    const run = baseRun({
      operational: {
        ...baseRun().operational,
        queryLatencyP50Ms: SPEED_ADOPT_CEILING_P50_MS + 1,
      },
    });
    const rationale = decideAdoptionRationale(run);
    expect(rationale.verdict).toBe("reject");
    expect(rationale.verdictReason).toBe("speed misses its threshold");
  });

  it("rejects when recall@k is below the quality floor", () => {
    const run = baseRun({
      retrieval: {
        ...baseRun().retrieval,
        recallAtK: QUALITY_ADOPT_FLOOR_RECALL_AT_K - 0.01,
      },
    });
    const rationale = decideAdoptionRationale(run);
    expect(rationale.verdict).toBe("reject");
    expect(rationale.verdictReason).toBe("quality misses its threshold");
  });

  it("rejects a fixtured run and names it in the missing-data reason", () => {
    const run = baseRun({ provenance: "fixtured" });
    const rationale = decideAdoptionRationale(run);
    expect(rationale.verdict).toBe("reject");
    expect(rationale.verdictReason).toBe(
      "not a live measurement (provenance: fixtured)",
    );
    expect(rationale.factors[3]?.detail).toContain("fixtured stand-in");
  });

  it("rejects an errored run and surfaces its error in missing-data reason", () => {
    const run = baseRun({ provenance: "error", error: "connection refused" });
    const rationale = decideAdoptionRationale(run);
    expect(rationale.verdict).toBe("reject");
    expect(rationale.factors[3]?.detail).toContain("connection refused");
  });
});

describe("renderAdoptionRationaleRow", () => {
  it("renders a row with backend, verdict, and four expandable cells in order", () => {
    const run = baseRun();
    const row = renderAdoptionRationaleRow(run, decideAdoptionRationale(run));
    expect(row.startsWith(`| ${backend.name} | **Adopt** | `)).toBe(true);
    const detailsCount = row.split("<details>").length - 1;
    expect(detailsCount).toBe(4);
    const speedIndex = row.indexOf("<summary>128 ms</summary>");
    const qualityIndex = row.indexOf("<summary>72.0%</summary>");
    const memoryIndex = row.indexOf("<summary>not measured</summary>");
    const missingIndex = row.indexOf("<summary>peak memory</summary>");
    expect(speedIndex).toBeGreaterThan(-1);
    expect(speedIndex).toBeLessThan(qualityIndex);
    expect(qualityIndex).toBeLessThan(memoryIndex);
    expect(memoryIndex).toBeLessThan(missingIndex);
  });
});

describe("renderAdoptionRationaleSection", () => {
  it("returns an empty string for no runs", () => {
    expect(renderAdoptionRationaleSection([])).toBe("");
  });

  it("renders a header naming the four factors and one row per backend", () => {
    const section = renderAdoptionRationaleSection([
      baseRun(),
      baseRun({
        backend: { ...backend, id: "other", name: "other-backend" },
        provenance: "fixtured",
      }),
    ]);
    expect(section).toContain(
      "| Backend | Verdict | Speed | Quality | Peak memory | Missing-data reason |",
    );
    expect(section).toContain("| sqlite-vec | **Adopt** |");
    expect(section).toContain("| other-backend | **Reject** |");
  });
});

describe("renderAdoptionVerdictSummary", () => {
  it("returns an empty string for no runs", () => {
    expect(renderAdoptionVerdictSummary([])).toBe("");
  });

  it("counts adopted backends and points to section 7 for the detail", () => {
    const summary = renderAdoptionVerdictSummary([
      baseRun(),
      baseRun({
        backend: { ...backend, id: "other", name: "other-backend" },
        provenance: "fixtured",
      }),
    ]);
    expect(summary).toContain("1 of 2 backend(s)");
    expect(summary).toContain("section 7, Verification Data");
  });

  it("stays within the section 4 character budget for many backends", () => {
    const runs = Array.from({ length: 20 }, (_, index) =>
      baseRun({
        backend: {
          ...backend,
          id: `backend-${index}`,
          name: `backend-${index}`,
        },
      }),
    );
    expect(renderAdoptionVerdictSummary(runs).length).toBeLessThan(500);
  });
});

describe("measurement validity", () => {
  it.each([-1, NaN, Infinity, -Infinity])("rejects invalid p50 %s", (p50) => {
    const run = baseRun({
      operational: { ...baseRun().operational, queryLatencyP50Ms: p50 },
    });
    const result = decideAdoptionRationale(run);
    expect(result.verdict).toBe("reject");
    expect(result.factors[0].summary).toBe("not measured");
    expect(result.factors[3].detail).toContain("finite, non-negative");
  });
  it.each([-0.1, 1.1, NaN, Infinity, -Infinity])(
    "rejects invalid recall %s",
    (recall) => {
      const run = baseRun({
        retrieval: { ...baseRun().retrieval, recallAtK: recall },
      });
      const result = decideAdoptionRationale(run);
      expect(result.verdict).toBe("reject");
      expect(result.factors[1].summary).toBe("not measured");
      expect(result.factors[3].detail).toContain("between 0 and 1");
    },
  );
  it("includes both exact threshold boundaries", () => {
    const run = baseRun({
      operational: {
        ...baseRun().operational,
        queryLatencyP50Ms: SPEED_ADOPT_CEILING_P50_MS,
      },
      retrieval: {
        ...baseRun().retrieval,
        recallAtK: QUALITY_ADOPT_FLOOR_RECALL_AT_K,
      },
    });
    expect(decideAdoptionRationale(run).verdict).toBe("adopt");
  });
  it.each(["fixtured", "error"] as const)(
    "does not present %s values as measurements",
    (provenance) => {
      const result = decideAdoptionRationale(baseRun({ provenance }));
      expect(result.factors.slice(0, 2).map((f) => f.summary)).toEqual([
        "not measured",
        "not measured",
      ]);
      expect(result.factors.map((f) => f.label)).toEqual([
        "Speed",
        "Quality",
        "Peak memory",
        "Missing-data reason",
      ]);
    },
  );
  it("escapes HTML, table separators and template expressions in provider text", () => {
    const run = baseRun({
      backend: { ...backend, name: "backend|<script>" },
      provenance: "error",
      error: "<img src=x onerror=alert(1)>|\n{{danger}}",
    });
    const row = renderAdoptionRationaleRow(run, decideAdoptionRationale(run));
    expect(row).not.toContain("<script>");
    expect(row).not.toContain("<img");
    expect(row).not.toContain("{{danger}}");
    expect(row.split("|")).toHaveLength(8);
    expect(row).not.toContain("\n");
    expect(row).toContain("&lt;img");
  });
});

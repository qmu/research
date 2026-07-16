import { describe, expect, it } from "vitest";
import { PROBE_MANIFEST } from "./domain/manifest";
import { TREND_MODELS } from "./models";
import { estimateTrendRecency, runTrendRecency } from "./run";

describe("runTrendRecency (fixture path)", () => {
  it("answers every subject deterministically without keys", async () => {
    const result = await runTrendRecency({ fixture: true, trials: 2 });
    expect(result.fixture).toBe(true);
    expect(result.runs).toHaveLength(TREND_MODELS.length);
    const perModelCalls = PROBE_MANIFEST.probes.length * 2;
    for (const run of result.runs) {
      expect(run.provenance).toBe("fixtured");
      expect(run.calls).toHaveLength(perModelCalls);
      expect(run.stats.latencyMs.n).toBe(perModelCalls);
    }
  });

  it("shows the grounded-vs-control contrast the topic measures", async () => {
    const result = await runTrendRecency({ fixture: true, trials: 1 });
    const grounded = result.runs.find((run) => run.id === "sonar-grounded");
    const control = result.runs.find((run) => run.id === "gpt-5-5-ungrounded");
    // The grounded fixture cites a valid dated source; the ungrounded control
    // abstains with no citation. This is the exact separation a real trial checks.
    expect(grounded?.stats.citationValidity.mean).toBe(1);
    expect(grounded?.stats.citationFreshnessDays.n).toBeGreaterThan(0);
    expect(control?.stats.citationValidity.mean).toBe(0);
    expect(control?.stats.abstentionRate.mean).toBe(1);
  });

  it("is byte-stable across two fixture runs", async () => {
    const a = await runTrendRecency({ fixture: true, trials: 1 });
    const b = await runTrendRecency({ fixture: true, trials: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("honours a model-id filter", async () => {
    const result = await runTrendRecency({
      fixture: true,
      trials: 1,
      modelIds: ["sonar-grounded"],
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].id).toBe("sonar-grounded");
  });
});

describe("estimateTrendRecency", () => {
  it("prices every subject and names the ceiling", () => {
    const text = estimateTrendRecency(undefined, 3);
    for (const card of TREND_MODELS) {
      expect(text).toContain(card.id);
    }
    expect(text).toContain("ceiling");
  });
});

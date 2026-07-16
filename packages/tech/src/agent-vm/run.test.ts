import { describe, expect, it } from "vitest";
import { estimateAgentVm, runAgentVm } from "./run";
import { SANDBOX_PROVIDERS } from "./models";
import { renderAgentVmReport } from "./domain/report";

describe("agent-vm registry", () => {
  it("has unique ids and cited, dated reference rows", () => {
    const ids = SANDBOX_PROVIDERS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of SANDBOX_PROVIDERS) {
      expect(card.source).toMatch(/^https?:\/\//);
      expect(card.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(card.publishedVcpuHourUsd).toBeGreaterThan(0);
    }
  });
});

describe("runAgentVm (fixture)", () => {
  it("probes every provider deterministically and byte-stably", async () => {
    const first = await runAgentVm({ fixture: true, repetitions: 5 });
    const second = await runAgentVm({ fixture: true, repetitions: 5 });
    expect(first).toEqual(second);
    expect(first.fixture).toBe(true);
    expect(first.runs).toHaveLength(SANDBOX_PROVIDERS.length);
    for (const run of first.runs) {
      expect(run.measurement.provenance).toBe("fixtured");
      expect(run.measurement.samples).toHaveLength(5);
      expect(run.measurement.coldStartMsP95).toBeGreaterThanOrEqual(
        run.measurement.coldStartMsP50,
      );
      expect(run.measurement.measuredCostUsd).toBeGreaterThan(0);
    }
  });

  it("honors a provider filter", async () => {
    const result = await runAgentVm({
      fixture: true,
      repetitions: 3,
      providerIds: ["e2b"],
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.card.id).toBe("e2b");
  });

  it("renders a 7-section article from the fixture result", async () => {
    const result = await runAgentVm({ fixture: true, repetitions: 3 });
    const report = renderAgentVmReport(result);
    expect(report).toContain("# Agent VM / sandbox comparison");
    expect(report).toContain("## 4. Verification Results");
    expect(report).toContain("## 7. Verification Data");
    expect(report).toContain("Firecracker".toLowerCase());
  });
});

describe("runAgentVm (real, no adapters yet)", () => {
  it("marks every provider unreachable without faking numbers", async () => {
    const result = await runAgentVm({ fixture: false, repetitions: 2 });
    expect(result.fixture).toBe(false);
    for (const run of result.runs) {
      expect(run.measurement.provenance).toBe("unreachable");
      expect(run.measurement.samples).toHaveLength(0);
      expect(run.measurement.measuredCostUsd).toBe(0);
    }
  });

  it("supports an injected provisioner factory", async () => {
    const result = await runAgentVm({
      fixture: false,
      repetitions: 2,
      providerIds: ["e2b"],
      provisionerFactory: (providerId) => ({
        provider: providerId,
        bootCold: async () => 100,
        reuseWarm: async () => 10,
        runTask: async () => 50,
        teardown: async () => undefined,
      }),
    });
    const run = result.runs[0];
    expect(run?.measurement.provenance).toBe("measured");
    expect(run?.measurement.coldStartMsP50).toBe(100);
  });
});

describe("estimateAgentVm", () => {
  it("reports provider count, reachability, and an order-of-magnitude cost", () => {
    const text = estimateAgentVm(undefined, 10);
    expect(text).toContain("provider(s)");
    expect(text).toContain("reachable now:");
    expect(text).toMatch(/approx compute cost: ~\$\d/);
  });
});

import { describe, expect, it } from "vitest";
import { diffInference, stableJson } from "./diff.js";

export const fixture = () => ({
  schemaVersion: 1,
  inputSha256: "a".repeat(64),
  sampling: { seed: 42 },
  procedure: "single-request-per-engine",
  fingerprint: {
    os: "test",
    arch: "test",
    totalMemoryMiB: 1024,
    nodeVersion: "test",
  },
  execution: { commandSha256: "b".repeat(64), runnerVersion: "1" },
  runs: [
    {
      engine: "ollama",
      model: "fixture",
      runtimeVersion: "1",
      condition: { quantization: "Q4" },
      status: "measured",
      metrics: {
        ttft: { value: 2, unit: "s", source: "client" },
        tps: { value: 10, unit: "tokens/s", source: "client" },
        peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" },
      },
      quality: [
        {
          fixtureId: "one",
          evaluatorVersion: "exact-text/v1",
          verdict: "pass",
          reason: null,
        },
      ],
    },
  ],
});

describe("saved inference diff", () => {
  it("reports signed deltas, quality changes, and preserves missing memory", () => {
    const b = fixture(),
      a = fixture();
    a.runs[0].metrics.ttft.value = 1;
    a.runs[0].quality[0].verdict = "fail";
    const row = diffInference(b, a).runs[0];
    expect(row.speed.ttft.delta).toBe(-1);
    expect(row.speed.tps.delta).toBe(0);
    expect(row.memory.peak_rss.delta).toBeNull();
    expect(row.memory.peak_rss.before).toEqual(b.runs[0].metrics.peak_rss);
    expect(row.quality.changed).toBe(true);
    expect(b.runs[0].metrics.ttft.value).toBe(2);
  });
  it("is byte stable across object insertion and run ordering", () => {
    const b = fixture();
    b.runs.push({ ...structuredClone(b.runs[0]), engine: "mlx" });
    const a = JSON.parse(
      JSON.stringify(b, (_key, value: unknown) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).reverse())
          : value,
      ),
    );
    a.runs.reverse();
    expect(stableJson(diffInference(b, b))).toBe(
      stableJson(diffInference(a, a)),
    );
  });
  it.each([
    "input",
    "sampling",
    "runtime",
    "condition",
    "fingerprint",
    "execution",
    "status",
    "unit",
  ])("withholds delta for changed %s", (field) => {
    const b = fixture(),
      a = fixture();
    if (field === "input") a.inputSha256 = "c".repeat(64);
    if (field === "sampling") a.sampling.seed = 7;
    if (field === "runtime") a.runs[0].runtimeVersion = "2";
    if (field === "condition") a.runs[0].condition.quantization = "Q8";
    if (field === "fingerprint") a.fingerprint.arch = "other";
    if (field === "execution") a.execution.runnerVersion = "2";
    if (field === "status") a.runs[0].status = "failed";
    if (field === "unit") a.runs[0].metrics.ttft.unit = "ms";
    expect(diffInference(b, a).runs[0].speed.ttft.delta).toBeNull();
  });
  it("reports added and removed engines", () => {
    const b = fixture(),
      a = fixture();
    a.runs[0].engine = "mlx";
    expect(diffInference(b, a).runs.map((r) => r.presence)).toEqual([
      "added",
      "removed",
    ]);
  });
  it("rejects unknown schemas, malformed metrics, and duplicate identities", () => {
    const b = fixture();
    expect(() => diffInference(b, { ...b, schemaVersion: 2 })).toThrow();
    expect(() => diffInference(b, { ...b, runs: [] })).toThrow();
    expect(() =>
      diffInference(b, { ...b, runs: [...b.runs, ...b.runs] }),
    ).toThrow();
    b.runs[0].metrics.ttft.value = Infinity;
    expect(() => diffInference(b, b)).toThrow();
  });
});

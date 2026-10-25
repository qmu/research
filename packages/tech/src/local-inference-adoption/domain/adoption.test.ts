import { describe, expect, it } from "vitest";
import { joinAdoptionResults, renderAdoptionReport } from "./adoption.js";
const digest = "a".repeat(64);
const sample = () => ({
  schemaVersion: 1,
  inputSha256: digest,
  sampling: { temperature: 0, seed: 42 },
  procedure: "single-request-per-engine",
  fingerprint: {
    os: "darwin 25",
    arch: "arm64",
    totalMemoryMiB: 16384,
    engineVersion: "1.0",
  },
  qualitySchemaVersion: 1,
  qualitySourceSha256: digest,
  runs: [
    {
      engine: "ollama",
      model: "model",
      runtimeVersion: "1.0",
      condition: { quantization: "Q4", weights: digest, cache: false },
      status: "measured",
      metrics: { tps: { value: 0, unit: "tokens/s", source: "client" } },
      quality: [
        {
          fixtureId: "answer",
          fixtureSha256: digest,
          evaluatorVersion: "exact-text/v1",
          verdict: "pass",
          reason: null as string | null,
        },
      ],
    },
  ],
});
function changed(change: (v: ReturnType<typeof sample>) => void) {
  const result = sample();
  change(result);
  return result;
}
describe("exact adoption join", () => {
  it("groups matching recorded conditions without mutating inputs", () => {
    const first = sample();
    const second = changed((v) => {
      v.runs[0].metrics.tps.value = 12;
      v.qualitySourceSha256 = "b".repeat(64);
    });
    const before = structuredClone([first, second]);
    const report = joinAdoptionResults([first, second]);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0].rowIndexes).toEqual([0, 1]);
    expect(report.rows.map((r) => r.adoption)).toEqual(["pass", "pass"]);
    expect(report.rows[0].metrics.tps).toEqual(first.runs[0].metrics.tps);
    (report.rows[0].metrics.tps as { value: number }).value = 999;
    report.rows[0].quality[0].fixtureId = "changed";
    expect([first, second]).toEqual(before);
  });
  const dimensions: [string, (v: ReturnType<typeof sample>) => void][] = [
    [
      "os",
      (v) => {
        v.fingerprint.os = "linux";
      },
    ],
    [
      "architecture",
      (v) => {
        v.fingerprint.arch = "x64";
      },
    ],
    [
      "memory",
      (v) => {
        v.fingerprint.totalMemoryMiB++;
      },
    ],
    [
      "engine version",
      (v) => {
        v.fingerprint.engineVersion = "2";
      },
    ],
    [
      "engine",
      (v) => {
        v.runs[0].engine = "mlx";
      },
    ],
    [
      "model",
      (v) => {
        v.runs[0].model = "other";
      },
    ],
    [
      "runtime",
      (v) => {
        v.runs[0].runtimeVersion = "2";
      },
    ],
    [
      "quantization",
      (v) => {
        v.runs[0].condition.quantization = "Q8";
      },
    ],
    [
      "weights",
      (v) => {
        v.runs[0].condition.weights = "b".repeat(64);
      },
    ],
    [
      "cache",
      (v) => {
        v.runs[0].condition.cache = true;
      },
    ],
    [
      "prompt",
      (v) => {
        v.inputSha256 = "b".repeat(64);
      },
    ],
    [
      "sampling",
      (v) => {
        v.sampling.seed++;
      },
    ],
    [
      "procedure",
      (v) => {
        v.procedure = "warm";
      },
    ],
    [
      "fixture id",
      (v) => {
        v.runs[0].quality[0].fixtureId = "other";
      },
    ],
    [
      "fixture digest",
      (v) => {
        v.runs[0].quality[0].fixtureSha256 = "b".repeat(64);
      },
    ],
    [
      "evaluator",
      (v) => {
        v.runs[0].quality[0].evaluatorVersion = "exact-text/v2";
      },
    ],
  ];
  it.each(dimensions)("separates %s", (_, change) => {
    expect(
      joinAdoptionResults([sample(), changed(change)]).groups,
    ).toHaveLength(2);
  });
  it("uses every condition key and preserves scalar types", () => {
    const first = sample();
    const second = sample();
    Object.assign(second.runs[0].condition, { additional: "setting" });
    expect(joinAdoptionResults([first, second]).groups).toHaveLength(2);
    Object.assign(second.runs[0].condition, { cache: "false" });
    expect(joinAdoptionResults([first, second]).groups).toHaveLength(2);
  });
  it("ignores object property order and fixture array order", () => {
    const first = sample();
    first.runs[0].quality.push({
      ...first.runs[0].quality[0],
      fixtureId: "second",
    });
    const second = structuredClone(first);
    second.runs[0].condition = {
      cache: false,
      weights: digest,
      quantization: "Q4",
    };
    second.runs[0].quality.reverse();
    expect(joinAdoptionResults([first, second]).groups).toHaveLength(1);
    expect(
      joinAdoptionResults([first, second]).groups.map((g) => g.conditionKey),
    ).toEqual(
      joinAdoptionResults([second, first]).groups.map((g) => g.conditionKey),
    );
  });
  it.each([
    "fingerprint",
    "sampling",
    "inputSha256",
    "procedure",
    "qualitySchemaVersion",
    "qualitySourceSha256",
  ])("isolates legacy missing %s", (key) => {
    const data = sample() as Record<string, unknown>;
    delete data[key];
    const result = joinAdoptionResults([data, data]);
    expect(result.groups).toEqual([]);
    expect(
      result.rows.every(
        (r) => r.adoption === "undetermined" && r.groupId === null,
      ),
    ).toBe(true);
  });
  it.each(["condition", "runtimeVersion", "quality"])(
    "isolates run missing %s",
    (key) => {
      const data = sample();
      delete (data.runs[0] as Record<string, unknown>)[key];
      expect(joinAdoptionResults([data]).rows[0].comparability).toBe(
        "undetermined",
      );
    },
  );
  it("does not infer complete conditions from an empty object", () => {
    const data = sample();
    Object.assign(data.runs[0], { condition: {} });
    expect(joinAdoptionResults([data]).rows[0].reasons).toContain(
      "MISSING-CONDITION",
    );
  });
  it("keeps fixture failure, unavailable output and measurement failure distinct", () => {
    const fail = changed((v) => {
      v.runs[0].quality[0].verdict = "fail";
    });
    const missing = changed((v) => {
      Object.assign(v.runs[0].quality[0], {
        verdict: "undetermined",
        reason: "NO-OUTPUT",
      });
    });
    const failed = changed((v) => {
      v.runs[0].status = "failed";
      Object.assign(v.runs[0], {
        error: "timeout",
        metrics: {
          tps: { value: null, unit: "tokens/s", reason: "MEASURE-FAILED" },
        },
      });
      Object.assign(v.runs[0].quality[0], {
        verdict: "undetermined",
        reason: "MEASURE-FAILED",
      });
    });
    const result = joinAdoptionResults([fail, missing, failed]);
    expect(result.groups).toHaveLength(1);
    expect(result.rows.map((r) => r.adoption)).toEqual([
      "fail",
      "undetermined",
      "undetermined",
    ]);
    expect(result.rows[2].status).toBe("failed");
    expect(result.rows[2].error).toBe("timeout");
    expect(result.rows[2].metrics).toEqual(failed.runs[0].metrics);
  });
  it("rejects duplicate fixture identities and contradictory verdicts", () => {
    const duplicate = sample();
    duplicate.runs[0].quality.push({ ...duplicate.runs[0].quality[0] });
    expect(() => joinAdoptionResults([duplicate])).toThrow("Duplicate");
    expect(() =>
      joinAdoptionResults([
        changed((v) => {
          v.runs[0].status = "failed";
        }),
      ]),
    ).toThrow("contradictory");
    expect(() =>
      joinAdoptionResults([
        changed((v) => {
          v.runs[0].quality[0].reason = "NO-OUTPUT";
        }),
      ]),
    ).toThrow("Invalid quality");
  });
  it.each([
    null,
    {},
    { schemaVersion: 2, runs: [] },
    { schemaVersion: 1, runs: [] },
  ])("rejects invalid root %j", (data) => {
    expect(() => joinAdoptionResults([data])).toThrow();
  });
  it("rejects enum values masquerading as strings", () => {
    for (const key of ["engine", "status"]) {
      const data = sample();
      const run = data.runs[0] as Record<string, unknown>;
      run[key] = [run[key]];
      expect(() => joinAdoptionResults([data])).toThrow();
    }
    const data = sample();
    Object.assign(data.runs[0].quality[0], { verdict: ["pass"] });
    expect(() => joinAdoptionResults([data])).toThrow();
  });
  it("rejects malformed present metadata and metrics", () => {
    const changes = [
      (v: ReturnType<typeof sample>) => {
        v.fingerprint.totalMemoryMiB = Infinity;
      },
      (v: ReturnType<typeof sample>) => {
        v.inputSha256 = "bad";
      },
      (v: ReturnType<typeof sample>) => {
        Object.assign(v.runs[0].condition, { nested: {} });
      },
      (v: ReturnType<typeof sample>) => {
        v.runs[0].metrics.tps.value = NaN;
      },
      (v: ReturnType<typeof sample>) => {
        Object.assign(v.runs[0].metrics.tps, { reason: "NO-FIELD" });
      },
      (v: ReturnType<typeof sample>) => {
        v.runs[0].quality[0].verdict = "unknown";
      },
    ];
    for (const change of changes)
      expect(() => joinAdoptionResults([changed(change)])).toThrow();
  });
  it("treats prototype-like condition keys as data", () => {
    const first = sample();
    Object.assign(first.runs[0], {
      condition: JSON.parse('{"__proto__":"one","constructor":"two"}'),
    });
    const second = structuredClone(first);
    Object.assign(second.runs[0], {
      condition: JSON.parse('{"__proto__":"different","constructor":"two"}'),
    });
    expect(joinAdoptionResults([first, second]).groups).toHaveLength(2);
    expect({}).not.toHaveProperty("polluted");
  });
  it("renders separate tables per group and isolates unknown rows", () => {
    const legacy = sample() as Record<string, unknown>;
    delete legacy.fingerprint;
    const output = renderAdoptionReport([
      sample(),
      changed((v) => {
        v.runs[0].model = "other";
      }),
      legacy,
    ]);
    expect(output.match(/\| Source \/ run \|/g)).toHaveLength(3);
    expect(output).toContain("## condition-1");
    expect(output).toContain("## condition-2");
    expect(output).toContain("## Undetermined conditions");
    expect(output).toContain("not mutually comparable");
    expect(output.match(/<details>/g)).toHaveLength(5);
    expect(output.match(/<summary>Recorded evidence<\/summary>/g)).toHaveLength(
      3,
    );
    expect(output).toContain(
      "| Source / run | Engine / model | Status | Adoption | Reasons |",
    );
    expect(output).toContain("./local-inference-adoption-format.md");
  });
  it("warns only when synthetic procedures are present", () => {
    expect(renderAdoptionReport([sample()])).not.toContain("Synthetic entries");
    const synthetic = changed((v) => {
      v.procedure = "synthetic-fixture";
    });
    expect(renderAdoptionReport([sample(), synthetic])).toContain(
      "Synthetic entries test joining and are not measured engine performance.",
    );
  });
  it("renders deterministic escaped rows, exact conditions, zero and gap reasons", () => {
    const data = sample();
    data.runs[0].model =
      "<script>alert(1)</script>|[link](https://bad)\n{{bad}}";
    const output = renderAdoptionReport([data]);
    expect(output).toBe(renderAdoptionReport([data]));
    expect(output).toContain("Exact group conditions");
    expect(output).toContain("condition-1");
    expect(output).toContain('"value": 0');
    expect(output).toContain("&#60;script&#62;");
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("{{bad}}");
    expect(output).not.toContain("[link]");
    expect(output).toContain("&#124;");
  });
});

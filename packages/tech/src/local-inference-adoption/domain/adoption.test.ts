import { describe, expect, it } from "vitest";
import {
  joinAdoptionResults as joinResults,
  renderAdoptionReport as renderReport,
} from "./adoption.js";
const currentCommit = "1".repeat(40);
const joinAdoptionResults = (inputs: readonly unknown[]) =>
  joinResults(inputs, currentCommit);
const renderAdoptionReport = (inputs: readonly unknown[]) =>
  renderReport(inputs, currentCommit);
const digest = "a".repeat(64);
const sample = () => ({
  schemaVersion: 1,
  execution: {
    targetCommit: currentCommit,
    runnerVersion: "local-inference/4",
  },
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
    expect(
      output.match(/\| Source \/ run \| Engine \/ model \| Status/g),
    ).toHaveLength(3);
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

describe("evaluator mismatch diagnostics", () => {
  it("blocks cross-version grouping with a fixed reason and remeasurement link", () => {
    const inputs = [
      sample(),
      changed((v) => {
        v.runs[0].quality[0].evaluatorVersion = "exact-text/v2";
        v.runs[0].quality[0].verdict = "fail";
      }),
    ];
    const before = structuredClone(inputs);
    const report = joinAdoptionResults(inputs);
    expect(report.groups).toHaveLength(2);
    expect(report.evaluatorMismatches).toEqual([
      {
        rowIndexes: [0, 1],
        reason: "EVALUATOR-VERSION-MISMATCH",
      },
    ]);
    expect(report.rows.map((r) => r.adoption)).toEqual(["pass", "fail"]);
    const rendered = renderAdoptionReport(inputs);
    expect(rendered).toContain("exact-text/v1");
    expect(rendered).toContain("exact-text/v2");
    expect(rendered).toContain("EVALUATOR-VERSION-MISMATCH");
    expect(rendered).toContain(
      "./local-inference-adoption-format.md#remeasure",
    );
    expect(inputs).toEqual(before);
  });
  it("does not diagnose equal versions, other condition changes or missing metadata", () => {
    expect(
      joinAdoptionResults([sample(), sample()]).evaluatorMismatches,
    ).toEqual([]);
    const other = changed((v) => {
      v.runs[0].quality[0].evaluatorVersion = "exact-text/v2";
      v.runs[0].condition.quantization = "Q8";
    });
    expect(joinAdoptionResults([sample(), other]).evaluatorMismatches).toEqual(
      [],
    );
    const missing = sample() as Partial<ReturnType<typeof sample>>;
    delete missing.fingerprint;
    expect(
      joinAdoptionResults([sample(), missing]).evaluatorMismatches,
    ).toEqual([]);
    expect(renderAdoptionReport([sample()])).not.toContain(
      "EVALUATOR-VERSION-MISMATCH",
    );
  });
  it("checks every fixture independent of quality array order", () => {
    const a = sample();
    a.runs[0].quality.push({ ...a.runs[0].quality[0], fixtureId: "second" });
    const b = structuredClone(a);
    b.runs[0].quality.reverse();
    expect(joinAdoptionResults([a, b]).evaluatorMismatches).toEqual([]);
    b.runs[0].quality[0].evaluatorVersion = "exact-text/v2";
    expect(joinAdoptionResults([a, b]).evaluatorMismatches).toHaveLength(1);
  });
  it("escapes untrusted evaluator labels in the notice", () => {
    const hostile = changed((v) => {
      v.runs[0].quality[0].evaluatorVersion = "<script>{{x}}|[link](bad)";
    });
    const rendered = renderAdoptionReport([sample(), hostile]);
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain("{{x}}");
    expect(rendered).toContain("&#60;script&#62;");
  });
});

describe("current commit eligibility", () => {
  it("excludes every run in a stale source, including quality failures", () => {
    const stale = sample();
    stale.execution.targetCommit = "2".repeat(40);
    stale.runs.push(structuredClone(stale.runs[0]));
    stale.runs[1].quality[0].verdict = "fail";
    const before = structuredClone(stale);
    const report = joinAdoptionResults([sample(), stale]);
    expect(report.groups.flatMap((g) => g.rowIndexes)).toEqual([0]);
    expect(
      report.rows
        .slice(1)
        .map((r) => [r.excluded, r.adoption, r.groupId, r.reasons[0]]),
    ).toEqual([
      [true, "undetermined", null, "COMMIT-MISMATCH"],
      [true, "undetermined", null, "COMMIT-MISMATCH"],
    ]);
    expect(stale).toEqual(before);
    expect(report.rows[2].quality[0].verdict).toBe("fail");
  });
  it("does not treat missing commit metadata as eligible or evaluator mismatches", () => {
    const missing: Record<string, unknown> = sample();
    delete missing.execution;
    const stale = changed((v) => {
      v.execution.targetCommit = "2".repeat(40);
      v.runs[0].quality[0].evaluatorVersion = "v2";
    });
    const report = joinAdoptionResults([sample(), missing, stale]);
    expect(report.rows[1].reasons[0]).toBe("MISSING-COMMIT");
    expect(report.evaluatorMismatches).toEqual([]);
    expect(report.groups).toHaveLength(1);
  });
  it.each([
    undefined,
    null,
    "",
    "HEAD",
    "1".repeat(7),
    "z".repeat(40),
    "1".repeat(41),
  ])("rejects invalid current commit %s", (value) => {
    expect(() => joinResults([sample()], value as string)).toThrow(
      "Invalid current commit",
    );
  });
  it.each([null, "", "HEAD", "1".repeat(7), {}, "<script>"])(
    "rejects malformed saved commit %s",
    (value) => {
      expect(() =>
        joinAdoptionResults([
          { ...sample(), execution: { targetCommit: value } },
        ]),
      ).toThrow("Invalid saved commit");
    },
  );
  it("renders stale rows only as excluded evidence, never adoption rows", () => {
    const stale = changed((v) => {
      v.execution.targetCommit = "2".repeat(40);
    });
    const rendered = renderAdoptionReport([stale]);
    expect(rendered).toContain("COMMIT-MISMATCH");
    expect(rendered).toContain("Excluded evidence: source / run 1 / 1");
    expect(rendered).not.toContain("| Adoption |");
    expect(rendered).not.toContain("## condition-");
    expect(rendered).not.toContain("## Undetermined conditions");
    expect(
      joinResults([stale], stale.execution.targetCommit).rows[0].adoption,
    ).toBe("pass");
  });
});

describe("missing target commit recovery", () => {
  it.each(["execution", "targetCommit"])(
    "keeps every run in a source without %s ineligible and links each to recovery",
    (field) => {
      const missing = sample();
      missing.runs.push(structuredClone(missing.runs[0]));
      missing.runs[1].quality[0].verdict = "fail";
      missing.runs[1].quality[0].evaluatorVersion = "other-version";
      if (field === "execution") Reflect.deleteProperty(missing, field);
      else Reflect.deleteProperty(missing.execution, field);
      const before = structuredClone(missing);
      const report = joinAdoptionResults([sample(), missing]);
      expect(report.groups.flatMap((group) => group.rowIndexes)).toEqual([0]);
      expect(report.evaluatorMismatches).toEqual([]);
      for (const [index, row] of report.rows.slice(1).entries()) {
        expect(row).toMatchObject({
          commitSha: null,
          excluded: true,
          adoption: "undetermined",
          comparability: "undetermined",
          groupId: null,
          conditionKey: null,
          metrics: before.runs[index].metrics,
          quality: before.runs[index].quality,
        });
        expect(row.reasons[0]).toBe("MISSING-COMMIT");
      }
      const output = renderAdoptionReport([sample(), missing]);
      for (const run of [1, 2])
        expect(output).toContain(
          `| 2 / ${run} | not recorded | excluded (cannot adopt) | MISSING-COMMIT: Target commit SHA was not recorded. [Remeasure missing commit](./local-inference-adoption-format.md#missing-commit) |`,
        );
      expect(missing).toEqual(before);
      expect(renderAdoptionReport([sample(), missing])).toBe(output);
    },
  );
  it("does not add missing-commit recovery to matching or mismatched rows", () => {
    const stale = sample();
    stale.execution.targetCommit = "2".repeat(40);
    const output = renderAdoptionReport([sample(), stale]);
    expect(output).not.toContain("#missing-commit");
    expect(output).not.toContain("excluded (cannot adopt)");
    expect(output).toContain(`| 1 / 1 | ${currentCommit} | eligible | none |`);
    expect(output).toContain(
      `| 2 / 1 | ${stale.execution.targetCommit} | excluded | COMMIT-MISMATCH |`,
    );
  });
});

describe("saved runner version eligibility", () => {
  it.each([
    [undefined, "MISSING-RUNNER-VERSION"],
    [null, "MISSING-RUNNER-VERSION"],
    ["", "MISSING-RUNNER-VERSION"],
    [" \n\t", "MISSING-RUNNER-VERSION"],
    ["local-inference/999", "UNKNOWN-RUNNER-VERSION"],
    [" local-inference/4", "UNKNOWN-RUNNER-VERSION"],
    ["local-inference/4 ", "UNKNOWN-RUNNER-VERSION"],
    [4, "UNKNOWN-RUNNER-VERSION"],
    [{}, "UNKNOWN-RUNNER-VERSION"],
    [[], "UNKNOWN-RUNNER-VERSION"],
  ])("excludes all runs for runner %j with %s", (version, reason) => {
    const saved = sample();
    Object.assign(saved.execution, { runnerVersion: version });
    saved.runs.push(structuredClone(saved.runs[0]));
    saved.runs[1].quality[0].verdict = "fail";
    saved.runs[1].quality[0].evaluatorVersion = "exact-text/v2";
    const before = structuredClone(saved);
    const result = joinAdoptionResults([sample(), saved]);
    expect(result.groups.flatMap((group) => group.rowIndexes)).toEqual([0]);
    expect(result.evaluatorMismatches).toEqual([]);
    for (const [index, row] of result.rows.slice(1).entries()) {
      expect(row).toMatchObject({
        excluded: true,
        adoption: "undetermined",
        comparability: "undetermined",
        conditionKey: null,
        groupId: null,
        runnerVersion: null,
        runnerRecovery: {
          reason,
          href: "./local-inference-adoption-format.md#runner-version",
        },
        metrics: before.runs[index].metrics,
        quality: before.runs[index].quality,
      });
      expect(row.reasons[0]).toBe(reason);
    }
    expect(saved).toEqual(before);
    const rendered = renderAdoptionReport([saved]);
    expect(rendered).not.toContain("| Adoption |");
    expect(rendered).not.toContain("## condition-");
    expect(rendered).toContain("excluded (cannot adopt)");
    expect(rendered).toContain(
      "[Remeasure runner](./local-inference-adoption-format.md#runner-version)",
    );
    expect(renderAdoptionReport([saved])).toBe(rendered);
  });

  it("keeps commit and runner failures in fixed order", () => {
    const saved = sample();
    Reflect.deleteProperty(saved.execution, "runnerVersion");
    Reflect.deleteProperty(saved.execution, "targetCommit");
    expect(joinAdoptionResults([saved]).rows[0].reasons).toEqual([
      "MISSING-COMMIT",
      "MISSING-RUNNER-VERSION",
    ]);
    expect(renderAdoptionReport([saved])).toContain("#missing-commit");
    expect(renderAdoptionReport([saved])).toContain("#runner-version");
  });

  it("accepts known contracts while separating versions and retaining quality gates", () => {
    const inputs = [
      "local-inference/2",
      "local-inference/3",
      "local-inference/4",
    ].map((version) =>
      changed((v) => {
        v.execution.runnerVersion = version;
      }),
    );
    inputs[1].runs[0].quality[0].verdict = "fail";
    inputs[2].runs[0].quality[0].evaluatorVersion = "exact-text/v2";
    const result = joinAdoptionResults(inputs);
    expect(result.rows.map((row) => row.adoption)).toEqual([
      "pass",
      "fail",
      "pass",
    ]);
    expect(
      result.rows.every((row) => !row.excluded && row.runnerRecovery === null),
    ).toBe(true);
    expect(result.groups).toHaveLength(3);
    expect(result.evaluatorMismatches).toEqual([]);
  });

  it("never reflects untrusted runner labels into recovery or rendered output", () => {
    const hostile =
      "<script>{{secret}}|[link](https://bad) $(touch /tmp/private)";
    const saved = changed((v) => {
      v.execution.runnerVersion = hostile;
    });
    expect(JSON.stringify(joinAdoptionResults([saved]))).not.toContain(hostile);
    const rendered = renderAdoptionReport([saved]);
    expect(rendered).not.toContain("https://bad");
    expect(rendered).not.toContain("secret");
    expect(rendered).not.toContain("touch");
    expect(rendered).toContain(
      "UNKNOWN-RUNNER-VERSION: Runner version is not supported by this reader.",
    );
  });
});

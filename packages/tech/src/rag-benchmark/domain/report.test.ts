import { describe, expect, it } from "vitest";
import { runRagBenchmark } from "../run";
import { renderRagBenchmarkReport } from "./report";
import type { BackendRun, GapReasonCode } from "./types";

describe("renderRagBenchmarkReport gap reasons", () => {
  const render = async (codes: ReadonlyArray<GapReasonCode | undefined>) => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
    const runs: ReadonlyArray<BackendRun> = result.runs.map((run, index) => {
      const reasonCode = codes[index];
      return reasonCode === undefined ? run : { ...run, reasonCode };
    });
    return {
      runs,
      report: renderRagBenchmarkReport({ ...result, runs }),
    };
  };

  it("prints the reason code in every metric cell of a gap row, never 0", async () => {
    const { runs, report } = await render([
      "UNREACHABLE",
      "UNSUPPORTED",
      "MEASURE-FAILED",
    ]);
    for (const [index, code] of (
      ["UNREACHABLE", "UNSUPPORTED", "MEASURE-FAILED"] as const
    ).entries()) {
      const name = runs[index]?.backend.name ?? "";
      const row = report
        .split("\n")
        .find((line) => line.startsWith(`| ${name} |`));
      expect(row).toBeDefined();
      expect(row?.match(new RegExp(`n/a \\(${code}\\)`, "g"))).toHaveLength(7);
      expect(report).toContain(`Gap reason ${code}:`);
    }
  });

  it("leaves rows without a reason code unchanged", async () => {
    const { report } = await render([]);
    expect(report).not.toContain("n/a (");
    expect(report).not.toContain("Gap reason");
  });
});

it("pairs each gap status with its code and explanation beside the results", async () => {
  const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
  const codes = ["UNREACHABLE", "UNSUPPORTED", "MEASURE-FAILED"] as const;
  const report = renderRagBenchmarkReport({
    ...result,
    runs: result.runs.map((run, i) => ({ ...run, reasonCode: codes[i] })),
  });
  expect(report).toContain(
    "| unreachable | `UNREACHABLE` | the backend's credential",
  );
  expect(report).toContain("| unsupported | `UNSUPPORTED` | no store adapter");
  expect(report).toContain("| failed | `MEASURE-FAILED` | the adapter ran");
  expect(report.indexOf("**Missing measurement reasons**")).toBeGreaterThan(
    report.indexOf("**Per-backend results**"),
  );
});

it("excludes a gap from the measured overview and trial claims", async () => {
  const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
  const run = result.runs[0];
  if (run === undefined) throw new Error("Expected a fixture backend");
  const report = renderRagBenchmarkReport({
    ...result,
    runs: [{ ...run, provenance: "measured", reasonCode: "MEASURE-FAILED" }],
  });
  expect(report).toContain("**0 measured**");
  expect(report).not.toContain(
    "Operational metrics are mean ± sample stdDev across",
  );
  expect(report).not.toContain(run.retrieval.intervalNote);
});

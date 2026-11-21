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
      const row = report.split("\n").find((line) => line.startsWith(`| ${name} |`));
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

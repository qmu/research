import { describe, expect, it } from "vitest";
import { runRagBenchmark } from "../run";
import { renderRagBenchmarkReport } from "./report";

describe("renderRagBenchmarkReport", () => {
  it("shows a safe reproduction command paired with the fixture id", async () => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 5 });
    const report = renderRagBenchmarkReport(result);

    expect(report).toContain(
      "**Safe reproduction command.** `npm run rag -- --fixture --trials 5` " +
        "reproduces this run from fixture id `scifact-mini`.",
    );
  });

  it("never leaks a vendor credential env var name into the rendered report", async () => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 5 });
    const report = renderRagBenchmarkReport(result);

    for (const secretEnvVar of [
      "OPENAI_API_KEY",
      "AWS_PROFILE",
      "AWS_ACCESS_KEY_ID",
      "CLOUDFLARE_API_TOKEN",
    ]) {
      expect(report).not.toContain(secretEnvVar);
    }
  });
});

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { resolveGeneratedAt, runLlmBenchmark } from "../llm-benchmark/run";
import { renderReport } from "../llm-benchmark/domain/report";

// Thin entrypoint: pick fixture vs. real from the environment, run the pure
// domain logic in ../llm-benchmark/run.ts, render the result page, and write
// it. No benchmark logic lives here.

export const main = async (): Promise<void> => {
  const explicitFixture = process.argv.includes("--fixture");
  const fixture = explicitFixture || !process.env.ANTHROPIC_API_KEY;
  if (fixture && !explicitFixture) {
    process.stderr.write(
      "ANTHROPIC_API_KEY not set; using the deterministic fixture model.\n",
    );
  }

  const result = await runLlmBenchmark({ fixture });
  const generatedAt = resolveGeneratedAt(fixture);
  const page = renderReport(result, generatedAt);

  const outputPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/llm-benchmark.md");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, page, "utf8");

  process.stdout.write(
    `${result.model}: ${result.correct}/${result.total} correct (${(
      result.accuracy * 100
    ).toFixed(1)}%)\nwrote ${outputPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`benchmark failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

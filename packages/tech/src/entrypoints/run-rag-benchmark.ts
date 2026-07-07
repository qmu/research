import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { estimateRagBenchmark, runRagBenchmark } from "../rag-benchmark/run";
import { renderRagBenchmarkReport } from "../rag-benchmark/domain/report";

const hasArg = (name: string): boolean => process.argv.includes(name);

const writeOutputs = async (
  reportPath: string,
  artifactPath: string,
  report: string,
  artifact: unknown,
): Promise<void> => {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
};

const main = async (): Promise<void> => {
  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateRagBenchmark()}\n`);
    return;
  }

  const fixture = hasArg("--fixture");
  const result = await runRagBenchmark({ fixture, k: 3, trials: 1 });
  const reportPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/rag-benchmark.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath: artifactPath.split("/").at(-1) ?? "rag-benchmark.data.json",
  };
  await writeOutputs(
    reportPath,
    artifactPath,
    renderRagBenchmarkReport(rendered),
    rendered,
  );
  process.stdout.write(
    `rag-benchmark: ${result.runs.length} backend(s), fixture=${fixture}\nwrote ${reportPath}\nwrote ${artifactPath}\n`,
  );
};

main().catch((error: unknown) => {
  process.stderr.write(`rag benchmark failed: ${String(error)}\n`);
  process.exitCode = 1;
});

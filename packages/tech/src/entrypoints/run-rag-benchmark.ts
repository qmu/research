import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { estimateRagBenchmark, runRagBenchmark } from "../rag-benchmark/run";
import { renderRagBenchmarkReport } from "../rag-benchmark/domain/report";
import {
  appendHistory,
  buildHistoryEntry,
  redactBenchmarkResultForArchive,
} from "../rag-benchmark/domain/history";
import type {
  BenchmarkResult,
  HistoryFile,
} from "../rag-benchmark/domain/types";

const hasArg = (name: string): boolean => process.argv.includes(name);

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const parseBackends = (): ReadonlyArray<string> =>
  argValue("--backends")
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0) ?? [];

const parseTrials = (): number => {
  const value = Number(argValue("--trials") ?? "5");
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 5;
};

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

const readHistory = async (
  historyPath: string,
): Promise<HistoryFile | null> => {
  try {
    return JSON.parse(await readFile(historyPath, "utf8")) as HistoryFile;
  } catch {
    return null;
  }
};

// Real RAG runs append a compact per-backend point and keep the full artifact
// gzipped beside the LLM archives. Fixture runs skip this path so the committed
// fixture report/data pair stays byte-stable and keyless.
const writeHistory = async (
  historyBasePath: string,
  result: BenchmarkResult,
): Promise<void> => {
  const historyPath = historyBasePath.replace(/\.md$/, ".history.json");
  const history = await readHistory(historyPath);
  const updated = appendHistory(
    history,
    buildHistoryEntry(result.runs, result.generatedAt, result.trials),
  );
  await writeFile(historyPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

  const stamp = result.generatedAt.replace(/:/g, "-");
  const archiveDir = join(dirname(historyBasePath), "history");
  await mkdir(archiveDir, { recursive: true });
  const archive = redactBenchmarkResultForArchive(result);
  await writeFile(
    join(archiveDir, `rag-benchmark-${stamp}.data.json.gz`),
    gzipSync(Buffer.from(`${JSON.stringify(archive, null, 2)}\n`, "utf8")),
  );
};

const main = async (): Promise<void> => {
  const backends = parseBackends();
  const corpus = argValue("--corpus") === "scifact" ? "scifact" : "mini";
  const trials = parseTrials();

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateRagBenchmark(backends, corpus, trials)}\n`);
    return;
  }

  const fixture = hasArg("--fixture");
  // Print the cost estimate before any real (non-fixture) run touches a provider.
  if (!fixture) {
    process.stdout.write(`${estimateRagBenchmark(backends, corpus, trials)}\n`);
  }
  const result = await runRagBenchmark({
    fixture,
    k: 3,
    trials,
    backends,
    corpus,
  });
  // --fixture writes the committed, byte-stable canonical pair (the CI self-test);
  // a real run writes a separate `.real.*` pair (gitignored, regenerable) so it
  // never clobbers the committed fixture baseline.
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/rag-benchmark.md");
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
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
  if (!fixture) {
    await writeHistory(canonicalPath, rendered);
  }
  process.stdout.write(
    `rag-benchmark: ${result.runs.length} backend(s), fixture=${fixture}\nwrote ${reportPath}\nwrote ${artifactPath}\n`,
  );
};

main().catch((error: unknown) => {
  process.stderr.write(`rag benchmark failed: ${String(error)}\n`);
  process.exitCode = 1;
});

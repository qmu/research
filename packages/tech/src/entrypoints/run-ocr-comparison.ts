import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { estimateOcrComparison, runOcrComparison } from "../ocr-comparison/run";
import { renderOcrComparisonReport } from "../ocr-comparison/domain/report";

const hasArg = (name: string): boolean => process.argv.includes(name);

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const parseList = (name: string): ReadonlyArray<string> | undefined =>
  argValue(name)
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");

const parseTrials = (): number => {
  const parsed = Number(argValue("--trials") ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
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

const main = async (): Promise<void> => {
  const trials = parseTrials();
  const modelIds = parseList("--models");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateOcrComparison(modelIds, trials)}\n`);
    return;
  }

  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateOcrComparison(modelIds, trials)}\n`);
  }

  const result = await runOcrComparison({ fixture, trials, modelIds });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/ocr-comparison.md");
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath: artifactPath.split("/").at(-1) ?? "ocr-comparison.data.json",
  };

  await writeOutputs(
    reportPath,
    artifactPath,
    renderOcrComparisonReport(rendered),
    rendered,
  );

  process.stdout.write(
    `ocr-comparison: ${result.runs.length} model row(s), fixture=${fixture}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

main().catch((error: unknown) => {
  process.stderr.write(`ocr comparison failed: ${String(error)}\n`);
  process.exitCode = 1;
});

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { estimateDeepResearch, runDeepResearch } from "../deep-research/run";
import { renderDeepResearchReport } from "../deep-research/domain/report";

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

export const main = async (): Promise<void> => {
  const trials = parseTrials();
  const subjectIds = parseList("--subjects");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateDeepResearch(subjectIds, trials)}\n`);
    return;
  }

  // Like OCR / image-generation, the entrypoint defaults to its keyless fixture
  // and switches to a real run only with an explicit --real.
  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateDeepResearch(subjectIds, trials)}\n`);
  }

  const result = await runDeepResearch({ fixture, trials, subjectIds });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/deep-research-comparison.md",
    );
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath:
      artifactPath.split("/").at(-1) ?? "deep-research-comparison.data.json",
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderDeepResearchReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `deep-research: ${result.runs.length} subject row(s), fixture=${fixture}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`deep research failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

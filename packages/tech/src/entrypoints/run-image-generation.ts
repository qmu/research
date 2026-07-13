import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import {
  estimateImageGeneration,
  runImageGeneration,
} from "../image-generation/run";
import { renderImageGenerationReport } from "../image-generation/domain/report";

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
  const modelIds = parseList("--models");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateImageGeneration(modelIds, trials)}\n`);
    return;
  }

  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateImageGeneration(modelIds, trials)}\n`);
  }

  const result = await runImageGeneration({ fixture, trials, modelIds });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/image-generation-comparison.md",
    );
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath:
      artifactPath.split("/").at(-1) ?? "image-generation-comparison.data.json",
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderImageGenerationReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `image-generation: ${result.runs.length} model row(s), fixture=${fixture}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`image generation failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

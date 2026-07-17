import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { estimateTokenMetering, runTokenMetering } from "../token-metering/run";
import { renderTokenMeteringReport } from "../token-metering/domain/report";
import {
  buildRealProbeFactory,
  probesMissingCredentials,
} from "../vendors/token-count/probes";
import { buildRealEdgeProbeRunner } from "../vendors/token-count/edge-probes";
import { publishedVocabularySource } from "../vendors/token-count/vocabularies";

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

export const main = async (): Promise<void> => {
  const familyIds = parseList("--families");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateTokenMetering(familyIds)}\n`);
    return;
  }

  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateTokenMetering(familyIds)}\n`);
    for (const gap of probesMissingCredentials(process.env)) {
      process.stdout.write(
        `token-metering: ${gap.familyId} missing ${gap.missing.join(", ")} → will record unreachable\n`,
      );
    }
  }

  const result = await runTokenMetering({
    fixture,
    ...(fixture
      ? {}
      : {
          probeFactory: buildRealProbeFactory(process.env),
          vocabularySource: publishedVocabularySource,
          edgeProbeRunner: buildRealEdgeProbeRunner(process.env),
        }),
    ...(familyIds === undefined ? {} : { familyIds }),
  });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/token-metering-comparison.md",
    );
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath:
      artifactPath.split("/").at(-1) ?? "token-metering-comparison.data.json",
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderTokenMeteringReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `token-metering: ${result.families.length} family row(s), fixture=${fixture}, spend=$${result.spendUsd.toFixed(4)}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`token-metering failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import type { ComparisonResult } from "../llm-model-comparison/domain/types";
import {
  GROUP_SPECS,
  projectComparison,
  type ProbeGroup,
} from "../llm-model-comparison/domain/split";
import { renderSplitReport } from "../llm-model-comparison/domain/split-report";
import {
  findPublishedResearchTopic,
  reportFrameSources,
} from "../research/domain/site";

/**
 * Effectful runner for a split topic (speed | accuracy). It reads the combined
 * comparison artifact, projects it to the group, and writes the group's focused
 * report + data artifact. It performs NO provider calls — the measurement is the
 * shared `compare` sweep — so `--estimate` reports zero incremental cost and
 * `--real` simply re-projects the latest real compare artifact.
 *
 * The keyless `--fixture` path projects the committed compare fixture artifact
 * (`llm-model-comparison.data.json`) into a `.fixture.*` report so the public
 * per-topic page is not overwritten by placeholder `n/a (fixtured)` cells.
 */
const hasArg = (name: string): boolean => process.argv.includes(name);

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const docsReportDir = (): string =>
  resolve(process.cwd(), "../../docs/research-reports");

const compareArtifactPath = (fixture: boolean): string =>
  resolve(
    docsReportDir(),
    fixture
      ? "llm-model-comparison.data.json"
      : "llm-model-comparison.real.data.json",
  );

const readComparison = async (
  path: string,
): Promise<ComparisonResult | null> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ComparisonResult;
  } catch {
    return null;
  }
};

export const runSplitTopic = async (group: ProbeGroup): Promise<void> => {
  const spec = GROUP_SPECS[group];
  const fixture = hasArg("--fixture");
  const estimateOnly = hasArg("--estimate");

  if (estimateOnly) {
    process.stdout.write(
      `research ${group}: projection of the shared compare sweep — 0 incremental API calls, $0.00. ` +
        `Run 'npm run compare -- --estimate' for the underlying sweep cost.\n`,
    );
    return;
  }

  const sourcePath = compareArtifactPath(fixture);
  const comparison = await readComparison(sourcePath);
  if (comparison === null) {
    process.stderr.write(
      `research ${group}: no compare artifact at ${basename(sourcePath)}; ` +
        `run '${fixture ? "npm run compare:fixture" : "npm run compare"}' first\n`,
    );
    process.exitCode = 1;
    return;
  }

  const artifact = projectComparison(comparison, group, basename(sourcePath));
  // For a snapshot-mode topic the full trial report lives at the metadata's
  // report path (the sidebar page is the renderer-produced snapshot); the data
  // artifact keeps its canonical name either way.
  const topic = findPublishedResearchTopic(group);
  const canonicalMd =
    topic === undefined
      ? resolve(docsReportDir(), `${spec.artifactBase}.md`)
      : resolve(process.cwd(), "../..", reportFrameSources(topic).source);
  const reportPath = fixture
    ? resolve(docsReportDir(), `${spec.artifactBase}.fixture.md`)
    : canonicalMd;
  const artifactPath = fixture
    ? resolve(docsReportDir(), `${spec.artifactBase}.fixture.data.json`)
    : resolve(docsReportDir(), `${spec.artifactBase}.data.json`);
  const rendered = { ...artifact, artifactPath: basename(artifactPath) };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderSplitReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `research ${group}: projected ${artifact.configs.length} configuration(s) from ${basename(sourcePath)}\n` +
      `wrote ${reportPath}\nwrote ${artifactPath}\n`,
  );
};

const parseGroup = (): ProbeGroup => {
  const value = argValue("--group");
  if (value === "speed" || value === "accuracy") return value;
  throw new Error("run-split-topic requires --group speed|accuracy");
};

if (isDirectRun(import.meta.url)) {
  runSplitTopic(parseGroup()).catch((error: unknown) => {
    process.stderr.write(`split topic failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

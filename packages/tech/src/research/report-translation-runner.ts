import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import {
  estimateTranslation,
  translateInsights,
  TRANSLATION_API_MODEL_ID,
  type TranslateInput,
} from "./domain/translate";
import {
  findPublishedResearchTopic,
  reportFrameSources,
  type ResearchSiteTopic,
} from "./domain/site";
import { selectTranslationClient } from "./translation-client";
import { splitFrontmatter } from "./translate-runner";

const repoRoot = (): string => resolve(process.cwd(), "../..");

const repoPath = (path: string): string => resolve(repoRoot(), path);

const execFileAsync = promisify(execFile);

const currentCommit = async (): Promise<string> => {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--short", "HEAD"],
      { cwd: repoRoot() },
    );
    return stdout.trim() || "uncommitted";
  } catch {
    return "uncommitted";
  }
};

const trialsFrom = (frontmatter: ReadonlyMap<string, string>): number => {
  const raw = frontmatter.get("trials");
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildInput = (
  topic: ResearchSiteTopic,
  englishMarkdown: string,
  sourceCommit: string,
): TranslateInput => {
  const { frontmatter, body } = splitFrontmatter(englishMarkdown);
  return {
    topicId: topic.id,
    // Published pages carry the sidebar label as title and H1 by policy.
    title: topic.japanese.text,
    englishBody: body,
    sourceInsights: reportFrameSources(topic).source.replace(
      /^docs\/research-reports\//,
      "",
    ),
    sourceArtifact: topic.dataPath ?? topic.source.docsPath,
    sourceCommit: frontmatter.get("source_commit") ?? sourceCommit,
    insightsModel: frontmatter.get("insights_model") ?? "source-report",
    trials: trialsFrom(frontmatter),
  };
};

export type ReportTranslationOptions = Readonly<{
  topicId: string;
  mode: "real" | "estimate";
  generatedAt: string;
  /**
   * Deliberate opt-in to the deterministic stub when no API key is set. Absent,
   * a keyless `real` run refuses rather than overwriting the Japanese page.
   */
  allowFixture?: boolean;
}>;

export const runReportTranslation = async (
  options: ReportTranslationOptions,
): Promise<void> => {
  const topic = findPublishedResearchTopic(options.topicId);
  if (topic === undefined) {
    throw new Error(`unknown published research topic: ${options.topicId}`);
  }
  // Translate the full trial report; for a snapshot topic that is the report
  // path, not the sidebar snapshot.
  const input = buildInput(
    topic,
    await readFile(repoPath(reportFrameSources(topic).source), "utf8"),
    await currentCommit(),
  );
  if (options.mode === "estimate") {
    const estimate = estimateTranslation(input);
    process.stdout.write(
      `research ${topic.id}: full-report translation estimate — ${estimate.calls} call, ` +
        `~${estimate.promptTokens} prompt + ~${estimate.outputTokens} output tokens ` +
        `(model ${TRANSLATION_API_MODEL_ID})\n`,
    );
    return;
  }

  // Selected BEFORE the write, and it throws rather than substituting a stub:
  // the page below is a published article, not a scratch file.
  const client = selectTranslationClient({
    target: topic.japanese.docsPath,
    allowFixture: options.allowFixture ?? false,
  });
  const report = await translateInsights({
    client,
    input,
    generatedAt: options.generatedAt,
  });
  await mkdir(dirname(repoPath(topic.japanese.docsPath)), { recursive: true });
  await writeFile(repoPath(topic.japanese.docsPath), report.markdown, "utf8");
  if (report.missingNumbers.length > 0) {
    process.stderr.write(
      `[research ${topic.id}] full-report translation warning: ` +
        `${report.missingNumbers.length} figure(s) missing from the Japanese report: ` +
        `${report.missingNumbers.join(", ")}\n`,
    );
  }
  process.stdout.write(
    `research ${topic.id}: wrote ${topic.japanese.docsPath} (model ${report.provenance.translation_model})\n`,
  );
};

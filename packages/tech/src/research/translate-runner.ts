import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { TopicSpec } from "./domain/topic";
import {
  estimateTranslation,
  translateInsights,
  TRANSLATION_API_MODEL_ID,
  type TranslateInput,
} from "./domain/translate";
import { selectTranslationClient } from "./translation-client";
import { findPublishedResearchTopic } from "./domain/site";

/**
 * Effectful glue for the translation pipeline stage: read a topic's English
 * insights, translate the prose into Japanese through the fixed translation
 * model, and write it beside the insights. The domain (`domain/translate.ts`)
 * stays pure; provider access lives here. Translation is real-run, owner-gated:
 * a keyless run refuses rather than writing the deterministic stub over the
 * page (`translation-client.ts`), unless the caller opts into the stub.
 */

const docsReportDir = (): string =>
  resolve(process.cwd(), "../../docs/research-reports");

const insightsPathFor = (spec: TopicSpec): string =>
  resolve(docsReportDir(), `${spec.artifactBase}.insights.md`);

const translationPathFor = (spec: TopicSpec): string =>
  resolve(docsReportDir(), `${spec.artifactBase}.insights.ja.md`);

/** Split a `---`-delimited YAML frontmatter block from the markdown body. A
 * document without frontmatter yields empty frontmatter and the whole text as
 * body. Only the simple `key: value` lines this pipeline writes are parsed. */
export const splitFrontmatter = (
  markdown: string,
): Readonly<{ frontmatter: ReadonlyMap<string, string>; body: string }> => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match === null) {
    return { frontmatter: new Map(), body: markdown };
  }
  const [, block = "", rest = ""] = match;
  const frontmatter = new Map<string, string>();
  for (const line of block.split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv === null) continue;
    const [, key = "", rawValue = ""] = kv;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter.set(key, value);
  }
  return { frontmatter, body: rest.trim() };
};

const trialsFrom = (frontmatter: ReadonlyMap<string, string>): number => {
  const raw = frontmatter.get("trials");
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildInput = (
  spec: TopicSpec,
  insightsMarkdown: string,
): TranslateInput => {
  const { frontmatter, body } = splitFrontmatter(insightsMarkdown);
  // A published page must carry its sidebar label as title and H1; an internal
  // topic (not in publishedResearchTopics) keeps the translated heading.
  const published = findPublishedResearchTopic(spec.id);
  return {
    topicId: spec.id,
    ...(published === undefined ? {} : { title: published.japanese.text }),
    englishBody: body,
    sourceInsights: `${spec.artifactBase}.insights.md`,
    sourceArtifact:
      frontmatter.get("source_artifact") ?? `${spec.artifactBase}.data.json`,
    sourceCommit: frontmatter.get("source_commit") ?? "uncommitted",
    insightsModel: frontmatter.get("insights_model") ?? "unknown",
    trials: trialsFrom(frontmatter),
  };
};

export type TranslationStageOptions = Readonly<{
  spec: TopicSpec;
  mode: "real" | "estimate";
  generatedAt: string;
  /**
   * Deliberate opt-in to the deterministic stub when no API key is set. Absent,
   * a keyless `real` run refuses rather than overwriting the Japanese page.
   */
  allowFixture?: boolean;
}>;

/**
 * Run (or price) the translation stage for one topic. Reads the English
 * insights file; if it is missing, reports that insights must run first rather
 * than fabricating input.
 */
export const runTranslationStage = async (
  options: TranslationStageOptions,
): Promise<void> => {
  const { spec, mode, generatedAt } = options;
  let insightsMarkdown: string;
  try {
    insightsMarkdown = await readFile(insightsPathFor(spec), "utf8");
  } catch {
    process.stdout.write(
      `research ${spec.id}: translation skipped — no ${spec.artifactBase}.insights.md (run insights first)\n`,
    );
    return;
  }
  const input = buildInput(spec, insightsMarkdown);

  if (mode === "estimate") {
    const estimate = estimateTranslation(input);
    process.stdout.write(
      `research ${spec.id}: translation estimate — ${estimate.calls} call, ` +
        `~${estimate.promptTokens} prompt + ~${estimate.outputTokens} output tokens ` +
        `(model ${TRANSLATION_API_MODEL_ID})\n`,
    );
    return;
  }

  // Translate, and if the numeric-preservation check flags missing figures,
  // retry once (LLM output is non-deterministic, so a second pass usually
  // preserves them). If a figure is still missing after the retry, warn loudly
  // on stderr rather than halting the whole batch — the operator can review the
  // one flagged file, and the rest of the site still generates.
  const client = selectTranslationClient({
    target: `${spec.artifactBase}.insights.ja.md`,
    allowFixture: options.allowFixture ?? false,
  });
  let report = await translateInsights({ client, input, generatedAt });
  if (report.missingNumbers.length > 0) {
    report = await translateInsights({ client, input, generatedAt });
  }
  await writeFile(translationPathFor(spec), report.markdown, "utf8");
  if (report.missingNumbers.length > 0) {
    process.stderr.write(
      `[research ${spec.id}] translation warning: ${report.missingNumbers.length} figure(s) ` +
        `not found verbatim in the Japanese version after a retry: ${report.missingNumbers.join(", ")}. ` +
        `Wrote ${spec.artifactBase}.insights.ja.md anyway — review these figures.\n`,
    );
  }
  process.stdout.write(
    `research ${spec.id}: wrote ${spec.artifactBase}.insights.ja.md (model ${report.provenance.translation_model})\n`,
  );
};

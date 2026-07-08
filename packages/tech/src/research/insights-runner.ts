import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { TopicSpec } from "./domain/topic";
import {
  estimateInsights,
  generateInsights,
  INSIGHTS_API_MODEL_ID,
  type InsightsInput,
} from "./domain/insights";
import type { LlmClient } from "../vendors/llm/types";
import { createFixtureInsightsClient } from "../vendors/llm/fixture";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";

/**
 * Effectful glue for the insights pipeline stage: read a topic's data artifact,
 * generate the English insights report through the fixed insights model, and
 * write it beside the report. Model selection and provider access live here (the
 * ACL boundary); the domain (`domain/insights.ts`) stays pure. Insights are a
 * real-run, owner-gated artifact — a keyless run falls back to the deterministic
 * fixture stub, clearly labelled, rather than a live call.
 */
const INSIGHTS_KEY_ENV = "ANTHROPIC_API_KEY";

const docsReportDir = (): string =>
  resolve(process.cwd(), "../../docs/research-reports");

const artifactPathFor = (spec: TopicSpec): string =>
  resolve(docsReportDir(), `${spec.artifactBase}.data.json`);

const insightsPathFor = (spec: TopicSpec): string =>
  resolve(docsReportDir(), `${spec.artifactBase}.insights.md`);

const readArtifact = async (path: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return null;
  }
};

/** Best-effort current commit for provenance; "uncommitted" when unavailable. */
const currentCommit = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
  } catch {
    return "uncommitted";
  }
};

/** Pull a trial count out of a data artifact if it exposes one. */
const trialsOf = (artifact: unknown): number | undefined => {
  if (artifact !== null && typeof artifact === "object") {
    const value = (artifact as Record<string, unknown>).trials;
    if (typeof value === "number") return value;
  }
  return undefined;
};

/**
 * Topic-specific guardrails for the insights prompt. Availability is a manual
 * health-probe observation over a limited window, so its insights must not read
 * as an assertive uptime ranking or SLA claim — the observation-policy caveat,
 * carried into the interpretation layer.
 */
const TOPIC_GUIDANCE: Readonly<Record<string, string>> = {
  availability:
    "These figures are a manual health-probe observation over a limited, " +
    "explicitly-bounded window and sample count — NOT a scheduled uptime " +
    "measurement or SLA. Do not produce an assertive availability ranking or " +
    "claim one provider is 'more reliable'. Describe the observation window, " +
    "sample sizes, and their limits, and keep every statement observational.",
};

const buildInput = (spec: TopicSpec, artifact: unknown): InsightsInput => ({
  topicId: spec.id,
  topicTitle: spec.title,
  sourceArtifact: `${spec.artifactBase}.data.json`,
  sourceCommit: currentCommit(),
  trials: trialsOf(artifact),
  dataArtifact: artifact,
  guidance: TOPIC_GUIDANCE[spec.id],
});

/** The live insights client, or the deterministic stub when no key is set. */
const insightsClient = (): LlmClient => {
  const key = process.env[INSIGHTS_KEY_ENV];
  if (!key) return createFixtureInsightsClient();
  const completion = createAnthropicCompletionClient(
    INSIGHTS_API_MODEL_ID,
    key,
  );
  return {
    model: completion.model,
    generateAnswer: (prompt) =>
      completion.complete(prompt).then((result) => result.text),
  };
};

export type InsightsStageOptions = Readonly<{
  spec: TopicSpec;
  /** "real" writes the file; "estimate" only prints the projected cost. */
  mode: "real" | "estimate";
  generatedAt: string;
}>;

/**
 * Run (or price) the insights stage for one topic. Reads the canonical data
 * artifact under docs/research-reports; if it is missing, reports that the
 * benchmark must run first rather than fabricating input.
 */
export const runInsightsStage = async (
  options: InsightsStageOptions,
): Promise<void> => {
  const { spec, mode, generatedAt } = options;
  const artifact = await readArtifact(artifactPathFor(spec));
  if (artifact === null) {
    process.stdout.write(
      `research ${spec.id}: insights skipped — no data artifact at ${spec.artifactBase}.data.json (run the benchmark first)\n`,
    );
    return;
  }
  const input = buildInput(spec, artifact);

  if (mode === "estimate") {
    const estimate = estimateInsights(input);
    process.stdout.write(
      `research ${spec.id}: insights estimate — ${estimate.calls} call, ` +
        `~${estimate.promptTokens} prompt + ~${estimate.outputTokens} output tokens ` +
        `(model ${INSIGHTS_API_MODEL_ID})\n`,
    );
    return;
  }

  const report = await generateInsights({
    client: insightsClient(),
    input,
    generatedAt,
  });
  const outPath = insightsPathFor(spec);
  await writeFile(outPath, report.markdown, "utf8");
  process.stdout.write(
    `research ${spec.id}: wrote ${spec.artifactBase}.insights.md (model ${report.provenance.insights_model})\n`,
  );
};

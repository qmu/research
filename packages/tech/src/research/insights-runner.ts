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

const insightsPathFor = (spec: TopicSpec): string =>
  resolve(docsReportDir(), `${spec.artifactBase}.insights.md`);

/**
 * The data artifact to interpret. On a real run the benchmark writes a
 * `.real.data.json` (gitignored, non-deterministic) that must be preferred over
 * the committed keyless fixture — insights must interpret the real numbers, not
 * the placeholder fixture. On the estimate/fixture path (or when no real
 * artifact exists, e.g. a deterministic catalog) the canonical artifact is used.
 * Returns the parsed artifact and the basename it came from (for provenance).
 */
const resolveArtifact = async (
  spec: TopicSpec,
  mode: "real" | "estimate",
): Promise<Readonly<{ artifact: unknown; sourceBasename: string }> | null> => {
  const candidates =
    mode === "real"
      ? [
          `${spec.artifactBase}.real.data.json`,
          `${spec.artifactBase}.data.json`,
        ]
      : [`${spec.artifactBase}.data.json`];
  for (const basename of candidates) {
    try {
      const artifact = JSON.parse(
        await readFile(resolve(docsReportDir(), basename), "utf8"),
      ) as unknown;
      return { artifact, sourceBasename: basename };
    } catch {
      continue;
    }
  }
  return null;
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
 * Topic-specific guardrails for the insights prompt. Availability is a
 * longitudinal record built from each provider's OWN public status-page incident
 * history (LLM-extracted, accumulated); the uptime is DERIVED from those reported
 * incidents, weighted by impact. Insights must read as a summary of the
 * providers' own reports over the window — never our own uptime measurement, an
 * assertive ranking, or an SLA claim.
 */
const TOPIC_GUIDANCE: Readonly<Record<string, string>> = {
  availability:
    "These 30/90-day figures are DERIVED from each provider's OWN reported " +
    "status-page incident history (weighted by impact), accumulated over time — " +
    "NOT our own uptime measurement, a scheduled probe, or an SLA. Treat them as " +
    "a summary of what each provider reports about itself. Do not produce an " +
    "assertive availability ranking or claim one provider is 'more reliable'. " +
    "Note the as-of date and window, that derived uptime differs from a " +
    "provider's published SLA, that an unretrievable source is recorded honestly, " +
    "and keep every statement observational and sourced to the providers' reports.",
};

const buildInput = (
  spec: TopicSpec,
  artifact: unknown,
  sourceBasename: string,
): InsightsInput => ({
  topicId: spec.id,
  topicTitle: spec.title,
  sourceArtifact: sourceBasename,
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
  const resolved = await resolveArtifact(spec, mode);
  if (resolved === null) {
    process.stdout.write(
      `research ${spec.id}: insights skipped — no data artifact for ${spec.artifactBase} (run the benchmark first)\n`,
    );
    return;
  }
  const input = buildInput(spec, resolved.artifact, resolved.sourceBasename);

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

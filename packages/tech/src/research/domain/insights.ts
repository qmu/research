import type { LlmClient } from "../../vendors/llm/types";

/**
 * The insights pipeline stage: turn a topic's deterministic data artifact into
 * an analytical English overview an LLM writes. Benchmarks answer "what are the
 * numbers"; insights answer "what do the numbers mean for a selection decision"
 * — a layer the template reports lack.
 *
 * Everything here is pure except `generateInsights`, which makes the single LLM
 * call through the provider-neutral `LlmClient` port. The generated text is
 * non-deterministic and key-gated, so insights are a real-run, owner-gated,
 * regenerable artifact and never part of the keyless byte-stable fixture (the
 * pipeline keeps this stage off the fixture path). `insightsFixtureBody` gives a
 * deterministic stub for tests and keyless demonstrations, clearly labelled so
 * it is never mistaken for real analysis.
 *
 * Provenance is mandatory: every insights report records the source artifact,
 * the source commit, the generating model, the timestamp, and the trial count,
 * so a reader can trace each interpretation back to the exact measurements it
 * rests on.
 */

/** The model that writes insights. Fixed (not the model under test) so the
 * interpretation layer is consistent across topics and reproducible from
 * provenance. */
export const INSIGHTS_MODEL_ID = "anthropic-claude-sonnet-5";
export const INSIGHTS_API_MODEL_ID = "claude-sonnet-5";

/** Rough output budget for one insights overview; used by the cost estimate. */
export const INSIGHTS_OUTPUT_TOKENS = 700;

export type InsightsInput = Readonly<{
  /** Topic id (e.g. "rag", "speed"). */
  topicId: string;
  /** Human-readable topic description. */
  topicTitle: string;
  /** Base filename of the source data artifact (e.g. "rag-benchmark.data.json"). */
  sourceArtifact: string;
  /** Git commit the artifact was produced at, when known. */
  sourceCommit?: string;
  /** Trial count behind the measurements, when the artifact reports one. */
  trials?: number;
  /** The parsed data artifact — embedded verbatim so the model reads real numbers. */
  dataArtifact: unknown;
}>;

export type InsightsProvenance = Readonly<{
  source_artifact: string;
  source_commit: string;
  insights_model: string;
  generated_at: string;
  trials: number;
  provenance: "llm-insights";
}>;

export type InsightsReport = Readonly<{
  markdown: string;
  provenance: InsightsProvenance;
}>;

const ROUGH_CHARS_PER_TOKEN = 4;

/** Deterministic JSON serialization of the artifact for the prompt (stable key
 * order via JSON.stringify's insertion order is not guaranteed across arbitrary
 * inputs, but the artifacts we feed are produced deterministically). */
const serializeArtifact = (artifact: unknown): string =>
  JSON.stringify(artifact, null, 2);

/**
 * Build the insights prompt (pure). Instructs the model to ground every
 * statement in the artifact's numbers, to separate observation from judgement,
 * and never to invent figures — the objective-documentation policy in prompt
 * form.
 */
export const buildInsightsPrompt = (input: InsightsInput): string => {
  const artifactJson = serializeArtifact(input.dataArtifact);
  return [
    `You are writing an analytical overview for a public, reproducible research`,
    `report comparing LLM/infrastructure options on the topic: ${input.topicTitle}.`,
    ``,
    `Below is the complete measurement artifact (JSON) for this topic. Every`,
    `number you cite MUST come from this artifact — do not invent, round`,
    `misleadingly, or extrapolate figures that are not present. Where the`,
    `artifact marks a value as an error, a cap ("&ge; N"), fixtured, or`,
    `not-measured, describe it as such and never present it as a measured maximum.`,
    ``,
    `Write 3–6 short paragraphs of English prose that help a reader make a`,
    `selection decision:`,
    `- Lead with the most decision-relevant finding.`,
    `- Separate observation ("X measured Y") from judgement ("which suggests Z").`,
    `- Name the trade-offs the numbers reveal (speed vs cost, accuracy vs`,
    `  latency, managed vs self-managed, …) grounded in the artifact.`,
    `- Note the measurement's limits: trial count, intervals, provenance.`,
    `Do not output a table (the report already tabulates the data). Do not`,
    `restate the raw numbers exhaustively — interpret them.`,
    ``,
    `Trial count behind these measurements: ${input.trials ?? "unspecified"}.`,
    ``,
    `Measurement artifact:`,
    "```json",
    artifactJson,
    "```",
  ].join("\n");
};

// A plain YAML scalar needs quoting only when it contains a `: ` or ` #`
// sequence (the flow indicators), starts with a YAML indicator character, or
// has leading/trailing whitespace. An ISO timestamp's bare colons are safe.
const YAML_NEEDS_QUOTE = /: | #|^[\s"'`>|&*!?%@#{}[\],-]|\s$/;

const yamlString = (value: string): string =>
  YAML_NEEDS_QUOTE.test(value) ? JSON.stringify(value) : value;

/** Assemble the insights markdown: provenance frontmatter + body (pure). */
export const renderInsightsMarkdown = (
  body: string,
  provenance: InsightsProvenance,
): string => {
  const frontmatter = [
    "---",
    `source_artifact: ${yamlString(provenance.source_artifact)}`,
    `source_commit: ${yamlString(provenance.source_commit)}`,
    `insights_model: ${yamlString(provenance.insights_model)}`,
    `generated_at: ${yamlString(provenance.generated_at)}`,
    `trials: ${provenance.trials}`,
    `provenance: ${provenance.provenance}`,
    "---",
    "",
  ].join("\n");
  return `${frontmatter}${body.trim()}\n`;
};

/** Every provenance field must be present and non-empty (trials may be 0 for a
 * non-benchmark topic, but the field is still required). Throws otherwise. */
export const assertInsightsProvenance = (
  provenance: InsightsProvenance,
): void => {
  const required: ReadonlyArray<keyof InsightsProvenance> = [
    "source_artifact",
    "insights_model",
    "generated_at",
    "provenance",
  ];
  for (const key of required) {
    if (
      provenance[key] === undefined ||
      String(provenance[key]).trim() === ""
    ) {
      throw new Error(`insights provenance missing required field: ${key}`);
    }
  }
};

/**
 * A deterministic, clearly-labelled insights stub for tests and keyless demos.
 * It states only structural facts drawn from provenance-level inputs (topic,
 * source artifact, trials) — never fabricated analysis — so it can never be
 * mistaken for a real reading.
 */
export const insightsFixtureBody = (input: InsightsInput): string =>
  [
    `_Fixtured insights stub — deterministic placeholder, not a real analysis._`,
    ``,
    `This is the ${input.topicId} topic (${input.topicTitle}). A real insights`,
    `run replaces this text with an LLM-written interpretation of`,
    `\`${input.sourceArtifact}\` (${input.trials ?? "unspecified"} trial(s)).`,
  ].join("\n");

export type GenerateInsightsParams = Readonly<{
  client: LlmClient;
  input: InsightsInput;
  /** Timestamp for provenance; passed in so fixture/tests stay deterministic. */
  generatedAt: string;
}>;

/**
 * Generate an insights report: build the prompt, call the model once, and wrap
 * the response with validated provenance. The only side effect is the model
 * call via the provider-neutral port.
 */
export const generateInsights = async (
  params: GenerateInsightsParams,
): Promise<InsightsReport> => {
  const { client, input, generatedAt } = params;
  const prompt = buildInsightsPrompt(input);
  const body = await client.generateAnswer(prompt);
  const provenance: InsightsProvenance = {
    source_artifact: input.sourceArtifact,
    source_commit: input.sourceCommit ?? "uncommitted",
    insights_model: client.model,
    generated_at: generatedAt,
    trials: input.trials ?? 0,
    provenance: "llm-insights",
  };
  assertInsightsProvenance(provenance);
  return { markdown: renderInsightsMarkdown(body, provenance), provenance };
};

export type InsightsEstimate = Readonly<{
  calls: number;
  promptTokens: number;
  outputTokens: number;
}>;

/** One call per topic; prompt tokens estimated from the serialized artifact. */
export const estimateInsights = (input: InsightsInput): InsightsEstimate => {
  const prompt = buildInsightsPrompt(input);
  return {
    calls: 1,
    promptTokens: Math.ceil(prompt.length / ROUGH_CHARS_PER_TOKEN),
    outputTokens: INSIGHTS_OUTPUT_TOKENS,
  };
};

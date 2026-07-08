import type { LlmClient } from "../../vendors/llm/types";

/**
 * The translation pipeline stage: render a topic's English insights into
 * Japanese. The English insights are the source of truth; the Japanese version
 * is a faithful translation that must NOT change any number, proper noun, or
 * provenance value — only the prose language. Numeric fidelity is checked
 * mechanically (`verifyNumbersPreserved`): every number in the English source
 * must appear verbatim in the translation, or the stage fails rather than ship a
 * translation that silently altered a measurement.
 *
 * Like insights, translation is LLM-generated — non-deterministic, key-gated —
 * so it is a real-run, owner-gated, regenerable artifact and never part of the
 * keyless byte-stable fixture. Everything here is pure except
 * `translateInsights`, which makes the single model call.
 */

export const TRANSLATION_MODEL_ID = "anthropic-claude-sonnet-5";
export const TRANSLATION_API_MODEL_ID = "claude-sonnet-5";

/** Rough output budget for one translated overview; used by the cost estimate. */
export const TRANSLATION_OUTPUT_TOKENS = 900;

const ROUGH_CHARS_PER_TOKEN = 4;

export type TranslateInput = Readonly<{
  topicId: string;
  /** The English insights body (prose only; frontmatter is re-derived). */
  englishBody: string;
  /** Base filename of the English insights this is translated from. */
  sourceInsights: string;
  /** Provenance carried over from the English insights, unchanged. */
  sourceArtifact: string;
  sourceCommit: string;
  insightsModel: string;
  trials: number;
}>;

export type TranslationProvenance = Readonly<{
  source_artifact: string;
  source_commit: string;
  insights_model: string;
  translated_from: string;
  translation_model: string;
  generated_at: string;
  trials: number;
  provenance: "llm-translation";
}>;

export type TranslationReport = Readonly<{
  markdown: string;
  provenance: TranslationProvenance;
  /** Numbers present in the English source but missing from the translation. */
  missingNumbers: ReadonlyArray<string>;
}>;

/**
 * Extract numeric tokens from text for the preservation check. Matches integers
 * and decimals with optional grouping commas, sign, and percent — the forms a
 * measurement number takes (e.g. "0.42", "1,536", "-3", "95%"). Deduplicated,
 * order preserved.
 */
export const extractNumbers = (text: string): ReadonlyArray<string> => {
  const matches = text.match(/-?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  return [...new Set(matches)];
};

/**
 * Every number in the English source must appear verbatim in the translation.
 * Returns the numbers that are missing (empty ⇒ fully preserved). A percent form
 * is considered preserved if either the "N%" or the bare "N" appears, since a
 * translator may render "95%" as "95 パーセント".
 */
export const verifyNumbersPreserved = (
  englishBody: string,
  translated: string,
): ReadonlyArray<string> => {
  const sourceNumbers = extractNumbers(englishBody);
  return sourceNumbers.filter((number) => {
    if (translated.includes(number)) return false;
    if (number.endsWith("%")) {
      return !translated.includes(number.slice(0, -1));
    }
    return true;
  });
};

/**
 * Build the translation prompt (pure). Passes the English body and the explicit
 * list of numbers that must survive unchanged, so the model is told exactly what
 * to preserve rather than left to infer it.
 */
export const buildTranslationPrompt = (input: TranslateInput): string => {
  const numbers = extractNumbers(input.englishBody);
  return [
    `Translate the following English research-insights prose into natural,`,
    `readable Japanese (日本語). This is for the ${input.topicId} topic of a`,
    `public LLM/infrastructure comparison.`,
    ``,
    `Rules:`,
    `- Preserve EVERY number exactly as written — do not convert units, round,`,
    `  or re-localise digits. The numbers that MUST appear unchanged are:`,
    `  ${numbers.join(", ") || "(none)"}.`,
    `- Preserve proper nouns and model/product names (e.g. "Claude Sonnet 5",`,
    `  "sqlite-vec", "AutoRAG") in their original form.`,
    `- Translate only the prose; do not add, drop, or reinterpret any claim.`,
    `- Output Japanese prose only — no frontmatter, no code fences.`,
    ``,
    `English insights:`,
    input.englishBody.trim(),
  ].join("\n");
};

const YAML_NEEDS_QUOTE = /: | #|^[\s"'`>|&*!?%@#{}[\],-]|\s$/;

const yamlString = (value: string): string =>
  YAML_NEEDS_QUOTE.test(value) ? JSON.stringify(value) : value;

/** Assemble the translation markdown: provenance frontmatter + Japanese body. */
export const renderTranslationMarkdown = (
  body: string,
  provenance: TranslationProvenance,
): string => {
  const frontmatter = [
    "---",
    `source_artifact: ${yamlString(provenance.source_artifact)}`,
    `source_commit: ${yamlString(provenance.source_commit)}`,
    `insights_model: ${yamlString(provenance.insights_model)}`,
    `translated_from: ${yamlString(provenance.translated_from)}`,
    `translation_model: ${yamlString(provenance.translation_model)}`,
    `generated_at: ${yamlString(provenance.generated_at)}`,
    `trials: ${provenance.trials}`,
    `provenance: ${provenance.provenance}`,
    "---",
    "",
  ].join("\n");
  return `${frontmatter}${body.trim()}\n`;
};

export type TranslateParams = Readonly<{
  client: LlmClient;
  input: TranslateInput;
  generatedAt: string;
}>;

/**
 * Translate the English insights to Japanese and wrap with provenance. Runs the
 * numeric-preservation check on the result; a translation that dropped or
 * altered a number throws, so a silently-changed measurement can never ship.
 */
export const translateInsights = async (
  params: TranslateParams,
): Promise<TranslationReport> => {
  const { client, input, generatedAt } = params;
  const prompt = buildTranslationPrompt(input);
  const body = await client.generateAnswer(prompt);
  const missingNumbers = verifyNumbersPreserved(input.englishBody, body);
  if (missingNumbers.length > 0) {
    throw new Error(
      `translation dropped or altered number(s): ${missingNumbers.join(", ")} ` +
        `(the Japanese version must preserve every figure from ${input.sourceInsights})`,
    );
  }
  const provenance: TranslationProvenance = {
    source_artifact: input.sourceArtifact,
    source_commit: input.sourceCommit,
    insights_model: input.insightsModel,
    translated_from: input.sourceInsights,
    translation_model: client.model,
    generated_at: generatedAt,
    trials: input.trials,
    provenance: "llm-translation",
  };
  return {
    markdown: renderTranslationMarkdown(body, provenance),
    provenance,
    missingNumbers,
  };
};

export type TranslationEstimate = Readonly<{
  calls: number;
  promptTokens: number;
  outputTokens: number;
}>;

export const estimateTranslation = (
  input: TranslateInput,
): TranslationEstimate => {
  const prompt = buildTranslationPrompt(input);
  return {
    calls: 1,
    promptTokens: Math.ceil(prompt.length / ROUGH_CHARS_PER_TOKEN),
    outputTokens: TRANSLATION_OUTPUT_TOKENS,
  };
};

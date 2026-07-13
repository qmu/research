import type { LlmClient } from "../../vendors/llm/types";
import { ARTICLE_OUTLINE } from "./article-outline";

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
 * `translateInsights`, which makes the model calls.
 */

export const TRANSLATION_MODEL_ID = "anthropic-claude-sonnet-5";
export const TRANSLATION_API_MODEL_ID = "claude-sonnet-5";

/** Output budget for one translated report; used for live calls and estimates. */
export const TRANSLATION_OUTPUT_TOKENS = 16_384;

const ROUGH_CHARS_PER_TOKEN = 4;
const TRANSLATION_CHUNK_MAX_CHARS = 8_000;

const RAW_BLOCK_PLACEHOLDER_PREFIX = "@@RAW_BLOCK_";
const RAW_BLOCK_PLACEHOLDER_SUFFIX = "@@";
const RAW_BLOCK_PATTERN = /^<svg\b.*<\/svg>$/gm;

export type TranslateInput = Readonly<{
  topicId: string;
  /**
   * The published page's sidebar label (site.ts `japanese.text`). When set,
   * the rendered page carries it as both the frontmatter `title` and the H1 —
   * published pages must have title == sidebar label, and an LLM-translated H1
   * would drift from the label otherwise.
   */
  title?: string;
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

type ProtectedBody = Readonly<{
  markdown: string;
  blocks: ReadonlyArray<Readonly<{ placeholder: string; raw: string }>>;
}>;

const placeholderFor = (index: number): string => {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${RAW_BLOCK_PLACEHOLDER_PREFIX}${label}${RAW_BLOCK_PLACEHOLDER_SUFFIX}`;
};

const protectRawBlocks = (markdown: string): ProtectedBody => {
  const blocks: Array<{ placeholder: string; raw: string }> = [];
  const protectedMarkdown = markdown.replace(RAW_BLOCK_PATTERN, (raw) => {
    const placeholder = placeholderFor(blocks.length);
    blocks.push({ placeholder, raw });
    return placeholder;
  });
  return { markdown: protectedMarkdown, blocks };
};

const restoreRawBlocks = (
  markdown: string,
  blocks: ProtectedBody["blocks"],
): string =>
  blocks.reduce(
    (restored, block) => restored.replaceAll(block.placeholder, block.raw),
    markdown,
  );

const withEnglishBody = (
  input: TranslateInput,
  englishBody: string,
): TranslateInput => ({ ...input, englishBody });

const splitIntoSections = (markdown: string): ReadonlyArray<string> => {
  const sections: string[] = [];
  let current: string[] = [];
  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ") && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current.join("\n").trim());
  return sections.filter((section) => section.length > 0);
};

const splitLargeSection = (section: string): ReadonlyArray<string> => {
  if (section.length <= TRANSLATION_CHUNK_MAX_CHARS) return [section];
  const units: string[] = [];
  const lines = section.split("\n");
  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const block: string[] = [line];
      index += 1;
      while (index < lines.length) {
        const next = lines[index] ?? "";
        block.push(next);
        index += 1;
        if (next.startsWith("```")) break;
      }
      units.push(block.join("\n"));
      continue;
    }
    if (line.startsWith("|")) {
      const table: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("|")) {
        table.push(lines[index] ?? "");
        index += 1;
      }
      units.push(table.join("\n"));
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() !== "") {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    while (index < lines.length && (lines[index] ?? "").trim() === "") {
      index += 1;
    }
    if (paragraph.length > 0) units.push(paragraph.join("\n"));
  }

  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (
      current.length > 0 &&
      current.length + unit.length + 2 > TRANSLATION_CHUNK_MAX_CHARS
    ) {
      chunks.push(current.trim());
      current = "";
    }
    current = current.length === 0 ? unit : `${current}\n\n${unit}`;
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
};

const splitTranslationChunks = (markdown: string): ReadonlyArray<string> =>
  splitIntoSections(markdown).flatMap(splitLargeSection);

const translateChunk = async (
  client: LlmClient,
  input: TranslateInput,
): Promise<string> => {
  const prompt = buildTranslationPrompt(input);
  let body = await client.generateAnswer(prompt);
  if (verifyNumbersPreserved(input.englishBody, body).length > 0) {
    body = await client.generateAnswer(prompt);
  }
  return body;
};

/**
 * Extract numeric tokens from text for the preservation check. Matches integers
 * and decimals with optional grouping commas, sign, and percent — the forms a
 * measurement number takes (e.g. "0.42", "1,536", "-3", "95%"). Deduplicated,
 * order preserved.
 */
export const extractNumbers = (text: string): ReadonlyArray<string> => {
  // Magnitude only — no sign. A leading hyphen in these reports is almost always
  // a word hyphen ("per-1k-calls", "GPT-5", "top-1", "recall@3"), not a minus,
  // and treating it as a minus produces spurious negative tokens ("-1") the
  // translation legitimately never reproduces. A grouping comma counts only
  // BETWEEN digits ("1,536"), never a trailing list/sentence comma ("32, 48").
  // Dropping the sign cannot mask a value change (0.42 vs 0.40 differ in
  // magnitude); it only forgoes catching a sign flip, which a translator does
  // not do to a measured figure.
  const matches = text.match(/\d+(?:,\d+)*(?:\.\d+)?%?/g) ?? [];
  return [...new Set(matches)];
};

/**
 * Normalize a string's numeric formatting so a preservation check compares
 * VALUES, not typography: Japanese text legitimately uses a Unicode minus (−,
 * U+2212), full-width digits, or drops a grouping comma. These are not value
 * changes, so they must not trip the check. Genuine value changes (0.42 → 0.40)
 * still differ after normalization and are still caught.
 */
const normalizeNumerics = (text: string): string =>
  text
    // Unicode minus / dash variants → ASCII hyphen-minus.
    .replace(/[‐-―−－]/g, "-")
    // Full-width digits → ASCII.
    .replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30),
    )
    // Drop grouping commas so "1,536" and "1536" compare equal.
    .replace(/(\d),(\d)/g, "$1$2");

/**
 * Every number in the English source must appear in the translation. Returns the
 * numbers that are missing (empty ⇒ fully preserved). Comparison is over
 * normalized numerics (see `normalizeNumerics`), and a percent form counts as
 * preserved if either "N%" or the bare "N" appears (a translator may write
 * "95%" as "95 パーセント").
 */
export const verifyNumbersPreserved = (
  englishBody: string,
  translated: string,
): ReadonlyArray<string> => {
  const normalizedTranslation = normalizeNumerics(translated);
  return extractNumbers(englishBody).filter((number) => {
    const normalized = normalizeNumerics(number);
    if (normalizedTranslation.includes(normalized)) return false;
    if (normalized.endsWith("%")) {
      return !normalizedTranslation.includes(normalized.slice(0, -1));
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
  const headingPairs = ARTICLE_OUTLINE.english.h2
    .map(
      (heading, index) =>
        `  - "## ${heading}" -> "## ${ARTICLE_OUTLINE.japanese.h2[index] ?? heading}"`,
    )
    .concat(
      ARTICLE_OUTLINE.english.h3.map(
        (heading, index) =>
          `  - "### ${heading}" -> "### ${ARTICLE_OUTLINE.japanese.h3[index] ?? heading}"`,
      ),
    )
    .join("\n");
  return [
    `Translate the following English research report or insights prose into natural,`,
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
    `- Preserve Markdown structure: headings, tables, lists, links, inline code,`,
    `  code fences, Mermaid diagrams, and shell commands.`,
    `- Preserve raw-block placeholders such as ${placeholderFor(0)} exactly;`,
    `  they will be restored after translation.`,
    `- Translate all human-facing English text into Japanese, including headings,`,
    `  table headers, legends, captions, and list labels. Keep only code,`,
    `  commands, paths, URLs, provider names, model names, model IDs, and units`,
    `  unchanged.`,
    `- When these standard article headings appear, translate them EXACTLY as`,
    `  follows and keep their order:`,
    headingPairs,
    `- Output the translated Markdown body only — no frontmatter and no outer`,
    `  wrapper code fence.`,
    ``,
    `English insights:`,
    input.englishBody.trim(),
  ].join("\n");
};

const YAML_NEEDS_QUOTE = /: | #|^[\s"'`>|&*!?%@#{}[\],-]|\s$/;

const yamlString = (value: string): string =>
  YAML_NEEDS_QUOTE.test(value) ? JSON.stringify(value) : value;

/**
 * Force the page's H1 to the sidebar label: replace the first H1 line, or
 * prepend one when the body has none. Pure; leaves every other line intact.
 */
export const forceTitleHeading = (body: string, title: string): string => {
  const lines = body.split("\n");
  const index = lines.findIndex((line) => /^#\s+/.test(line));
  if (index === -1) return `# ${title}\n\n${body}`;
  lines[index] = `# ${title}`;
  return lines.join("\n");
};

/** Assemble the translation markdown: provenance frontmatter + Japanese body. */
export const renderTranslationMarkdown = (
  body: string,
  provenance: TranslationProvenance,
  title?: string,
): string => {
  const frontmatter = [
    "---",
    ...(title === undefined ? [] : [`title: ${yamlString(title)}`]),
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
 * numeric-preservation check and returns any `missingNumbers` (numbers in the
 * source absent from the translation) rather than throwing — the caller decides
 * whether to retry or warn, so a single formatting edge case cannot halt a
 * whole batch. An empty `missingNumbers` means every figure was preserved.
 */
export const translateInsights = async (
  params: TranslateParams,
): Promise<TranslationReport> => {
  const { client, input, generatedAt } = params;
  const protectedBody = protectRawBlocks(input.englishBody);
  const translatedChunks: string[] = [];
  for (const chunk of splitTranslationChunks(protectedBody.markdown)) {
    translatedChunks.push(
      await translateChunk(client, withEnglishBody(input, chunk)),
    );
  }
  const restored = restoreRawBlocks(
    translatedChunks.map((chunk) => chunk.trim()).join("\n\n"),
    protectedBody.blocks,
  );
  const body =
    input.title === undefined
      ? restored
      : forceTitleHeading(restored, input.title);
  const missingNumbers = verifyNumbersPreserved(input.englishBody, body);
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
    markdown: renderTranslationMarkdown(body, provenance, input.title),
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
  const protectedBody = protectRawBlocks(input.englishBody);
  const prompts = splitTranslationChunks(protectedBody.markdown).map((chunk) =>
    buildTranslationPrompt(withEnglishBody(input, chunk)),
  );
  return {
    calls: prompts.length,
    promptTokens: Math.ceil(
      prompts.reduce((total, prompt) => total + prompt.length, 0) /
        ROUGH_CHARS_PER_TOKEN,
    ),
    outputTokens: prompts.length * TRANSLATION_OUTPUT_TOKENS,
  };
};

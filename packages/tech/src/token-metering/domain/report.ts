import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import type {
  ClassErrorStat,
  FamilyMeasurement,
  TokenMeteringResult,
} from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number | undefined): string =>
  value === undefined ? "—" : `${value.toFixed(2)}%`;

const band = (stat: ClassErrorStat): string =>
  stat.holdoutCount === 0
    ? "—"
    : `[${stat.errorBandPct[0].toFixed(2)}%, ${stat.errorBandPct[1].toFixed(2)}%]`;

const usd = (value: number): string => `$${value.toFixed(4)}`;

const methodLabel = (family: FamilyMeasurement): string =>
  family.card.countingMethod === "exact-bpe"
    ? "exact self-BPE"
    : "calibrated estimator";

const measured = (
  result: TokenMeteringResult,
): ReadonlyArray<FamilyMeasurement> =>
  result.families.filter(
    (family) =>
      family.provenance === "measured" || family.provenance === "fixtured",
  );

const targetCell = (
  result: TokenMeteringResult,
  family: FamilyMeasurement,
): string =>
  family.withinTarget === undefined
    ? "—"
    : family.withinTarget
      ? `within ±${result.accuracyTargetPct}%`
      : `NOT within ±${result.accuracyTargetPct}% (band stated per class)`;

const overviewSection = (result: TokenMeteringResult): string => {
  const rows = measured(result);
  const counts = `This run has **${rows.length} ${result.fixture ? "fixtured" : "measured"}** of ${result.families.length} family rows (the rest are \`unreachable\` — missing credential or vocabulary — or \`error\`, never faked counts). Accuracy is judged on the ${result.samplesVersion} holdout half (15 samples: 5 English, 5 Japanese, 5 code) against each provider's API-reported count.`;
  if (rows.length === 0) {
    return `${counts}

There are no counted values to summarize; the per-family tables are in section 7, Verification Data.`;
  }
  const lines = rows.map(
    (family) =>
      `| ${escapeCell(family.card.familyName)} | ${methodLabel(family)} | ${pct(family.holdoutMeanAbsErrorPct)} | ${pct(family.holdoutMaxAbsErrorPct)} | ${targetCell(result, family)} |`,
  );
  return `${counts}

| Family | Self-count method | Holdout mean abs error | Holdout max abs error | ±${result.accuracyTargetPct}% target |
| ------ | ----------------- | ---------------------- | --------------------- | ------- |
${lines.join("\n")}

Errors compare the self-count's prediction of the provider-reported total (content tokens + fitted wrapper overhead) against that reported total. Per-class error bands, calibration parameters, and per-sample rows are in section 7, Verification Data.`;
};

const perClassTable = (family: FamilyMeasurement): string => {
  const header =
    "| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |\n" +
    "| ----- | --------- | -------------- | ------------- | ----------- | ------------- |";
  const rows = family.perClass.map(
    (stat) =>
      `| ${stat.class} | ${stat.holdoutCount} | ${pct(stat.meanAbsErrorPct)} | ${pct(stat.maxAbsErrorPct)} | ${band(stat)} | ${stat.holdoutCount === 0 ? "—" : stat.withinTarget ? "yes" : "no"} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const calibrationLine = (family: FamilyMeasurement): string => {
  const calibration = family.calibration;
  if (calibration === undefined) return "Calibration: not fitted (no data).";
  const rates = calibration.tokensPerChar;
  return `Calibration: wrapper overhead ${calibration.overheadTokens} tokens; tokens/char english ${rates.english.toFixed(4)}, japanese ${rates.japanese.toFixed(4)}, code ${rates.code.toFixed(4)} (estimator families predict with these; exact families report them as descriptive statistics).`;
};

const sampleTable = (family: FamilyMeasurement): string => {
  const header =
    "| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |\n" +
    "| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |";
  const rows = family.rows.map(
    (row) =>
      `| ${row.sampleId} | ${row.class} | ${row.role} | ${row.chars} | ${row.utf8Bytes} | ` +
      `${row.selfContentTokens ?? "—"} | ${row.apiTokens ?? "—"} | ${row.predictedTokens ?? "—"} | ` +
      `${row.errorPct === undefined ? "—" : `${row.errorPct.toFixed(2)}%`} | ${row.provenance}${row.error === undefined ? "" : ` (${escapeCell(row.error)})`} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const familyBlock = (family: FamilyMeasurement): string =>
  [
    `**${family.card.familyName}** (\`${family.card.apiModelId}\`, ${methodLabel(family)}, ground truth: ${family.card.groundTruth}, probe spend ${usd(family.spendUsd)})${family.error === undefined ? "" : ` — ${family.error}`}`,
    "",
    calibrationLine(family),
    "",
    perClassTable(family),
    "",
    sampleTable(family),
  ].join("\n");

const edgeProbeBlock = (result: TokenMeteringResult): string => {
  const probes = result.edgeProbes;
  const lines = [
    `- Anthropic tool-definition overhead (count_tokens with vs. without one tool): ${probes.anthropicToolOverheadTokens === undefined ? "not measured on this path" : `${probes.anthropicToolOverheadTokens} tokens`}`,
    `- Anthropic image tokens for a ${probes.imageWidth ?? "—"}×${probes.imageHeight ?? "—"} PNG (published formula width×height/750): ${probes.anthropicImageTokens === undefined ? "not measured on this path" : `${probes.anthropicImageTokens} tokens`}`,
    `- Gemini image tokens for the same PNG (documented 258 per image up to 384px): ${probes.googleImageTokens === undefined ? "not measured on this path" : `${probes.googleImageTokens} tokens`}`,
    ...(probes.notes ?? []).map((note) => `- ${note}`),
  ];
  return lines.join("\n");
};

const sourceLines = (result: TokenMeteringResult): string =>
  result.families
    .map(
      (family) =>
        `- **${escapeCell(family.card.familyName)}** (\`${family.card.id}\`, measured against \`${family.card.apiModelId}\`): ${family.card.vocabularyNote} Source: ${family.card.source} (verified ${family.card.lastVerified}).`,
    )
    .join("\n");

export const renderTokenMeteringReport = (
  result: TokenMeteringResult,
): string =>
  renderEnglishResearchArticle({
    title: "Token counting and metering",
    description:
      "A reproducible check of library-independent LLM input-token counting — exact self-implemented BPE where the vocabulary is published, calibrated estimation where it is not — validated against each provider's API-reported counts on a pinned English/Japanese/code sample set.",
    introduction: `This report measures whether the input tokens an LLM API bills for can be counted **without the provider's tokenizer library**. Where a provider publishes its tokenizer's vocabulary and merge rules (OpenAI's encodings; open-weight models' \`tokenizer.json\`), a self-implemented byte-pair-encoding counter is checked for exactness. Where the tokenizer is unpublished (Anthropic Claude, Google Gemini), a calibrated estimator is fitted against the provider's unbilled count endpoint and its error band is reported — an estimate with a stated band, never false precision. The distinction between the two counting methods, and the billing edge cases around them (Japanese text, output-token pre-estimation, cache/tool billing, image conversion), decide whether per-principal usage metering can be built provider-independently.`,
    purpose:
      "The purpose is to record, for four provider families, how input tokens are counted, under what conditions a library-independent self-count is possible, what accuracy it reaches against the API-reported count on a pinned sample set, and what the price structure applies those counts to — the properties a usage-metering and cost-attribution layer is built on.",
    targetModels: `The subjects are the ${result.families.length} provider families in the curated registry (\`packages/tech/src/token-metering/models.ts\`), one representative model each, with the counting method dictated by what the provider publishes:

${sourceLines(result)}`,
    targetMetrics: `The primary metrics are the holdout mean and max absolute error (%) of the self-count's prediction against the API-reported token count — lower is better, with the agreed target |error| ≤ ${result.accuracyTargetPct}% per class — plus the signed error band [min, max] per class. Descriptive metrics: fitted wrapper overhead (tokens per request), per-class tokens-per-character rates, and probe spend (USD, reference). Prices for cost derivation are the published per-MTok rates from the foundation-models catalog.`,
    scopeAndConstraints: `- **Input tokens only.** Output tokens cannot be counted before a run (the model decides when to stop); their pre-estimation semantics are analyzed in section 5 as an edge case, and their post-run accounting reads the response's usage field.
- **Counting, not billing reconciliation.** The check compares token counts; invoice-level reconciliation (rounding, minimums, tier discounts) is out of scope.
- **One representative model per family.** Counts are validated against \`claude-sonnet-5\`, \`gpt-5.5\`, \`gemini-3.1-pro-preview\`, and \`@cf/qwen/qwen2.5-coder-32b-instruct\`; other models in a family may use other tokenizers and MUST be re-validated before the calibration is reused.
- **The sample manifest is pinned** (${result.samplesVersion}: 30 samples, 10 per class, half calibration / half holdout). Accuracy claims hold for these classes and lengths; other content classes (e.g. base64 blobs, dense Unicode art) are unvalidated.
- **Wrapper overhead is fitted, not documented.** Providers do not publish their chat-template token cost; the affine model absorbs it as a fitted constant, which assumes the single-user-message request shape used here.
- The keyless fixture path is deterministic and clearly synthetic (byte-count vocabulary, fixed rates); real error numbers appear only from an owner-triggered real run within the approved cost ceiling (run \`--estimate\` first).
- Point-in-time: measured behavior reflects the providers' tokenizers and count endpoints at \`${result.generatedAt}\`; vocabularies and prices are as of each row's source and verification date.`,
    verificationResults: overviewSection(result),
    analysis: `${
      measured(result).length > 0 && !result.fixture
        ? "Families with `measured` provenance can be compared on holdout error: the exact-BPE families test whether the published vocabulary plus the published pre-tokenization pattern reproduce the billed count, and the estimator families test how far a per-class characters-per-token model can be trusted. A max error inside the target band means pre-call cost projection and per-principal attribution can run on the self-count alone; a class outside the band must be metered post-hoc from the response usage field, with the band stating the projection risk."
        : "This run is the keyless fixture: counts prove the harness (synthetic vocabulary, fixed rates), so no cross-family accuracy claim is made here. The dated survey frames carry the measured comparison."
    }

#### Edge case 1 — Japanese text

Japanese tokenizes at several times the per-character token rate of English (see the per-class tokens-per-character rates in section 7): vocabularies are latin-dominated, so many kanji fall back toward byte pieces. Cost projection that assumes English rates underestimates Japanese inputs; the per-class rates in the calibration are the correction, and the Japanese holdout band states how far they can be trusted.

#### Edge case 2 — Output tokens cannot be pre-counted

Two different quantities must not be conflated: the **pre-run estimate** (the model decides when to stop, so only bounds exist — the request's max-tokens cap is the hard ceiling, and a historical output/input ratio per workload gives an expected value) and the **post-run account** (exact, from the response's usage field: output tokens, and reasoning tokens where the provider bills them as output). A metering layer stores the post-run account and uses the pre-run bound only for quota admission, never for billing.

#### Edge case 3 — Cache and tool-use billing

Cached and tool-bearing requests bill the same token counts at different rates, so a meter must keep the usage breakdown, not one number. Prompt-cache writes bill above the base input rate and cache reads bill at a small fraction of it (each provider publishes its own multipliers and minimum cacheable lengths); the response usage field reports cache-write and cache-read tokens separately, and a meter must price each bucket at its own rate. Tool definitions are serialized into the prompt and bill as ordinary input tokens — the measured overhead of one tool definition on the Anthropic count endpoint is in section 7 — and provider-side tool results (e.g. web search) return to the context and bill as input on the next turn.

#### Edge case 4 — Images and multimodal inputs

Image token conversion is formula-based, not BPE: Anthropic documents width×height/750 (capped by automatic downscaling), Google documents a flat 258 tokens per image up to 384px and 258 per 768×768 tile above it, and OpenAI documents a base-plus-tiles schedule per model family. The probe results for one pinned PNG are in section 7; a meter should implement these conversions per provider behind the same interface as text counting, with the formula version recorded — providers change conversion schedules between model generations.

#### Implementation policy — per-principal usage metering (design chapter)

The consuming design this research feeds (the plgg token-metering library and its users, e.g. qmu-co-jp sync-controller) attributes usage to a **principal** — the RBAC/PBAC subject of the qmu.app plan — via a usage record kept by the caller:

- **Record shape**: \`{ recordedAt, principalId, model, inputTokens, cachedInputTokens, outputTokens, costUsd, countingMethod, calibrationVersion }\` — the usage breakdown mirrors the provider's usage field, the cost carries its input/cache/output decomposition, and the counting method plus calibration version make every stored number re-derivable.
- **Data minimization / sovereignty**: the record stores counts and money, never prompt or completion text; \`principalId\` is an opaque internal identifier (non-PII, per the observability policy's structured-log constraint); deletion semantics are decided at schema time — usage records are billing evidence, so account deletion anonymizes \`principalId\` (irreversibly detaching the person) rather than destroying the financial total, and this retention is disclosed.
- **Metrics output**: aggregates export in a vendor-neutral format (OpenMetrics counters per principal/model/token-bucket), not a provider dashboard, per the observability policy.
- **Branded types**: token counts and USD amounts are separate branded number types, so a count never adds to an amount without an explicit conversion through a price — the compile-time misuse this research's own harness types also enforce.
- **ACL boundary**: tokenizer vocabularies, count endpoints, and usage fields are provider details behind an anti-corruption layer; the domain sees \`countTokens(model, text)\` and \`estimateCost(model, usage)\` only.

#### Dependency decision — tokenizer libraries (4-point log)

1. **Reason**: counting needs a tokenizer. Candidates: \`tiktoken\` (OpenAI encodings), the archived \`@anthropic-ai/tokenizer\` (legacy Claude 2 only — unusable for current models), Hugging Face \`tokenizers\`/transformers (OSS models).
2. **Assessment**: all are reputable and permissively licensed (MIT/Apache-2.0), but each covers one provider, none covers Anthropic's current models, and adopting them puts a per-provider native/WASM dependency into every consumer.
3. **Decision and monitoring**: per the vendor-neutrality policy's implement-by-default principle, the self-implementation is adopted: the BPE inference loop is ~150 lines against *published data* (the vocabularies), and this topic's recurring trial IS the monitoring plan — it re-validates the counts against the live APIs each run, so a tokenizer change surfaces as a holdout-error regression, the same signal a library adopter waits for in a release note.
4. **Exit strategy**: the counting interface (\`countTokens\`) hides the implementation; if a provider ships an encoding whose published rules the self-count cannot reproduce within the band, the reference library can be adopted behind the same interface for that provider only, recorded in \`docs/dependency-decisions.md\`.`,
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture vocabulary and counts):
npm run research -- token-metering --fixture

# Cost preview, then the owner-gated real run (needs provider keys):
npm run research -- token-metering --estimate
npm run research -- token-metering --real
\`\`\`

A real run fetches the published vocabularies (o200k_base.tiktoken; Qwen2.5 tokenizer.json) into \`packages/tech/.cache/token-metering/\` — they are data downloads recorded in \`docs/dependency-decisions.md\`, never committed.`,
    reproductionCost: `The fixture path is keyless and costless. A real trial reads two unbilled count endpoints (Anthropic count_tokens, Gemini countTokens — $0) and runs one minimal billed completion per sample against the two usage-probe families (30 short prompts each against \`gpt-5.5\` and the Workers AI Qwen model): the estimate path prices this in the cents range per trial. The agreed ceiling for the whole mission's measurements is $5 and \`--estimate\` must run first.`,
    cleanup:
      "A real run provisions nothing (stateless API reads and minimal completions); there is nothing to tear down. It writes the local Markdown/JSON artifacts and the vocabulary cache under `packages/tech/.cache/` — review the artifacts before committing; the cache is gitignored.",
    verificationData: `**Per-family calibration, per-class error, and per-sample counts**

${result.families.map((family) => familyBlock(family)).join("\n\n")}

**Edge-case probes**

${edgeProbeBlock(result)}

Probe spend of this benchmark stage: ${usd(result.spendUsd)} (count endpoints are unbilled; the usage probes bill minimal completions).

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-sample counts, fitted calibrations, per-class bands, edge-probe readings, and spend.

Generated: ${result.generatedAt}`,
  });

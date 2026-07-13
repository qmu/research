import type { ModelCard } from "./types";
import { providerDisplayName } from "./provider";
import { renderEnglishResearchArticle } from "../../research/domain/article-outline";

/**
 * The foundation-model catalog: a REFERENCE topic, not a benchmark. It renders
 * the curated model registry (`models.ts`) — provider, tier, price, effort
 * levels, API surface, release, citation — as a comparison table. Every value is
 * curated catalog data with a cited source, never a live measurement, and the
 * page says so in its provenance line so a reader never mistakes a catalog price
 * for a measured result. `models.ts` is the single source of truth, so the
 * catalog is verifiable against it and deterministic (keyless, byte-stable).
 */

export type CatalogRow = Readonly<{
  provider: string;
  modelName: string;
  apiModelId: string;
  tier: string;
  apiSurface: string;
  released: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  effortLevels: ReadonlyArray<string>;
  source: string;
}>;

export type FoundationModelsCatalog = Readonly<{
  provenance: "catalog";
  generatedFrom: string;
  rows: ReadonlyArray<CatalogRow>;
}>;

const apiSurfaceOf = (card: ModelCard): string => card.api ?? "chat";

/** Project the curated registry into catalog rows (pure). */
export const buildCatalogRows = (
  models: ReadonlyArray<ModelCard>,
): ReadonlyArray<CatalogRow> =>
  models.map((card) => ({
    provider: providerDisplayName(card.provider),
    modelName: card.modelName,
    apiModelId: card.apiModelId,
    tier: card.tier,
    apiSurface: apiSurfaceOf(card),
    released: card.released,
    inputCostPerMTok: card.inputCostPerMTok,
    outputCostPerMTok: card.outputCostPerMTok,
    effortLevels: card.effortLevels,
    source: card.source,
  }));

export const buildFoundationModelsCatalog = (
  models: ReadonlyArray<ModelCard>,
): FoundationModelsCatalog => ({
  provenance: "catalog",
  generatedFrom: "packages/tech/src/llm-model-comparison/models.ts",
  rows: buildCatalogRows(models),
});

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const catalogTable = (rows: ReadonlyArray<CatalogRow>): string => {
  const header =
    "| Provider | Model | API model id | Tier | API surface | Released | Input $/MTok | Output $/MTok | Effort levels |\n" +
    "| -------- | ----- | ------------ | ---- | ----------- | -------- | ------------ | ------------- | ------------- |";
  const rowsMd = rows.map(
    (row) =>
      `| ${escapeCell(row.provider)} | ${escapeCell(row.modelName)} | \`${escapeCell(row.apiModelId)}\` | ` +
      `${escapeCell(row.tier)} | ${escapeCell(row.apiSurface)} | ${escapeCell(row.released)} | ` +
      `${usd(row.inputCostPerMTok)} | ${usd(row.outputCostPerMTok)} | ${escapeCell(row.effortLevels.join(", ") || "n/a")} |`,
  );
  return `${header}\n${rowsMd.join("\n")}`;
};

/**
 * The §4 overview: one row per provider (model count, tiers, catalog price
 * range). The full per-model catalog table lives in §7 Verification Data —
 * §4 stays a concise, decision-relevant summary by the site-wide article
 * policy.
 */
const providerOverviewTable = (rows: ReadonlyArray<CatalogRow>): string => {
  const providers = [...new Set(rows.map((row) => row.provider))];
  const header =
    "| Provider | Models | Tiers | Input $/MTok | Output $/MTok |\n" +
    "| -------- | ------ | ----- | ------------ | ------------- |";
  const bodyRows = providers.map((provider) => {
    const own = rows.filter((row) => row.provider === provider);
    const tiers = [...new Set(own.map((row) => row.tier))].join(", ");
    const range = (values: ReadonlyArray<number>): string => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      return min === max ? usd(min) : `${usd(min)}–${usd(max)}`;
    };
    return (
      `| ${escapeCell(provider)} | ${own.length} | ${escapeCell(tiers)} | ` +
      `${range(own.map((row) => row.inputCostPerMTok))} | ${range(own.map((row) => row.outputCostPerMTok))} |`
    );
  });
  return `${header}\n${bodyRows.join("\n")}`;
};

const sourceList = (rows: ReadonlyArray<CatalogRow>): string => {
  const byProvider = new Map<string, string>();
  for (const row of rows) {
    if (!byProvider.has(row.provider)) byProvider.set(row.provider, row.source);
  }
  return [...byProvider.entries()]
    .map(([provider, source]) => `- **${escapeCell(provider)}:** ${source}`)
    .join("\n");
};

export const renderFoundationModelsReport = (
  catalog: FoundationModelsCatalog,
): string => {
  const providers = [...new Set(catalog.rows.map((r) => r.provider))].length;
  return renderEnglishResearchArticle({
    title: "Foundation model catalog",
    description: `A curated reference catalog of ${catalog.rows.length} foundation models across ${providers} providers — provider, tier, price, effort levels, and API surface — sourced from the model registry, not a live measurement.`,
    introduction:
      "This is a **reference catalog**, not a benchmark. It lists the compared foundation models and records the catalog facts used by measured topics.",
    purpose:
      "The catalog gives readers one place to verify which providers, model names, API model ids, tiers, prices, effort controls, and API surfaces are in scope before reading measured speed, accuracy, and availability reports.",
    targetModels: `${catalog.rows.length} foundation models across ${providers} providers are listed. The single source of truth is the model registry (\`${catalog.generatedFrom}\`).`,
    targetMetrics:
      "This topic has no measured metrics. It records curated catalog fields only: provider, model, API model id, tier, API surface, release label, input/output catalog price, and supported effort levels.",
    scopeAndConstraints:
      "Every value is curated catalog data with a cited source, not a live measurement. No throughput, latency, accuracy, OCR, RAG, or availability figure appears here. Treat each cell as correct only as of its source's date; provider catalog pages can change after this page is generated. Vision/multimodal support is **to verify** and is deliberately omitted rather than guessed.",
    verificationResults: `${providerOverviewTable(catalog.rows)}

Every value is curated catalog data (provenance: \`catalog\`), not a measured value; prices are the USD-per-1M-token range across each provider's listed models. The full per-model catalog table is in section 7, Verification Data.`,
    analysis:
      "Use this page to understand the comparison matrix before reading measurement pages. Model selection should not be based on this catalog alone: prices and effort controls constrain cost and runtime behavior, but measured speed, output accuracy, OCR capability, RAG behavior, and availability are covered by the other research topics.",
    reproductionSteps: `\`\`\`sh
cd packages/tech
npm run research -- foundation-models --fixture
\`\`\``,
    reproductionCost:
      "The catalog path is keyless and costless. It reads the committed model registry and does not call provider APIs.",
    cleanup:
      "No external resources are created. Re-rendering only rewrites the catalog Markdown and JSON artifact in `docs/research-reports/`.",
    verificationData: `**Full catalog**

${catalogTable(catalog.rows)}

**Legend.** Every column is curated catalog data (provenance: \`catalog\`), not a measured value. Cost is USD per 1M tokens, input / output. "Effort levels" are the reasoning-effort settings the registry sweeps for that model; \`n/a\` means the model exposes no user-selectable effort control.

**Sources**

${sourceList(catalog.rows)}

The catalog regenerates from \`${catalog.generatedFrom}\`; a correction to a price or tier is a one-line edit there, after which this page is re-rendered.`,
  });
};

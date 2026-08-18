import type { ModelCard } from "./types";
import { providerDisplayName } from "./provider";
import { renderEnglishCatalogArticle } from "../../research/domain/article-outline";

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
  // Generational-pairing label, e.g. "current (supersedes Gemini 3.5 Flash)" or
  // "previous (→ Gemini 3.6 Flash)". `—` when the card is outside any active
  // pairing. Derived from the registry's machine-readable pairing metadata so the
  // catalog and the generational-delta insight stay coherent.
  generation: string;
  source: string;
}>;

export type FoundationModelsCatalog = Readonly<{
  provenance: "catalog";
  generatedFrom: string;
  rows: ReadonlyArray<CatalogRow>;
}>;

const apiSurfaceOf = (card: ModelCard): string => card.api ?? "chat";

/** The generational-pairing label for a card, resolving the paired card's id to
 * its product name via the registry (falling back to the raw id). `—` when the
 * card is outside any active former→new pairing. */
const generationLabel = (
  card: ModelCard,
  nameById: ReadonlyMap<string, string>,
): string => {
  const nameOf = (id: string): string => nameById.get(id) ?? id;
  if (card.generation === "current" && card.supersedes !== undefined) {
    return `current (supersedes ${nameOf(card.supersedes)})`;
  }
  if (card.generation === "previous" && card.supersededBy !== undefined) {
    return `previous (→ ${nameOf(card.supersededBy)})`;
  }
  return "—";
};

/** Project the curated registry into catalog rows (pure). */
export const buildCatalogRows = (
  models: ReadonlyArray<ModelCard>,
): ReadonlyArray<CatalogRow> => {
  const nameById = new Map(models.map((card) => [card.id, card.modelName]));
  return models.map((card) => ({
    provider: providerDisplayName(card.provider),
    modelName: card.modelName,
    apiModelId: card.apiModelId,
    tier: card.tier,
    apiSurface: apiSurfaceOf(card),
    released: card.released,
    inputCostPerMTok: card.inputCostPerMTok,
    outputCostPerMTok: card.outputCostPerMTok,
    effortLevels: card.effortLevels,
    generation: generationLabel(card, nameById),
    source: card.source,
  }));
};

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
    "| Provider | Model | API model id | Tier | API surface | Released | Input $/MTok | Output $/MTok | Effort levels | Generation |\n" +
    "| -------- | ----- | ------------ | ---- | ----------- | -------- | ------------ | ------------- | ------------- | ---------- |";
  const rowsMd = rows.map(
    (row) =>
      `| ${escapeCell(row.provider)} | ${escapeCell(row.modelName)} | \`${escapeCell(row.apiModelId)}\` | ` +
      `${escapeCell(row.tier)} | ${escapeCell(row.apiSurface)} | ${escapeCell(row.released)} | ` +
      `${usd(row.inputCostPerMTok)} | ${usd(row.outputCostPerMTok)} | ${escapeCell(row.effortLevels.join(", ") || "n/a")} | ${escapeCell(row.generation)} |`,
  );
  return `${header}\n${rowsMd.join("\n")}`;
};

/**
 * The Coverage table: one row per provider (model count, tiers, catalog price
 * range). The full per-model table lives in the Catalog section — Coverage
 * stays a concise, decision-relevant summary by the site-wide article policy.
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

/**
 * Render the catalog page on the reference-catalog outline (Overview /
 * Coverage / Catalog / Sources), not the seven-section verification outline
 * the measured topics share. A catalog states no research purpose, no
 * measurement targets and no reproduction cost, because it measures nothing;
 * it opens instead on a rough summary of whose models are covered and where
 * they are actually evaluated.
 */
export const renderFoundationModelsReport = (
  catalog: FoundationModelsCatalog,
): string => {
  const providers = [...new Set(catalog.rows.map((r) => r.provider))];
  return renderEnglishCatalogArticle({
    title: "Foundation model catalog",
    description: `A curated reference catalog of ${catalog.rows.length} foundation models across ${providers.length} providers — provider, tier, price, effort levels, and API surface — sourced from the model registry, not a live measurement.`,
    overview: `This is a **reference catalog**, not a benchmark. It covers ${catalog.rows.length} foundation models from ${providers.length} providers — ${providers.join(", ")} — and records, for each, the curated facts the measured topics build on: provider, model name, API model id, tier, API surface, release label, catalog price, supported effort levels, and generational pairing.

Nothing on this page is evaluated here. How these models actually behave is the subject of the measured topics — speed, accuracy, availability, OCR, RAG, computer use — which draw their subject lists from this catalog; this page is where you check what is in scope before reading them. Model selection should not rest on the catalog alone: price and effort controls constrain cost and runtime behavior, but say nothing about output quality.`,
    coverage: `${providerOverviewTable(catalog.rows)}

Prices are the USD-per-1M-token range across each provider's listed models. Every value is curated catalog data (provenance: \`catalog\`) with a cited source, never a live measurement: no throughput, latency, accuracy, OCR, RAG, or availability figure appears here. Treat each cell as correct only as of its source's date; provider catalog pages can change after this page is generated. Vision/multimodal support is **to verify** and is deliberately omitted rather than guessed.`,
    catalog: `${catalogTable(catalog.rows)}

**Legend.** Every column is curated catalog data (provenance: \`catalog\`), not a measured value. Cost is USD per 1M tokens, input / output. "Effort levels" are the reasoning-effort settings the registry sweeps for that model; \`n/a\` means the model exposes no user-selectable effort control. "Generation" marks a controlled former→new pairing: \`current (supersedes …)\` is the latest tier and \`previous (→ …)\` the retained prior generation it replaced; \`—\` means the model is outside any active pairing.`,
    sources: `${sourceList(catalog.rows)}

The catalog regenerates from \`${catalog.generatedFrom}\`; a correction to a price or tier is a one-line edit there, after which this page is re-rendered:

\`\`\`sh
cd packages/tech
npm run research -- foundation-models --fixture
\`\`\`

That path is keyless and costless — it reads the committed model registry and calls no provider API, so the page is reproducible by any reader.`,
  });
};

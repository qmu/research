import type { ModelCard } from "./types";

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
    provider: card.provider,
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
  return `---
title: Foundation model catalog
description: A curated reference catalog of ${catalog.rows.length} foundation models across ${providers} providers — provider, tier, price, effort levels, and API surface — sourced from the model registry, not a live measurement.
---

# Foundation model catalog

This is a **reference catalog**, not a benchmark. It lists ${catalog.rows.length}
foundation models across ${providers} providers with their curated tier, price,
supported effort levels, and API surface. Every value is **curated catalog data**
with a cited source — **未測定 (not measured)**: no throughput, latency,
accuracy, or availability figure appears here. For measured behavior see the
speed, accuracy, and availability topics.

The single source of truth is the model registry
(\`${catalog.generatedFrom}\`); this page is generated from it, so the prices and
tiers below are verifiable against that file and against each provider's cited
page. Treat each cell as correct only as of its source's date.

## Catalog

${catalogTable(catalog.rows)}

**Legend.** Every column is curated catalog data (provenance: \`catalog\`), not a
measured value. Cost is USD per 1M tokens, input / output. "Effort levels" are
the reasoning-effort settings the registry sweeps for that model; \`n/a\` means
the model exposes no user-selectable effort control. Vision/multimodal support is
**要確認 (to verify)** — it is not tracked in the registry and is deliberately
omitted rather than guessed.

## Sources

${sourceList(catalog.rows)}

The catalog regenerates from \`${catalog.generatedFrom}\`; a correction to a price
or tier is a one-line edit there, after which this page is re-rendered.
`;
};

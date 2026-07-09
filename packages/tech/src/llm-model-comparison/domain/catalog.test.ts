import { describe, expect, it } from "vitest";
import {
  buildCatalogRows,
  buildFoundationModelsCatalog,
  renderFoundationModelsReport,
} from "./catalog";
import { MODELS } from "../models";
import type { ModelCard } from "./types";

const sample: ReadonlyArray<ModelCard> = [
  {
    id: "anthropic-claude-fable-5",
    provider: "anthropic",
    tier: "frontier",
    modelName: "Claude Fable 5",
    apiModelId: "claude-fable-5",
    released: "2026-06",
    inputCostPerMTok: 6,
    outputCostPerMTok: 30,
    effortLevels: ["low", "high"],
    source: "https://example.com/anthropic",
  },
  {
    id: "openai-gpt-realtime",
    provider: "openai",
    api: "realtime",
    tier: "frontier",
    modelName: "GPT Realtime",
    apiModelId: "gpt-realtime",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 20,
    effortLevels: [],
    source: "https://example.com/openai",
  },
];

describe("buildCatalogRows", () => {
  it("mirrors the registry cards, defaulting the API surface to chat", () => {
    const rows = buildCatalogRows(sample);
    expect(rows[0]?.provider).toBe("Anthropic");
    expect(rows[1]?.provider).toBe("OpenAI");
    expect(rows[0]?.apiSurface).toBe("chat");
    expect(rows[1]?.apiSurface).toBe("realtime");
    expect(rows[0]?.inputCostPerMTok).toBe(6);
    expect(rows[0]?.effortLevels).toEqual(["low", "high"]);
  });

  it("is verifiable against the real registry: one row per model card", () => {
    expect(buildCatalogRows(MODELS).length).toBe(MODELS.length);
  });
});

describe("buildFoundationModelsCatalog", () => {
  it("tags provenance as catalog and cites the registry as source", () => {
    const catalog = buildFoundationModelsCatalog(sample);
    expect(catalog.provenance).toBe("catalog");
    expect(catalog.generatedFrom).toContain("models.ts");
    expect(catalog.rows.length).toBe(2);
  });
});

describe("renderFoundationModelsReport", () => {
  it("marks the page as a non-measured reference catalog", () => {
    const md = renderFoundationModelsReport(
      buildFoundationModelsCatalog(sample),
    );
    expect(md).toContain("reference catalog");
    expect(md).toContain("未測定");
    expect(md).toContain("provenance: `catalog`");
    // Curated values appear; no measured metric column leaks in.
    expect(md).toContain("Claude Fable 5");
    expect(md).toContain("$6.00");
    expect(md).not.toContain("Throughput");
    expect(md).not.toContain("tok/s");
    // Vision support is explicitly deferred, not fabricated.
    expect(md).toContain("要確認");
  });

  it("renders an effort-less model's levels as n/a", () => {
    const md = renderFoundationModelsReport(
      buildFoundationModelsCatalog(sample),
    );
    expect(md).toContain("| n/a |");
  });
});

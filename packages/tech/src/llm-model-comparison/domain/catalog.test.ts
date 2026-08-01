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

  it("labels the generational pairing from the registry metadata", () => {
    const paired: ReadonlyArray<ModelCard> = [
      {
        id: "google-gemini-3-6-flash",
        provider: "google",
        tier: "mid",
        modelName: "Gemini 3.6 Flash",
        apiModelId: "gemini-3.6-flash",
        released: "2026-07",
        inputCostPerMTok: 1.5,
        outputCostPerMTok: 7.5,
        effortLevels: ["low", "medium", "high"],
        generation: "current",
        supersedes: "google-gemini-3-5-flash",
        source: "https://ai.google.dev/gemini-api/docs/pricing",
      },
      {
        id: "google-gemini-3-5-flash",
        provider: "google",
        tier: "mid",
        modelName: "Gemini 3.5 Flash",
        apiModelId: "gemini-3.5-flash",
        released: "2026",
        inputCostPerMTok: 1.5,
        outputCostPerMTok: 9,
        effortLevels: ["low", "medium", "high"],
        generation: "previous",
        supersededBy: "google-gemini-3-6-flash",
        source: "https://ai.google.dev/gemini-api/docs/pricing",
      },
    ];
    const rows = buildCatalogRows(paired);
    expect(rows[0]?.generation).toBe("current (supersedes Gemini 3.5 Flash)");
    expect(rows[1]?.generation).toBe("previous (→ Gemini 3.6 Flash)");
  });

  it("marks a model outside any pairing with an em dash", () => {
    expect(buildCatalogRows(sample)[0]?.generation).toBe("—");
  });
});

describe("the real registry carries the newly released Gemini pairing", () => {
  it("has both new-generation Gemini cards paired to their predecessors", () => {
    const byId = new Map(MODELS.map((card) => [card.id, card]));
    const flash = byId.get("google-gemini-3-6-flash");
    const flashLite = byId.get("google-gemini-3-5-flash-lite");
    expect(flash?.apiModelId).toBe("gemini-3.6-flash");
    expect(flash?.supersedes).toBe("google-gemini-3-5-flash");
    expect(flashLite?.apiModelId).toBe("gemini-3.5-flash-lite");
    expect(flashLite?.supersedes).toBe("google-gemini-3-1-flash-lite");
    // The predecessors are retained and paired back, under identical effort.
    const prevFlash = byId.get("google-gemini-3-5-flash");
    expect(prevFlash?.supersededBy).toBe("google-gemini-3-6-flash");
    expect(prevFlash?.effortLevels).toEqual(flash?.effortLevels);
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
    expect(md).toContain("no measured metrics");
    expect(md).toContain("provenance: `catalog`");
    // Curated values appear; no measured metric column leaks in.
    expect(md).toContain("Claude Fable 5");
    expect(md).toContain("$6.00");
    expect(md).not.toContain("Throughput");
    expect(md).not.toContain("tok/s");
    // Vision support is explicitly deferred, not fabricated.
    expect(md).toContain("to verify");
  });

  it("renders an effort-less model's levels as n/a", () => {
    const md = renderFoundationModelsReport(
      buildFoundationModelsCatalog(sample),
    );
    expect(md).toContain("| n/a |");
  });
});

import { describe, expect, it } from "vitest";
import { MODELS } from "../models";
import { hasOnlyNoEffortLevel } from "./effort";
import {
  buildComparisonMatrix,
  buildDefaultMatrix,
  capEffortSpread,
} from "./matrix";

const KNOWN_NO_EFFORT_MODEL_IDS = [
  "anthropic-claude-haiku-4-5",
  "openai-gpt-realtime",
  "xai-grok-4-20-0309-reasoning",
  "xai-grok-4-20-0309-non-reasoning",
  "xai-grok-build-0-1",
] as const;

describe("model effort matrix", () => {
  it("gives every model at least one declared effort level", () => {
    expect(MODELS.every((model) => model.effortLevels.length > 0)).toBe(true);
  });

  it("declares known no-effort foundation models as exactly one n/a row", () => {
    const noEffortModels = MODELS.filter((model) =>
      hasOnlyNoEffortLevel(model.effortLevels),
    );
    expect(noEffortModels.map((model) => model.id).sort()).toEqual(
      [...KNOWN_NO_EFFORT_MODEL_IDS].sort(),
    );
  });

  it("includes each no-effort model exactly once in the full matrix", () => {
    const matrix = buildComparisonMatrix(MODELS, null);
    for (const id of KNOWN_NO_EFFORT_MODEL_IDS) {
      expect(
        matrix.filter(
          (config) => config.card.id === id && config.effort === "n/a",
        ),
      ).toHaveLength(1);
    }
  });

  it("selects no-effort rows with --effort n/a", () => {
    const matrix = buildComparisonMatrix(MODELS, ["n/a"]);
    expect(matrix.map((config) => config.card.id).sort()).toEqual(
      [...KNOWN_NO_EFFORT_MODEL_IDS].sort(),
    );
    expect(matrix.every((config) => config.effort === "n/a")).toBe(true);
  });
});

describe("capEffortSpread (instrument v2 subject rule)", () => {
  it("keeps ladders at or under the cap unchanged", () => {
    expect(capEffortSpread(["low", "medium", "high"], 3)).toEqual([
      "low",
      "medium",
      "high",
    ]);
    expect(capEffortSpread(["n/a"], 3)).toEqual(["n/a"]);
  });

  it("picks lowest, intermediate, and highest from longer ladders", () => {
    expect(
      capEffortSpread(["low", "medium", "high", "xhigh", "max"], 3),
    ).toEqual(["low", "high", "max"]);
    expect(capEffortSpread(["none", "low", "medium", "high"], 3)).toEqual([
      "none",
      "medium",
      "high",
    ]);
  });

  it("builds the default matrix with at most three efforts per model", () => {
    const matrix = buildDefaultMatrix(
      [
        {
          id: "m",
          provider: "anthropic",
          tier: "frontier",
          modelName: "M",
          apiModelId: "m",
          released: "2026-01",
          inputCostPerMTok: 1,
          outputCostPerMTok: 1,
          effortLevels: ["low", "medium", "high", "xhigh", "max"],
          source: "https://example.com",
        },
      ],
      3,
    );
    expect(matrix.map((c) => c.effort)).toEqual(["low", "high", "max"]);
  });
});

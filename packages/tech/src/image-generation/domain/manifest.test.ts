import { describe, expect, it } from "vitest";
import { PROMPT_MANIFEST } from "./manifest";
import { PRACTICAL_IMAGE_CATEGORIES, type ImagePromptCategory } from "./types";

/**
 * Manifest v2 shape guards (Quality Gate: "Manifest v2 shape"). These assert the
 * category contract independently of the scoring tests: every prompt carries a
 * category, the five practical categories each have at least one prompt with at
 * least one machine-checkable constraint, and the original v1 prompts stay under
 * `mechanical` so the earlier history remains comparable.
 */

const V1_MECHANICAL_IDS: ReadonlyArray<string> = [
  "three-red-circles",
  "square-left-of-triangle",
  "five-green-stars-row",
  "black-cat-facing-left",
  "two-orange-one-purple-diamond",
  "red-circle-above-blue-line",
  "text-hello-benchmark",
  "text-qmu-research-2026",
];

describe("prompt manifest v2", () => {
  it("is version 2", () => {
    expect(PROMPT_MANIFEST.version).toBe("2");
  });

  it("gives every prompt a category", () => {
    for (const prompt of PROMPT_MANIFEST.prompts) {
      expect(prompt.category, prompt.id).toBeDefined();
    }
  });

  it("keeps every original v1 prompt under the mechanical category", () => {
    const mechanical = PROMPT_MANIFEST.prompts.filter(
      (prompt) => prompt.category === "mechanical",
    );
    expect(mechanical.map((prompt) => prompt.id).sort()).toEqual(
      [...V1_MECHANICAL_IDS].sort(),
    );
  });

  it("has at least one rubric-constrained prompt per practical category", () => {
    for (const category of PRACTICAL_IMAGE_CATEGORIES) {
      const inCategory = PROMPT_MANIFEST.prompts.filter(
        (prompt) => prompt.category === category,
      );
      expect(inCategory.length, category).toBeGreaterThan(0);
      const machineCheckable = inCategory.filter(
        (prompt) => prompt.constraints.length > 0,
      );
      expect(machineCheckable.length, category).toBeGreaterThan(0);
    }
  });

  it("uses only known categories", () => {
    const known = new Set<ImagePromptCategory>([
      "mechanical",
      ...PRACTICAL_IMAGE_CATEGORIES,
    ]);
    for (const prompt of PROMPT_MANIFEST.prompts) {
      expect(known.has(prompt.category), prompt.id).toBe(true);
    }
  });

  it("keeps prompt ids unique", () => {
    const ids = PROMPT_MANIFEST.prompts.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TRANSLATION_GLOSSARY,
  describeGlossaryDrift,
  findGlossaryDrift,
  glossaryPromptLines,
} from "./translation-glossary";
import { buildTranslationPrompt } from "./translate";

const page = (name: string): string =>
  readFileSync(
    resolve(process.cwd(), `../../docs/research-reports/${name}`),
    "utf8",
  );

describe("the glossary itself", () => {
  it("never lists a canonical rendering as its own alternative", () => {
    for (const entry of TRANSLATION_GLOSSARY) {
      expect(entry.alternatives).not.toContain(entry.japanese);
    }
  });

  it("keeps concept ids unique, so a finding names one thing", () => {
    const ids = TRANSLATION_GLOSSARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * A term claimed by two entries would make the checker's report ambiguous and
   * the prompt self-contradictory.
   */
  it("never has one rendering forbidden by one entry and fixed by another", () => {
    const canonical = new Set(
      TRANSLATION_GLOSSARY.map((entry) => entry.japanese),
    );
    for (const entry of TRANSLATION_GLOSSARY) {
      for (const alternative of entry.alternatives) {
        expect(canonical.has(alternative)).toBe(false);
      }
    }
  });
});

describe("glossary prompt lines", () => {
  it("names the alternative it forbids, not just the term to use", () => {
    const lines = glossaryPromptLines([
      {
        id: "x",
        concept: "the thing",
        japanese: "正",
        alternatives: ["誤", "別"],
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('always "正"');
    expect(lines[0]).toContain('never "誤" or "別"');
  });

  it("omits the never-clause when nothing is forbidden", () => {
    const lines = glossaryPromptLines([
      { id: "x", concept: "the thing", japanese: "正", alternatives: [] },
    ]);
    expect(lines[0]).not.toContain("never");
  });

  /**
   * The mechanism: the prompt is built per chunk, so the glossary has to be in
   * the chunk prompt or it protects nothing.
   */
  it("rides every chunk's prompt", () => {
    const prompt = buildTranslationPrompt({
      topicId: "accuracy",
      englishBody: "A later chunk of a long report.",
      sourceInsights: "llm-accuracy-comparison.insights.md",
      sourceArtifact: "llm-accuracy-comparison.data.json",
      sourceCommit: "1fefebc",
      insightsModel: "claude-opus-5",
      trials: 3,
    });
    for (const line of glossaryPromptLines()) {
      expect(prompt).toContain(line);
    }
    expect(prompt).toContain("総合判定");
  });
});

describe("drift detection", () => {
  it("finds nothing in a page that uses one name throughout", () => {
    const clean =
      "_総合判定: **mixed** — 9メトリクス中、改善3。_\n" +
      "_総合判定: **mixed** — 判別不能1件を除外。_\n";
    expect(findGlossaryDrift(clean)).toEqual([]);
  });

  it("reports the straggler with the canonical count beside it", () => {
    const drifted =
      "_総合判定: **mixed** — 改善3。_\n".repeat(9) +
      "_総合評価: **まちまち** — 3個が改善。_\n";
    const drift = findGlossaryDrift(drifted);
    const label = drift.find((entry) => entry.id === "overall-verdict-label");
    expect(label?.found).toBe("総合評価");
    expect(label?.occurrences).toBe(1);
    expect(label?.canonicalOccurrences).toBe(9);
    expect(drift.find((entry) => entry.id === "verdict-mixed")?.found).toBe(
      "まちまち",
    );
  });

  it("counts every occurrence, not just the first", () => {
    const drift = findGlossaryDrift("区別不能 区別不能 区別不能");
    expect(drift[0]?.occurrences).toBe(3);
    expect(drift[0]?.canonicalOccurrences).toBe(0);
  });

  it("describes a finding in one actionable line", () => {
    const drift = findGlossaryDrift("総合判定 総合判定 総合評価");
    const first = drift[0];
    expect(first).toBeDefined();
    expect(first === undefined ? "" : describeGlossaryDrift(first)).toBe(
      'overall-verdict-label: found "総合評価" x1 where the glossary fixes "総合判定" (x2 in the same page)',
    );
  });
});

/**
 * The regression fixtures the ticket designates: the pages regenerated at
 * `1fefebc` are known-bad in labelling and known-good in their numbers, and were
 * left as they are deliberately so this check has something real to fire on.
 *
 * These assertions are about **the checker**, not about the pages. When the
 * pages are next regenerated under the glossary the drift should disappear —
 * at which point these two cases are updated deliberately, and the clean-page
 * cases above are what keep guarding the mechanism.
 */
describe("the committed known-bad pages", () => {
  it("fires on the accuracy page's verdict-label and mixed drift", () => {
    const drift = findGlossaryDrift(
      page("llm-accuracy-comparison.insights.ja.md"),
    );
    const ids = drift.map((entry) => entry.id);
    expect(ids).toContain("overall-verdict-label");
    expect(ids).toContain("verdict-mixed");
  });

  it("fires on the speed page's indistinguishable drift", () => {
    const drift = findGlossaryDrift(
      page("llm-speed-comparison.insights.ja.md"),
    );
    expect(drift.map((entry) => entry.id)).toContain(
      "verdict-indistinguishable",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  buildTranslationPrompt,
  estimateTranslation,
  extractNumbers,
  renderTranslationMarkdown,
  translateInsights,
  verifyNumbersPreserved,
  type TranslateInput,
  type TranslationProvenance,
} from "./translate";
import { createFixtureTranslationClient } from "../../vendors/llm/fixture";

const input: TranslateInput = {
  topicId: "rag",
  englishBody:
    "sqlite-vec measured recall@3 of 0.42 across 5 trials; the 95% interval was tight.",
  sourceInsights: "rag-benchmark.insights.md",
  sourceArtifact: "rag-benchmark.data.json",
  sourceCommit: "abc1234",
  insightsModel: "claude-sonnet-5",
  trials: 5,
};

describe("extractNumbers", () => {
  it("pulls integers, decimals, percents, and grouped numbers, deduplicated", () => {
    expect(
      extractNumbers("0.42, 5 trials, 95%, 1,536 dims, 0.42 again"),
    ).toEqual(["0.42", "5", "95%", "1,536"]);
  });

  it("does not swallow a trailing list/sentence comma into the number", () => {
    // "depth 10, breadth 32, 48 fields" must yield 10, 32, 48 — not "10," etc.
    expect(extractNumbers("depth 10, breadth 32, 48 fields")).toEqual([
      "10",
      "32",
      "48",
    ]);
    expect(extractNumbers("up to 21, then 1,234 more")).toEqual([
      "21",
      "1,234",
    ]);
  });

  it("treats a word hyphen as text, not a minus sign (no spurious negatives)", () => {
    // "per-1k-calls", "GPT-5", "top-1" must yield magnitudes, never "-1".
    expect(extractNumbers("$2.50-per-1k-calls on GPT-5, top-1 recall")).toEqual(
      ["2.50", "1", "5"],
    );
  });
});

describe("verifyNumbersPreserved", () => {
  it("returns empty when every source number survives", () => {
    expect(
      verifyNumbersPreserved(
        "recall 0.42 over 5 trials",
        "再現率 0.42、5 試行",
      ),
    ).toEqual([]);
  });

  it("flags a dropped or altered number", () => {
    expect(
      verifyNumbersPreserved(
        "recall 0.42 over 5 trials",
        "再現率 0.40、5 試行",
      ),
    ).toEqual(["0.42"]);
  });

  it("accepts a percent rendered without the % sign", () => {
    expect(
      verifyNumbersPreserved("95% uptime", "95 パーセントの稼働率"),
    ).toEqual([]);
  });
});

describe("buildTranslationPrompt", () => {
  it("names the numbers that must be preserved and asks for Japanese", () => {
    const prompt = buildTranslationPrompt(input);
    expect(prompt).toContain("0.42");
    expect(prompt).toContain("5");
    expect(prompt).toContain("95%");
    expect(prompt).toContain("Japanese");
    expect(prompt).toContain("sqlite-vec");
  });
});

describe("renderTranslationMarkdown", () => {
  const provenance: TranslationProvenance = {
    source_artifact: "rag-benchmark.data.json",
    source_commit: "abc1234",
    insights_model: "claude-sonnet-5",
    translated_from: "rag-benchmark.insights.md",
    translation_model: "claude-sonnet-5",
    generated_at: "2026-07-09T00:00:00.000Z",
    trials: 5,
    provenance: "llm-translation",
  };

  it("emits translated_from and translation_model in frontmatter", () => {
    const md = renderTranslationMarkdown("日本語の本文。", provenance);
    expect(md).toContain("translated_from: rag-benchmark.insights.md");
    expect(md).toContain("translation_model: claude-sonnet-5");
    expect(md).toContain("provenance: llm-translation");
    expect(md).toContain("generated_at: 2026-07-09T00:00:00.000Z");
    expect(md.trimEnd().endsWith("日本語の本文。")).toBe(true);
  });
});

describe("estimateTranslation", () => {
  it("reports one call with positive token estimates", () => {
    const estimate = estimateTranslation(input);
    expect(estimate.calls).toBe(1);
    expect(estimate.promptTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBeGreaterThan(0);
  });
});

describe("translateInsights", () => {
  it("preserves numbers, carries provenance, and is deterministic via the stub", async () => {
    const client = createFixtureTranslationClient("fixture-translate");
    const first = await translateInsights({
      client,
      input,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    const second = await translateInsights({
      client,
      input,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(first.markdown).toBe(second.markdown);
    expect(first.missingNumbers).toEqual([]);
    expect(first.provenance.translation_model).toBe("fixture-translate");
    expect(first.provenance.translated_from).toBe("rag-benchmark.insights.md");
    expect(first.provenance.insights_model).toBe("claude-sonnet-5");
    // Every source number appears verbatim in the translated markdown.
    for (const number of extractNumbers(input.englishBody)) {
      expect(first.markdown).toContain(number);
    }
  });

  it("keeps raw SVG blocks out of the model prompt and restores them", async () => {
    const svgInput: TranslateInput = {
      ...input,
      englishBody:
        "The chart has 1 source value.\n<svg><text>0.9734</text></svg>\nThe table has 2 rows.",
    };
    const client = {
      model: "fixture-translate",
      generateAnswer: (prompt: string) => {
        expect(prompt).not.toContain("<svg>");
        expect(prompt).toContain("@@RAW_BLOCK_A@@");
        return Promise.resolve(
          "チャートには1個のソース値があります。\n@@RAW_BLOCK_A@@\n表には2行あります。",
        );
      },
    };
    const report = await translateInsights({
      client,
      input: svgInput,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(report.markdown).toContain("<svg><text>0.9734</text></svg>");
    expect(report.markdown).not.toContain("@@RAW_BLOCK_A@@");
    expect(report.missingNumbers).toEqual([]);
  });

  it("translates long reports in multiple chunks", async () => {
    let calls = 0;
    const longInput: TranslateInput = {
      ...input,
      englishBody: [
        "# Long report 1",
        "A short opening with 2.",
        "## Large section",
        `${"Long prose. ".repeat(900)}3`,
        "## Final section",
        "The closing value is 4.",
      ].join("\n\n"),
    };
    const client = {
      model: "fixture-translate",
      generateAnswer: (prompt: string) => {
        calls += 1;
        const numbers = [...new Set(prompt.match(/\d+(?:\.\d+)?%?/g) ?? [])];
        return Promise.resolve(`翻訳チャンク ${calls}: ${numbers.join(" ")}`);
      },
    };
    const report = await translateInsights({
      client,
      input: longInput,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(calls).toBeGreaterThan(1);
    expect(report.missingNumbers).toEqual([]);
    expect(estimateTranslation(longInput).calls).toBeGreaterThan(1);
  });

  it("reports missing numbers (without throwing) when the model drops one", async () => {
    const dropping = {
      model: "bad-translate",
      generateAnswer: () => Promise.resolve("数値のない翻訳。"),
    };
    const report = await translateInsights({
      client: dropping,
      input,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    // The source numbers 0.42, 5, 95(%) are all absent → all flagged, no throw.
    expect(report.missingNumbers.length).toBeGreaterThan(0);
    expect(report.missingNumbers).toContain("0.42");
  });
});

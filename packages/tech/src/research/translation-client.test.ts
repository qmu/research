import { afterEach, describe, expect, it } from "vitest";
import {
  selectTranslationClient,
  TRANSLATION_KEY_ENV,
} from "./translation-client";

const withoutKey = (): void => {
  delete process.env[TRANSLATION_KEY_ENV];
};

const originalKey = process.env[TRANSLATION_KEY_ENV];

afterEach(() => {
  if (originalKey === undefined) withoutKey();
  else process.env[TRANSLATION_KEY_ENV] = originalKey;
});

describe("selectTranslationClient", () => {
  it("refuses when no key is set and the fixture was not asked for", () => {
    withoutKey();
    expect(() =>
      selectTranslationClient({
        target: "docs/research-reports/foundation-models.insights.ja.md",
        allowFixture: false,
      }),
    ).toThrowError(/ANTHROPIC_API_KEY is not set/);
  });

  it("names the page it declined to overwrite and how to proceed", () => {
    withoutKey();
    let message = "";
    try {
      selectTranslationClient({
        target: "docs/research-reports/foundation-models.insights.ja.md",
        allowFixture: false,
      });
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : String(error);
    }
    // The refusal has to be actionable on its own: which variable, which page,
    // and the two ways forward.
    expect(message).toContain(TRANSLATION_KEY_ENV);
    expect(message).toContain(
      "docs/research-reports/foundation-models.insights.ja.md",
    );
    expect(message).toContain("--estimate");
    expect(message).toContain("--fixture");
  });

  it("refuses on an empty key, not only an absent one", () => {
    process.env[TRANSLATION_KEY_ENV] = "";
    expect(() =>
      selectTranslationClient({ target: "any.ja.md", allowFixture: false }),
    ).toThrowError(/ANTHROPIC_API_KEY is not set/);
  });

  it("returns the deterministic stub when the fixture is asked for", async () => {
    withoutKey();
    const client = selectTranslationClient({
      target: "any.ja.md",
      allowFixture: true,
    });
    expect(client.model).toBe("fixture");
    // Unchanged stub behaviour: labelled placeholder that echoes the numbers.
    await expect(client.generateAnswer("42% of runs")).resolves.toContain(
      "翻訳スタブ",
    );
  });

  it("returns a live client when the key is set, fixture flag or not", () => {
    process.env[TRANSLATION_KEY_ENV] = "test-key-not-used";
    const client = selectTranslationClient({
      target: "any.ja.md",
      allowFixture: false,
    });
    expect(client.model).not.toBe("fixture");
  });
});

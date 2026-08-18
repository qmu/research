import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runReportTranslation } from "./report-translation-runner";
import { TRANSLATION_KEY_ENV } from "./translation-client";
import { findPublishedResearchTopic } from "./domain/site";

const TOPIC = "foundation-models";

const repoPath = (path: string): string =>
  resolve(process.cwd(), "../..", path);

const originalKey = process.env[TRANSLATION_KEY_ENV];

afterEach(() => {
  if (originalKey === undefined) delete process.env[TRANSLATION_KEY_ENV];
  else process.env[TRANSLATION_KEY_ENV] = originalKey;
});

describe("runReportTranslation without a key", () => {
  it("rejects and leaves the published Japanese page byte-identical", async () => {
    delete process.env[TRANSLATION_KEY_ENV];
    const topic = findPublishedResearchTopic(TOPIC);
    expect(topic).toBeDefined();
    const page = repoPath(topic?.japanese.docsPath ?? "");
    const before = await readFile(page);

    await expect(
      runReportTranslation({
        topicId: TOPIC,
        mode: "real",
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrowError(/ANTHROPIC_API_KEY is not set/);

    // The whole point of the refusal: the page a keyless run used to replace
    // with a one-line stub is untouched.
    expect(await readFile(page)).toEqual(before);
  });

  it("still prices the live call keylessly with --estimate", async () => {
    delete process.env[TRANSLATION_KEY_ENV];
    await expect(
      runReportTranslation({
        topicId: TOPIC,
        mode: "estimate",
        generatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).resolves.toBeUndefined();
  });
});

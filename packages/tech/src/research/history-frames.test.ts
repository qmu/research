import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RELATED_LABEL, TREND_LABEL } from "./domain/current-article";

/**
 * Guard over the committed dated frames under `docs/research-reports/history/`.
 *
 * A frame is a standalone snapshot of ONE run's article, so it must not carry
 * the two cross-run survey-series blocks (推移 / 過去の調査). Their past-survey
 * links are built top-level-relative to `docs/research-reports/` — the location
 * of the CURRENT pages — so once the same markdown lives inside
 * `history/<topic>/<frame>/`, `./history/<topic>/<ts>/<topic>-comparison`
 * resolves against the frame directory and doubles the segment. That is a dead
 * link, and it fails the VitePress build (`make build`, `ci.yml`).
 *
 * `stripSurveyBlocks` already removes the blocks at archive time
 * (`archive-runner.ts`), and `current-article.test.ts` covers that function in
 * isolation. This guard covers the property the build actually depends on: what
 * is COMMITTED is clean. The two are not redundant — the archive-time strip only
 * governs frames written after it landed, while frames archived before it (the
 * deep-research / speech / computer-use recovery frames, first observed on PR
 * #60) predate it and would reintroduce the dead link the moment they merge.
 *
 * Deliberately asserted here rather than suppressed with a scoped
 * `ignoreDeadLinks` in the VitePress config: that regex would exempt the whole
 * class of in-frame links, disabling the dead-link net exactly where these
 * failures appear. This fails earlier instead, and names the offending file.
 */

const historyRoot = resolve(
  process.cwd(),
  "../..",
  "docs/research-reports/history",
);

/** Every committed `.md` under the history tree, repo-relative for messages. */
const frameMarkdownFiles = (): ReadonlyArray<string> => {
  const walk = (directory: string): ReadonlyArray<string> =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    });
  return walk(historyRoot);
};

describe("committed history frames are pure single-run articles", () => {
  const files = frameMarkdownFiles();

  it("finds frames to check (a vacuous guard would pass silently)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("carries no top-level-relative ./history/ link in any frame", () => {
    for (const file of files) {
      const label = relative(resolve(process.cwd(), "../.."), file);
      expect(readFileSync(file, "utf8"), label).not.toContain("](./history/");
    }
  });

  it("carries neither survey-series block in any frame", () => {
    for (const file of files) {
      const label = relative(resolve(process.cwd(), "../.."), file);
      const markdown = readFileSync(file, "utf8");
      expect(markdown, label).not.toContain(TREND_LABEL);
      expect(markdown, label).not.toContain(RELATED_LABEL);
    }
  });
});

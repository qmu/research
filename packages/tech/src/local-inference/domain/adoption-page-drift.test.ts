import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderAdoptionReport } from "./adoption-report";
import { parseComparisonSnapshotFile } from "./snapshot";
import fixture from "../fixtures/adoption-snapshots.json";

// Mirrors the drift guard `make drift` runs over docs/research-reports/: the
// committed page must be byte-identical to what the renderer produces from
// the committed fixture, so docs/local-inference-adoption.md cannot go stale
// relative to the code that generates it.
const repoPath = (path: string): string =>
  resolve(process.cwd(), "../..", path);

describe("docs/local-inference-adoption.md", () => {
  it("matches renderAdoptionReport over the committed fixture", () => {
    const expected = renderAdoptionReport(parseComparisonSnapshotFile(fixture));
    const committed = readFileSync(
      repoPath("docs/local-inference-adoption.md"),
      "utf8",
    );
    expect(committed).toBe(expected);
  });
});

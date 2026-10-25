// Guards the one invariant `make drift` cannot see for this page, because it
// only walks `docs/research-reports/`: the committed comparison page must be
// exactly what regenerating it from the committed fixture produces. A
// renderer change or a fixture edit that forgot to regenerate the page fails
// here instead of silently drifting.

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseComparisonFile } from "./record";
import { renderComparisonPage } from "./report";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "../fixtures/comparison.json");
const pagePath = resolve(
  here,
  "../../../../../docs/local-inference-comparison.md",
);

describe("docs/local-inference-comparison.md", () => {
  it("byte-matches regeneration from the committed fixture", async () => {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    const committedPage = await readFile(pagePath, "utf8");
    expect(renderComparisonPage(parseComparisonFile(fixture))).toBe(
      committedPage,
    );
  });
});

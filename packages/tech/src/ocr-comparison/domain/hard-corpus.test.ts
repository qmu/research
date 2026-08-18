import { describe, expect, it } from "vitest";
import {
  HARD_CLASSES,
  HARD_CLASS_IDS,
  HARD_CORPUS_VERSION,
  HARD_PAGE_HEIGHT,
  buildHardCorpus,
  buildHardDocument,
  fieldsForClass,
  referenceTextOf,
} from "./hard-corpus";
import {
  lowestDrawnY,
  renderHardDocument,
  renderHardPagePng,
} from "./hard-render";
import { GLYPHS, textWidth } from "./raster";
import { HARD_PAGE_WIDTH } from "./hard-corpus";

describe("hard corpus generation", () => {
  it("covers every declared class with the declared document count", () => {
    const corpus = buildHardCorpus();
    expect(corpus.version).toBe(HARD_CORPUS_VERSION);
    for (const spec of HARD_CLASSES) {
      const documents = corpus.documents.filter(
        (document) => document.classId === spec.id,
      );
      expect(documents).toHaveLength(spec.documents);
    }
    expect(HARD_CLASS_IDS).toEqual(HARD_CLASSES.map((spec) => spec.id));
  });

  it("is deterministic — the same version reproduces the same pages", () => {
    const first = buildHardCorpus();
    const second = buildHardCorpus();
    expect(second.documents.map((d) => d.referenceText)).toEqual(
      first.documents.map((d) => d.referenceText),
    );
    expect(second.documents.map((d) => d.fields)).toEqual(
      first.documents.map((d) => d.fields),
    );
    const hashes = (corpus: typeof first): ReadonlyArray<string> =>
      corpus.documents.map((document) => renderHardDocument(document).sha256);
    expect(hashes(second)).toEqual(hashes(first));
  });

  it("renders byte-identically on repeat, degradation included", () => {
    const document = buildHardDocument("low-quality-scan", 0);
    expect(
      renderHardPagePng(document.page).equals(renderHardPagePng(document.page)),
    ).toBe(true);
  });

  it("gives a different corpus for a different version", () => {
    const current = buildHardDocument("nested-table", 0);
    const next = buildHardDocument("nested-table", 0, "hard-v2");
    expect(next.referenceText).not.toBe(current.referenceText);
  });

  /**
   * The corpus's load-bearing property: nothing authors ground truth separately
   * from the page, so the two cannot disagree.
   */
  it("derives every reference text from the page it renders", () => {
    for (const document of buildHardCorpus().documents) {
      expect(document.referenceText).toBe(referenceTextOf(document.page));
    }
  });

  /**
   * A character the 5x7 font cannot draw renders as a blank while the reference
   * still claims it — every model would be marked wrong for reading the page
   * correctly. That is a fabricated score, so it is a hard failure.
   */
  it("only ever references characters the font can draw", () => {
    for (const document of buildHardCorpus().documents) {
      for (const char of Array.from(document.referenceText.toUpperCase())) {
        if (char === "\n") continue;
        expect(
          GLYPHS[char],
          `unrenderable ${JSON.stringify(char)}`,
        ).toBeDefined();
      }
      for (const value of Object.values(document.fields)) {
        for (const char of Array.from(value.toUpperCase())) {
          expect(
            GLYPHS[char],
            `unrenderable ${JSON.stringify(char)}`,
          ).toBeDefined();
        }
      }
    }
  });

  it("keeps every drawn row and cell inside the page", () => {
    for (const document of buildHardCorpus().documents) {
      expect(lowestDrawnY(document.page)).toBeLessThanOrEqual(HARD_PAGE_HEIGHT);
      for (const row of document.page.rows) {
        for (const cell of row.cells) {
          const x = document.page.columns[cell.column] ?? document.page.marginX;
          expect(
            x + textWidth(cell.text, document.page.scale),
          ).toBeLessThanOrEqual(HARD_PAGE_WIDTH);
        }
      }
    }
  });

  it("states ground-truth fields that the class declares", () => {
    for (const document of buildHardCorpus().documents) {
      const names = fieldsForClass(document.classId).map((field) => field.name);
      expect(Object.keys(document.fields).sort()).toEqual([...names].sort());
    }
  });

  it("presents every class at the same page geometry", () => {
    const sizes = new Set(
      buildHardCorpus().documents.map((document) => {
        const png = renderHardPagePng(document.page);
        // IHDR width/height live at fixed offsets in a PNG header.
        return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
      }),
    );
    expect([...sizes]).toEqual([`${HARD_PAGE_WIDTH}x${HARD_PAGE_HEIGHT}`]);
  });

  it("keeps the nested-table fields answerable only by resolving the groups", () => {
    const document = buildHardDocument("nested-table", 0);
    const groupTwo = document.fields.group_2_name;
    expect(groupTwo).toBeDefined();
    // The second group's name appears in the page next to its own GROUP 2 label,
    // so a flattened read cannot attribute it without tracking the grouping.
    expect(document.referenceText).toContain(`GROUP 2 ${groupTwo ?? ""}`);
    expect(document.fields.grand_total).toBeDefined();
  });

  it("degrades the low-quality class and leaves the others clean", () => {
    expect(
      buildHardDocument("low-quality-scan", 0).page.degradation.downscaleFactor,
    ).toBeGreaterThan(1);
    expect(
      buildHardDocument("high-density", 0).page.degradation.downscaleFactor,
    ).toBe(1);
    expect(
      buildHardDocument("nested-table", 0).page.degradation.downscaleFactor,
    ).toBe(1);
  });

  it("makes the high-density class denser than the low-quality one", () => {
    const dense = buildHardDocument("high-density", 0);
    const plain = buildHardDocument("low-quality-scan", 0);
    expect(dense.referenceText.length).toBeGreaterThan(
      plain.referenceText.length * 2,
    );
    expect(dense.page.scale).toBeLessThan(plain.page.scale);
  });
});

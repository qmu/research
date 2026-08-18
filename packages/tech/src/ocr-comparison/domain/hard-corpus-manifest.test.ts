/**
 * The corpus drift guard.
 *
 * A periodic comparison is only comparable if its inputs stand still. The
 * generator is deterministic, but "deterministic" only means it reproduces
 * *itself* — an edit to a layout constant, a vocabulary list, or a degradation
 * parameter silently produces a different corpus that still passes every other
 * test, and every past survey's numbers quietly stop meaning what they say.
 *
 * So the committed manifest is the record, and this file is what makes it
 * load-bearing: it re-derives the corpus and asserts the manifest still
 * describes it, image hash by image hash.
 *
 * **If this test fails, the corpus moved.** That is either an accident to
 * revert, or a deliberate change — in which case bump `HARD_CORPUS_VERSION` and
 * regenerate the manifest, so past frames stay attached to the corpus they were
 * actually measured against.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import manifest from "./data/hard-input-ocr.manifest.json";
import {
  HARD_CLASSES,
  HARD_CORPUS_VERSION,
  HARD_PAGE_HEIGHT,
  HARD_PAGE_WIDTH,
  buildHardCorpus,
} from "./hard-corpus";
import { renderHardDocument } from "./hard-render";

describe("hard corpus manifest", () => {
  const corpus = buildHardCorpus();

  it("pins the corpus version and page geometry", () => {
    expect(manifest.corpus.version).toBe(HARD_CORPUS_VERSION);
    expect(manifest.corpus.pageWidthPx).toBe(HARD_PAGE_WIDTH);
    expect(manifest.corpus.pageHeightPx).toBe(HARD_PAGE_HEIGHT);
  });

  it("describes every class the generator declares", () => {
    expect(manifest.classes.map((entry) => entry.id)).toEqual(
      HARD_CLASSES.map((spec) => spec.id),
    );
    for (const spec of HARD_CLASSES) {
      const entry = manifest.classes.find((item) => item.id === spec.id);
      expect(entry?.documents).toBe(spec.documents);
      expect(entry?.difficulty).toBe(spec.difficulty);
      expect(entry?.fields).toEqual(spec.fields.map((field) => field.name));
    }
  });

  it("still renders every document to its pinned image hash", () => {
    expect(manifest.documents).toHaveLength(corpus.documents.length);
    for (const document of corpus.documents) {
      const pinned = manifest.documents.find(
        (entry) => entry.id === document.id,
      );
      expect(pinned, `no manifest entry for ${document.id}`).toBeDefined();
      expect(renderHardDocument(document).sha256).toBe(pinned?.imageSha256);
    }
  });

  it("still derives every document's pinned ground truth", () => {
    for (const document of corpus.documents) {
      const pinned = manifest.documents.find(
        (entry) => entry.id === document.id,
      );
      expect(
        createHash("sha256").update(document.referenceText).digest("hex"),
      ).toBe(pinned?.referenceSha256);
      expect(document.fields).toEqual(pinned?.fields);
    }
  });
});

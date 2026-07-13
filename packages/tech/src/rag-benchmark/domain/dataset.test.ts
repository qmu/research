import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadDataset, loadScifactSubset } from "./dataset";

describe("loadDataset (scifact-mini fixture)", () => {
  it("returns the committed keyless fixture corpus", () => {
    const dataset = loadDataset();
    expect(dataset.id).toBe("scifact-mini");
    expect(dataset.documents.length).toBeGreaterThan(0);
    expect(dataset.qrels.length).toBeGreaterThan(0);
  });
});

describe("loadScifactSubset (real BEIR subset)", () => {
  const cachePresent = existsSync(
    resolve(import.meta.dirname, "../../../.cache/scifact/corpus.jsonl"),
  );

  // The CC BY-NC corpus text is never committed; the loader filters a fetched,
  // gitignored cache to the committed id manifest. Skip when the cache is absent
  // (e.g. keyless CI) so the suite stays keyless and byte-stable.
  it.skipIf(!cachePresent)(
    "filters the fetched corpus to the committed manifest",
    () => {
      const dataset = loadScifactSubset();
      expect(dataset.id).toBe("scifact-beir-subset");
      // every qrel references a document and query that survived filtering
      const docIds = new Set(dataset.documents.map((d) => d.id));
      const queryIds = new Set(dataset.queries.map((q) => q.id));
      for (const qrel of dataset.qrels) {
        expect(docIds.has(qrel.documentId)).toBe(true);
        expect(queryIds.has(qrel.queryId)).toBe(true);
      }
      expect(dataset.documents.length).toBeGreaterThan(dataset.qrels.length);
      expect(dataset.queries.length).toBe(100);
      expect(dataset.documents.length).toBe(400);
    },
  );
});

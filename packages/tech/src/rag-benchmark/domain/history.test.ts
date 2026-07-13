import { describe, expect, it } from "vitest";
import {
  appendHistory,
  buildHistoryEntry,
  redactBenchmarkResultForArchive,
  toHistoryPoint,
} from "./history";
import type {
  Backend,
  BackendRun,
  BenchmarkResult,
  HistoryFile,
  Provenance,
} from "./types";

const backend = (id: string): Backend => ({
  id,
  name: id,
  kind: "self-managed",
  embeddingCoupling: "fixed",
  isolatedStore: true,
  retrievalDeterministic: true,
  source: "https://example.com",
  costNote: "fixture",
  metadataFiltering: false,
});

const run = (
  id: string,
  provenance: Provenance,
  measuredAt = "2026-01-01T00:00:00.000Z",
): BackendRun => ({
  backend: backend(id),
  provenance,
  measuredAt,
  embeddingModel: "fixture-embedding",
  datasetId: "mini",
  k: 3,
  retrieval: {
    recallAtK: provenance === "error" ? 0 : 0.8,
    ndcgAtK: provenance === "error" ? 0 : 0.7,
    mrr: provenance === "error" ? 0 : 0.5,
    recallAtKCi95: { lower: 0.6, upper: 1 },
    ndcgAtKCi95: { lower: 0.4, upper: 0.9 },
    mrrCi95: { lower: 0.3, upper: 0.7 },
    queryCount: 3,
    trialCount: 3,
    trialStdDev:
      provenance === "error"
        ? undefined
        : { recallAtK: 0.1, ndcgAtK: 0.2, mrr: 0.3 },
    intervalNote: "test",
  },
  operational: {
    ingestMs: provenance === "error" ? 0 : 12,
    ingestMsStdDev: provenance === "error" ? 0 : 1.5,
    queryLatencyMs: provenance === "error" ? [] : [4, 5, 6],
    queryLatencyP50Ms: provenance === "error" ? 0 : 5,
    queryLatencyP50MsStdDev: provenance === "error" ? 0 : 0.5,
    queryLatencyP95Ms: provenance === "error" ? 0 : 8,
    queryLatencyP95MsStdDev: provenance === "error" ? 0 : 0.8,
    trialCount: 3,
    costUsd: provenance === "error" ? 0 : 0.0123,
    maxScale: 3,
  },
  queryResults: [],
  error: provenance === "error" ? "backend failed" : undefined,
});

describe("toHistoryPoint", () => {
  it("projects backend metrics + provenance + measuredAt, dropping query rows", () => {
    const point = toHistoryPoint(
      run("sqlite-vec", "measured", "2026-02-02T00:00:00.000Z"),
    );
    expect(point).toEqual({
      id: "sqlite-vec",
      provenance: "measured",
      recallAtK: {
        mean: 0.8,
        stdDev: 0.1,
        n: 3,
        method: "trial-sample-std-dev",
      },
      ndcgAtK: {
        mean: 0.7,
        stdDev: 0.2,
        n: 3,
        method: "trial-sample-std-dev",
      },
      mrr: {
        mean: 0.5,
        stdDev: 0.3,
        n: 3,
        method: "trial-sample-std-dev",
      },
      ingestMs: {
        mean: 12,
        stdDev: 1.5,
        n: 3,
        method: "trial-sample-std-dev",
      },
      p50Ms: {
        mean: 5,
        stdDev: 0.5,
        n: 3,
        method: "trial-sample-std-dev",
      },
      p95Ms: {
        mean: 8,
        stdDev: 0.8,
        n: 3,
        method: "trial-sample-std-dev",
      },
      costUsd: {
        mean: 0.0123,
        stdDev: 0,
        n: 3,
        method: "run-total",
      },
      measuredAt: "2026-02-02T00:00:00.000Z",
    });
  });

  it("preserves fixture and error provenance in history points", () => {
    expect(toHistoryPoint(run("fixture-store", "fixtured")).provenance).toBe(
      "fixtured",
    );
    const errored = toHistoryPoint(run("autorag", "error"));
    expect(errored.provenance).toBe("error");
    expect(errored.recallAtK.method).toBe("error-zero");
  });
});

describe("buildHistoryEntry", () => {
  it("stamps the run and carries one point per backend", () => {
    const entry = buildHistoryEntry(
      [run("sqlite-vec", "measured"), run("autorag", "error")],
      "2026-03-03T00:00:00.000Z",
      3,
    );
    expect(entry.generatedAt).toBe("2026-03-03T00:00:00.000Z");
    expect(entry.trials).toBe(3);
    expect(entry.points.map((point) => point.id)).toEqual([
      "sqlite-vec",
      "autorag",
    ]);
  });
});

describe("appendHistory", () => {
  it("seeds a fresh file when there is no prior history", () => {
    const entry = buildHistoryEntry([run("sqlite-vec", "measured")], "t1", 1);
    expect(appendHistory(null, entry).entries).toEqual([entry]);
  });

  it("appends a second time point after the first", () => {
    const e1 = buildHistoryEntry([run("sqlite-vec", "measured")], "t1", 1);
    const e2 = buildHistoryEntry([run("sqlite-vec", "measured")], "t2", 1);
    const file: HistoryFile = appendHistory(null, e1);
    const grown = appendHistory(file, e2);
    expect(grown.entries.map((entry) => entry.generatedAt)).toEqual([
      "t1",
      "t2",
    ]);
  });
});

const longCorpusText =
  "Glioblastomas are deadly cancers that display a functional cellular hierarchy maintained by self-renewing cells. ".repeat(
    4,
  );

const collectLongStringPaths = (
  value: unknown,
  path: ReadonlyArray<string> = [],
): ReadonlyArray<string> => {
  if (typeof value === "string") {
    return value.length > 150 ? [path.join(".")] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectLongStringPaths(item, [...path, String(index)]),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      collectLongStringPaths(item, [...path, key]),
    );
  }
  return [];
};

describe("redactBenchmarkResultForArchive", () => {
  it("removes document text, document title, and query prose from the archive copy", () => {
    const result: BenchmarkResult = {
      generatedAt: "2026-07-08T13:08:52.187Z",
      dataset: {
        id: "scifact-subset-v1",
        name: "SciFact subset",
        source: "https://example.com/scifact",
        license: "CC BY-NC 2.0",
        documents: [
          {
            id: "doc-1",
            title:
              "High density mapping of the MHC identifies a shared role for inflammatory bowel diseases.",
            text: longCorpusText,
          },
        ],
        queries: [
          {
            id: "query-1",
            text: `${longCorpusText} Is this claim supported?`,
          },
        ],
        qrels: [{ queryId: "query-1", documentId: "doc-1", relevance: 1 }],
      },
      runs: [
        {
          ...run("sqlite-vec", "measured"),
          queryResults: [
            {
              queryId: "query-1",
              results: [{ documentId: "doc-1", score: 0.9 }],
              metrics: { recallAtK: 1, ndcgAtK: 1, mrr: 1 },
            },
          ],
        },
      ],
      artifactPath: "rag-benchmark.real.data.json",
      fixture: false,
      trials: 3,
    };

    const archived = redactBenchmarkResultForArchive(result);

    expect(archived.dataset.documents).toEqual([{ id: "doc-1" }]);
    expect(archived.dataset.queries).toEqual([{ id: "query-1" }]);
    expect(archived.dataset.qrels).toEqual(result.dataset.qrels);
    expect(archived.runs[0]?.queryResults[0]?.results).toEqual([
      { documentId: "doc-1", score: 0.9 },
    ]);
    expect(collectLongStringPaths(archived)).toEqual([]);
    expect(result.dataset.documents[0]?.text).toBe(longCorpusText);
    expect(result.dataset.documents[0]?.title).toContain("High density");
    expect(result.dataset.queries[0]?.text).toContain("Is this claim");
  });
});

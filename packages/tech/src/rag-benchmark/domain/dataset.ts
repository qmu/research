import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  BenchmarkDataset,
  DocumentRecord,
  QueryRecord,
  RelevanceJudgment,
} from "./types";

export const SCIFACT_MINI: BenchmarkDataset = {
  id: "scifact-mini",
  name: "SciFact miniature subset",
  source: "https://github.com/allenai/scifact",
  license:
    "SciFact is Apache-2.0; this miniature fixture is repository-authored from SciFact-style claims.",
  documents: [
    {
      id: "D1",
      title: "Statin therapy and cardiovascular events",
      text: "Randomized trials report that statin therapy lowers LDL cholesterol and reduces major cardiovascular events in adults at elevated risk.",
    },
    {
      id: "D2",
      title: "Vitamin D and fracture risk",
      text: "Meta analyses of vitamin D supplementation show mixed fracture outcomes, with stronger effects when calcium is co-administered.",
    },
    {
      id: "D3",
      title: "CRISPR gene editing specificity",
      text: "CRISPR Cas9 systems can edit targeted genomic loci, but guide RNA design and delivery method influence off target activity.",
    },
    {
      id: "D4",
      title: "Mask use and respiratory droplets",
      text: "Laboratory studies show that face masks reduce emitted respiratory droplets during speech and coughing compared with no mask.",
    },
    {
      id: "D5",
      title: "Exercise and insulin sensitivity",
      text: "Regular aerobic exercise improves insulin sensitivity and glycemic control in adults with type 2 diabetes.",
    },
  ],
  queries: [
    {
      id: "Q1",
      text: "Do statins reduce cardiovascular events in adults at risk?",
    },
    {
      id: "Q2",
      text: "Does CRISPR editing depend on guide RNA design for specificity?",
    },
    {
      id: "Q3",
      text: "Can masks reduce respiratory droplets from speech and coughing?",
    },
  ],
  qrels: [
    { queryId: "Q1", documentId: "D1", relevance: 2 },
    { queryId: "Q2", documentId: "D3", relevance: 2 },
    { queryId: "Q3", documentId: "D4", relevance: 2 },
  ],
};

export const loadDataset = (): BenchmarkDataset => SCIFACT_MINI;

// --- Real SciFact subset (BEIR) -------------------------------------------
//
// The subset is pinned by a committed manifest of ids + qrels (facts). The
// corpus text itself is CC BY-NC and NEVER committed; it is fetched into a
// gitignored cache by scripts/fetch-scifact.sh and filtered to the manifest
// here at real-run time.

type ScifactManifest = Readonly<{
  source: string;
  origin: string;
  seed: number;
  queryIds: ReadonlyArray<string>;
  documentIds: ReadonlyArray<string>;
  qrels: ReadonlyArray<RelevanceJudgment>;
}>;

const MANIFEST_PATH = resolve(
  import.meta.dirname,
  "data/scifact-subset.manifest.json",
);
const CACHE_DIR = resolve(import.meta.dirname, "../../../.cache/scifact");

const loadScifactManifest = (): ScifactManifest =>
  JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ScifactManifest;

export const scifactSubsetQueryCount = (): number =>
  loadScifactManifest().queryIds.length;

const readJsonl = (path: string): ReadonlyArray<Record<string, unknown>> =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

export const loadScifactSubset = (): BenchmarkDataset => {
  const manifest = loadScifactManifest();

  let corpusRows: ReadonlyArray<Record<string, unknown>>;
  let queryRows: ReadonlyArray<Record<string, unknown>>;
  try {
    corpusRows = readJsonl(resolve(CACHE_DIR, "corpus.jsonl"));
    queryRows = readJsonl(resolve(CACHE_DIR, "queries.jsonl"));
  } catch {
    throw new Error(
      "SciFact cache missing. Run scripts/fetch-scifact.sh once to download the " +
        "CC BY-NC corpus into packages/tech/.cache/scifact/ (never committed).",
    );
  }

  const wantedDocs = new Set(manifest.documentIds);
  const wantedQueries = new Set(manifest.queryIds);
  const documents: ReadonlyArray<DocumentRecord> = corpusRows
    .filter((row) => wantedDocs.has(String(row._id)))
    .map((row) => ({
      id: String(row._id),
      title: String(row.title ?? ""),
      text: String(row.text ?? ""),
    }));
  const queries: ReadonlyArray<QueryRecord> = queryRows
    .filter((row) => wantedQueries.has(String(row._id)))
    .map((row) => ({ id: String(row._id), text: String(row.text ?? "") }));

  return {
    id: "scifact-beir-subset",
    name: "SciFact (BEIR) subset",
    source: manifest.source,
    license: manifest.origin,
    documents,
    queries,
    qrels: manifest.qrels,
  };
};

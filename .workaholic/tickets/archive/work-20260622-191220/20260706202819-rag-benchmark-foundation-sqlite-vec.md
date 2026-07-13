---
created_at: 2026-07-06T20:28:19+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort: 4h
commit_hash: 9b75a7d
category: Added
depends_on:
---

# Establish the rag-benchmark research topic (retrieval quality + operational) with sqlite-vec

## Overview

A new technical research topic that compares vector-store / RAG-database backends on
**both retrieval quality and operational characteristics**, so a reader — and qmu's
own retrieval-heavy product work — can choose a store on evidence. This **foundation**
ticket stands up the topic scaffold + the benchmark methodology + the first backend,
**sqlite-vec** (local, keyless — can run real even in CI). The other backends are
follow-up tickets that plug into this harness: OpenAI vector store, AWS S3 Vectors,
and Cloudflare Vectorize/AutoRAG (each `depends_on` this).

**Business/legal rationale (planning lens):** the choice of vector store materially
affects retrieval quality, latency, cost, and scale for the RAG systems qmu builds. A
reproducible, honest benchmark de-risks that choice. The corpus is a **public IR
dataset (no PII)**; credentials and per-run cost are documented in the result page so
a reader can clone and reproduce.

## Design decisions (per owner, 2026-07-06)

1. **Metrics — both.** Retrieval quality (**recall@k, nDCG@k, MRR** against labeled
   relevance judgments) AND operational (ingest/index throughput, query latency
   p50/p95, cost per 1M vectors + per query, metadata-filtering support, max tested
   scale).
2. **Embeddings — fixed where possible, managed flagged.** Use ONE fixed embedding
   model for **self-managed** stores (sqlite-vec here; Vectorize/S3 later) to isolate
   the store. **Fully-managed** stores (OpenAI File Search, Cloudflare AutoRAG later)
   embed internally and are flagged **"whole-stack, not store-isolated"** — never
   presented next to fixed-embedding numbers without that caveat. This foundation
   establishes the fixed-embedding path with sqlite-vec.
3. **Scope — this ticket is the harness + sqlite-vec only.** OpenAI, AWS S3 Vectors,
   and Cloudflare are separate follow-up tickets (`depends_on` this). The harness must
   make adding a backend a thin ACL + registry-card change (as `vendors/llm/` +
   `models.ts` did for the llm-comparison topic).
4. **Dataset — small public BEIR subset.** e.g. SciFact / NFCorpus / FiQA with
   published `qrels` (reproducible + citable). Real runs owner-triggered; a keyless
   deterministic **fixture** path keeps CI green; sqlite-vec MAY run real in CI
   (local/free) if deterministic and fast.

## Policies

- `workaholic:planning` — a new research project states its business/market/legal
  context in the report; public no-PII corpus; documented credentials + expected cost.
- `workaholic:design` / `vendor-neutrality.md` — each store sits behind an
  anti-corruption layer in `src/vendors/vectorstore/<store>.ts`, named in domain terms
  (a `VectorStore` port: upsert / query); the domain never imports an SDK type.
  Record every new dependency in `docs/dependency-decisions.md`.
- `workaholic:implementation` / `directory-structure.md` + `coding-standards.md` —
  pure metric/scoring/dataset logic in `src/rag-benchmark/domain/`; SDK access in
  `vendors/`; thin runner in `entrypoints/`. Curated backend facts (a registry) are
  type-separated from measured behavior (as in `llm-model-comparison/domain/types.ts`).
- `workaholic:implementation` / `objective-documentation.md` — every non-measured
  cell flagged (`fixtured` / `error` / `n/a`); the dataset is cited and
  correct-as-of-source; numbers are real-run-only, never faked.
- `workaholic:operation` / `ci-cd.md` — a keyless deterministic fixture path is the
  byte-stable CI self-test (mirrors `compare:fixture`); real cloud runs never in CI;
  sqlite-vec real-in-CI is acceptable only if deterministic + fast, else fixtured.

## Key Files (to create — mirror the llm-model-comparison topic)

- `packages/tech/src/rag-benchmark/domain/types.ts` — the `VectorStore` port
  (`upsert`, `query`), a curated `Backend` registry card (name, kind
  self-managed|managed, embedding coupling, cost, `source`), a `QueryResult`, and the
  metric types (`RetrievalMetrics`: recall@k / nDCG@k / MRR; `OperationalMetrics`:
  ingestMs, latency distribution, costUsd, maxScale). Curated vs measured separated
  by types.
- `packages/tech/src/rag-benchmark/domain/{retrieval-metrics,operational,aggregate}.ts`
  — pure scorers (recall@k / nDCG@k / MRR; latency percentiles; aggregate over
  trials). Unit-tested against known inputs.
- `packages/tech/src/rag-benchmark/domain/dataset.ts` — pure loader/shaper for the
  BEIR-subset corpus + queries + `qrels` (parse, not fetch).
- `packages/tech/src/rag-benchmark/backends.ts` — curated registry (start:
  `sqlite-vec`; the follow-ups add `openai-vector-store`, `s3-vectors`, `vectorize`,
  `autorag`).
- `packages/tech/src/vendors/embedding/` — a fixed-embedding ACL (one model for the
  self-managed stores) + a deterministic fixture embedding for keyless CI.
- `packages/tech/src/vendors/vectorstore/{sqlite-vec,fixture}.ts` — the sqlite-vec ACL
  implementing the `VectorStore` port + a deterministic fixture store for keyless CI
  (like `vendors/llm/fixture.ts`).
- `packages/tech/src/entrypoints/run-rag-benchmark.ts` — thin runner: ingest → query
  → score → emit report + JSON artifact (the complete record); `--fixture` keyless
  path; cost estimate before real runs (mirror `run-llm-model-comparison.ts`).
- `docs/research-reports/rag-benchmark.{md,data.json}` — committed fixture self-test;
  real numbers owner-triggered. `docs/dependency-decisions.md` — record sqlite-vec
  (+ the sqlite extension) and the embedding SDK. `packages/tech/package.json` —
  `rag:fixture`, `rag`, `rag:estimate`.

## Implementation Steps

1. Scaffold `src/rag-benchmark/domain/` + `vendors/vectorstore/` + `vendors/embedding/`
   per `packages/tech/TEMPLATE.md`.
2. Define the `VectorStore` port + `Backend` registry + metric types in
   `domain/types.ts` — designed so a new backend is a thin ACL + one registry card.
3. Pure scorers: recall@k / nDCG@k / MRR (`retrieval-metrics.ts`); latency percentiles
   + trial aggregation (`operational.ts`, `aggregate.ts`). Unit tests with known
   inputs and hand-computed expected values.
4. Dataset loader (`dataset.ts`): parse a committed (or fetch+cache, cited) BEIR
   subset — corpus / queries / `qrels`; keep it small.
5. Fixed-embedding ACL (`vendors/embedding/`) + fixture embedding for determinism.
6. sqlite-vec ACL: upsert + kNN query via the sqlite-vec extension (local, no key).
7. Fixture store + deterministic fixture path so `rag:fixture` is keyless + byte-stable.
8. Runner: `--fixture` path; real path with printed cost estimate; JSON artifact =
   complete record; report render.
9. Report page + `dependency-decisions.md` entries; `make docs` preview.
10. Verify (Quality Gate).

## Considerations

- **Harness-first:** the value of this ticket is a clean backend seam — the follow-up
  cloud stores must slot in as a thin ACL + registry card, no domain change.
- **sqlite-vec is a native extension:** document install/load and CI availability; if
  it can't load in CI, fall back to fixtured there (honest), don't fail.
- **Dataset:** keep the BEIR subset small enough to ingest fast and commit (or
  fetch+cache with a cited source + license); `qrels` drive recall/nDCG/MRR.
- **Fixed embedding** is established here so later self-managed stores reuse it;
  managed stores (added later) are flagged not-store-isolated.
- Reuses the llm-model-comparison patterns (registry + ACL + keyless fixture +
  JSON-artifact-as-full-record; see memory `llm-comparison-artifact-full-record`).

## Quality Gate

- The `rag-benchmark` topic exists with the layered structure (pure `domain/` +
  `vendors/` ACLs + thin `entrypoints/` runner), and `npm run rag:fixture` runs
  **keyless and byte-stable** — a deterministic fixture self-test committed as
  `docs/research-reports/rag-benchmark.{md,data.json}`, mirroring `compare:fixture`.
- Retrieval-quality scorers (recall@k, nDCG@k, MRR) and operational aggregates are
  **unit-tested against known inputs with expected values**.
- A real run measures **sqlite-vec** live on the cited BEIR subset — producing
  recall/nDCG/MRR + ingest/latency/cost — with every non-measured cell flagged
  honestly; a cost estimate prints before any real run.
- Adding a backend is demonstrably a thin ACL + registry-card change (no domain edit).
- `npm test` (tsc + vitest), `npm run lint`, `make build` all green;
  `dependency-decisions.md` updated; the report documents exact commands, credentials,
  and expected cost so a reader can reproduce.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: A real `npm run rag` overwrites the committed fixture baseline
  `docs/research-reports/rag-benchmark.{md,data.json}` in place; run
  `npm run rag:fixture` afterwards to restore the byte-stable artifact before
  committing.
  **Context**: The committed report doubles as the CI self-test — an accidental
  commit of real-run timings would make `rag:fixture` byte-stability checks fail
  and leak machine-dependent numbers into the reviewed baseline.
- **Insight**: better-sqlite3 pulls a native prebuild chain (bindings,
  prebuild-install, tar-fs …) into package-lock.json; the sqlite-vec extension
  loads via `sqliteVec.load(db)` inside the ACL only, so CI without native
  support degrades to the fixture store honestly.
  **Context**: Future backend tickets should keep native/module concerns inside
  `vendors/vectorstore/` so `domain/` stays portable.

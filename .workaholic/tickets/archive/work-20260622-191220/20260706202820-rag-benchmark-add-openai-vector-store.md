---
created_at: 2026-07-06T20:28:20+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash: 255226d
category: Added
depends_on: 20260706202819-rag-benchmark-foundation-sqlite-vec.md
---

# Add the OpenAI vector store (File Search) backend to the rag-benchmark

## Overview

Add OpenAI's managed vector store / **File Search** as a backend to the rag-benchmark
harness (from the foundation ticket). It is a **fully-managed, managed-embedding**
store: you upload documents and OpenAI embeds + indexes internally, so its numbers
compare the **whole stack**, not the store in isolation — flagged accordingly. Reuses
the existing `OPENAI_API_KEY` (already funded and on hand).

## Design decisions (per owner, 2026-07-06)

1. **Managed-embedding, flagged.** OpenAI File Search embeds internally; the backend
   card declares `kind: managed` and its rows are flagged **"whole-stack, not
   store-isolated"** — never presented next to the fixed-embedding self-managed stores
   without that caveat (`objective-documentation`).
2. **Same probes as every backend.** Scored on the foundation's generic retrieval
   (recall@k / nDCG@k / MRR on the cited BEIR subset) + operational (ingest, query
   latency, cost) probes — no OpenAI-specific metric.
3. **Registry + ACL only.** No domain change: a new `vendors/vectorstore/openai.ts`
   ACL implementing the `VectorStore` port + one `backends.ts` card, exactly as the
   foundation's backend seam intends.

## Policies

- `workaholic:design` / `vendor-neutrality.md` — the OpenAI SDK stays behind
  `vendors/vectorstore/openai.ts`; the domain and runner are untouched. Record the
  dependency in `docs/dependency-decisions.md` (the `openai` SDK is already a dep).
- `workaholic:implementation` / `objective-documentation.md` — managed-embedding rows
  flagged not-store-isolated; a key-absent run renders the card `fixtured`, never
  faked; costs cited to OpenAI's pricing page, correct-as-of-source.
- `workaholic:operation` / `ci-cd.md` — `rag:fixture` stays keyless + byte-stable
  after adding the card (regenerate the committed baseline); the real OpenAI run is
  owner-triggered, never in CI.

## Key Files

- `packages/tech/src/vendors/vectorstore/openai.ts` — NEW ACL: create a vector store,
  upload/ingest the corpus, run File Search queries, map results to the domain
  `QueryResult`. Reuses `OPENAI_API_KEY`.
- `packages/tech/src/rag-benchmark/backends.ts` — add the `openai-vector-store` card
  (`kind: managed`, managed embedding, cost, `source`).
- `packages/tech/src/entrypoints/run-rag-benchmark.ts` — register the backend in the
  key/factory maps (as `run-llm-model-comparison.ts` does per provider); no other
  change.
- `docs/research-reports/rag-benchmark.{md,data.json}` — regenerate the keyless
  fixture baseline to include the new card. `docs/dependency-decisions.md` — note the
  File Search surface.

## Implementation Steps

1. Implement the `VectorStore` ACL against OpenAI File Search (create store, ingest,
   query); confine all SDK types to this file.
2. Add the `openai-vector-store` registry card (`kind: managed`), cited to OpenAI docs.
3. Wire the backend into the runner's factory/key map; ensure the fixture path renders
   it deterministically when keyless.
4. Regenerate + verify (Quality Gate): `rag:fixture` ×2 byte-identical; then a real
   `--backends openai-vector-store` run measures it live.

## Considerations

- **Store isolation:** File Search does not accept an external embedding, so it can
  never be a fixed-embedding comparison — the not-store-isolated flag is mandatory,
  not optional.
- **Cost + persistence:** vector-store storage + File Search calls cost; print the
  estimate before the real run and clean up test stores after (avoid dangling storage
  cost). CI never runs it real.
- **Ingest shape:** File Search chunks documents itself — record the chunking as a
  curated fact so the comparison is honest about what was indexed.

## Quality Gate

- The `openai-vector-store` card appears in the matrix and **measures live**
  (`measured`, 0 errors) via the new ACL on the cited BEIR subset, with recall@k /
  nDCG@k / MRR + ingest/latency/cost, flagged **not-store-isolated**; a cost estimate
  prints before the real run and test stores are cleaned up.
- `rag:fixture` ×2 byte-identical (baseline regenerated); a key-absent run renders the
  card `fixtured`, never faked.
- `npm test` (tsc + vitest), `npm run lint`, `make build` all green;
  `dependency-decisions.md` updated.

## Final Report

Development completed as planned. The live run measured the backend correctly
(recall/nDCG/MRR = 1.0 on the mini set, ingest ~38s, query p50/p95 ~1.5s, ~$0.0075)
and its test vector store + uploaded files were confirmed deleted afterward.

### Discovered Insights

- **Insight**: The `VectorStore` port had to grow from `query(vector, k)` to
  `query({ text, vector }, k)` to admit a managed store. Self-managed stores
  (sqlite-vec, fixture) ignore `text`; the managed OpenAI store ignores `vector`
  and searches by `text`. This is the one domain-type change the foundation seam
  did not anticipate — every future managed backend reuses it, so no further port
  change is expected.
  **Context**: The foundation ticket claimed "a new backend is a thin ACL + one
  card, no domain change." That held for a self-managed store but not for the
  first managed one; the `StoreQuery` widening is a one-time cost now paid.
- **Insight**: Credential-gating lives in the runner's `STORE_FACTORIES` map
  (`keyEnv`), not the ACL. A backend whose `keyEnv` is unset falls back to the
  deterministic fixture store and is flagged `fixtured` — so `rag:fixture` stays
  byte-stable and a key-absent real run is honest rather than an error.
  **Context**: Keeps the ACL free of env-var/branching concerns; the AWS and
  Cloudflare backends should register the same way (their credential env var as
  `keyEnv`).
- **Insight**: OpenAI File Search chunks server-side (recorded as a curated
  `ingestionNote`), so its indexed unit is a chunk, not the committed document —
  surfaced in the report's "Backend notes" so the managed rows are never read as
  a like-for-like store comparison.
  **Context**: `objective-documentation` honesty: managed numbers cover the whole
  stack, and the report says so explicitly next to the flag.

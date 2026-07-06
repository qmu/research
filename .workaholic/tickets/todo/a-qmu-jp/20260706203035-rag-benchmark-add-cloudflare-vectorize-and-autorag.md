---
created_at: 2026-07-06T20:30:35+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 4h
commit_hash:
category: Added
depends_on: 20260706202819-rag-benchmark-foundation-sqlite-vec.md
---

# Add Cloudflare Vectorize and AutoRAG backends to the rag-benchmark

## Overview

Add Cloudflare's two RAG offerings as backends to the rag-benchmark harness:

- **Vectorize** — Cloudflare's **self-managed** vector database. Stores/searches
  vectors we provide, so it uses the foundation's **fixed embedding** and is a
  **store-isolated** comparison (peer to sqlite-vec / S3 Vectors).
- **AutoRAG** — Cloudflare's **fully-managed** RAG pipeline (ingest → embed → index →
  retrieve, internally). Its numbers compare the **whole stack**, flagged
  not-store-isolated (peer to OpenAI File Search).

(Answers the original request's "the one on Cloudflare (if there is any)" — Cloudflare
has **both**, as of planning; verify current availability/limits live at
implementation.) Credential-gated on a Cloudflare account.

## Design decisions (per owner, 2026-07-06)

1. **Two cards, two kinds.** `vectorize` (`kind: self-managed`, fixed embedding,
   store-isolated) and `autorag` (`kind: managed`, internal embedding, flagged
   whole-stack). Both scored on the same generic probes (recall@k / nDCG@k / MRR +
   ingest/latency/cost on the cited BEIR subset).
2. **Registry + ACL only** — new `vendors/vectorstore/{vectorize,autorag}.ts` + two
   `backends.ts` cards; no domain change.
3. **Fixed embedding for Vectorize.** Vectorize may pair with Workers AI embeddings,
   but for a store-isolated reading it uses the foundation's fixed embedding; the
   Workers-AI-native pairing (if measured) is a separate, explicitly-flagged config.

## Policies

- `workaholic:design` / `vendor-neutrality.md` — Cloudflare access (REST API /
  Workers AI / the Cloudflare SDK) stays behind the two ACLs; domain/runner untouched.
  Record dependencies in `docs/dependency-decisions.md`. (The `cloudflare` skill is
  available for current API details — prefer it over pre-trained knowledge.)
- `workaholic:implementation` / `objective-documentation.md` — AutoRAG rows flagged
  not-store-isolated; a credential-absent run renders `fixtured` honestly; a
  retired/renamed product surfaces as an honest `error`, never faked; pricing cited
  correct-as-of-source.
- `workaholic:operation` / `ci-cd.md` — `rag:fixture` stays keyless + byte-stable
  after the cards are added; the real Cloudflare runs are owner-triggered, never in CI.

## Key Files

- `packages/tech/src/vendors/vectorstore/vectorize.ts` — NEW ACL: create index, upsert
  vectors (fixed embedding), query kNN → domain `QueryResult`.
- `packages/tech/src/vendors/vectorstore/autorag.ts` — NEW ACL: point at an AutoRAG
  instance, ingest the corpus, run managed retrieval → domain `QueryResult`.
- `packages/tech/src/rag-benchmark/backends.ts` — add the `vectorize` and `autorag`
  cards.
- `packages/tech/src/entrypoints/run-rag-benchmark.ts` — register both in the
  key/factory map. `docs/research-reports/rag-benchmark.{md,data.json}` — regenerate
  the fixture baseline. `docs/dependency-decisions.md` — record the Cloudflare deps.

## Implementation Steps

1. **Verify live first** (use the `cloudflare` skill): confirm Vectorize + AutoRAG
   availability, the exact APIs, auth (account id + API token), and any dimension
   limits. Treat ids/limits as correct-as-of-source.
2. Implement the Vectorize ACL (fixed embedding, store-isolated); confine SDK/HTTP
   types to the file.
3. Implement the AutoRAG ACL (managed retrieval), flagged not-store-isolated.
4. Add both registry cards, cited to Cloudflare docs.
5. Wire both into the runner; ensure the fixture path renders them deterministically.
6. Regenerate + verify (Quality Gate).

## Considerations

- **Availability risk:** if AutoRAG (or a specific API) is unavailable to the account,
  render that card an honest `error`/`fixtured` and note it — do not fake it or block
  Vectorize.
- **Embedding dimension** for Vectorize's index must match the fixed embedding; assert
  it. Optionally add a separate Workers-AI-native Vectorize config, clearly flagged as
  a different embedding stack.
- **Cleanup:** delete test indexes / AutoRAG resources after a real run.

## Quality Gate

- Both `vectorize` (store-isolated, fixed embedding) and `autorag` (flagged
  not-store-isolated) cards appear in the matrix and **measure live** (`measured`, 0
  errors) via the new ACLs on the cited BEIR subset (recall@k / nDCG@k / MRR +
  ingest/latency/cost); a cost estimate prints before the real run and test resources
  are cleaned up.
- `rag:fixture` ×2 byte-identical (baseline regenerated); a credential-absent or
  product-unavailable run renders `fixtured` / `error` honestly.
- `npm test` (tsc + vitest), `npm run lint`, `make build` all green;
  `dependency-decisions.md` updated with the Cloudflare deps.

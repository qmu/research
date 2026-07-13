---
created_at: 2026-07-06T20:28:21+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash: 46249f8
category: Added
depends_on: 20260706202819-rag-benchmark-foundation-sqlite-vec.md
---

# Add AWS S3 Vectors backend to the rag-benchmark

## Overview

Add **AWS S3 Vectors** (vector storage + kNN query on S3 vector buckets/indexes) as a
backend to the rag-benchmark harness. It is a **self-managed** store: it stores and
searches vectors we provide, so it uses the foundation's **fixed embedding** and is a
**store-isolated** comparison. Credential-gated on AWS access — this ticket is a
follow-up to be driven once AWS credentials + region availability are confirmed.

## Design decisions (per owner, 2026-07-06)

1. **Self-managed, fixed embedding.** Reuses the foundation's fixed embedding model
   (not an AWS-native one) so S3 Vectors is compared store-to-store with sqlite-vec /
   Vectorize — a true store-isolated reading.
2. **Same probes as every backend** (recall@k / nDCG@k / MRR + ingest/latency/cost on
   the cited BEIR subset); no S3-specific metric.
3. **Registry + ACL only** — new `vendors/vectorstore/s3-vectors.ts` + one
   `backends.ts` card; no domain change.

## Policies

- `workaholic:design` / `vendor-neutrality.md` — the AWS SDK (`@aws-sdk/*`) stays
  behind `vendors/vectorstore/s3-vectors.ts`; domain/runner untouched. Record the new
  dependency in `docs/dependency-decisions.md` with a license/reputation assessment.
- `workaholic:implementation` / `objective-documentation.md` — a credential-absent or
  region-unavailable run renders the card `fixtured` / `error` honestly, never faked;
  S3 Vectors pricing cited, correct-as-of-source.
- `workaholic:operation` / `ci-cd.md` — `rag:fixture` stays keyless + byte-stable
  after the card is added; the real AWS run is owner-triggered, never in CI.

## Key Files

- `packages/tech/src/vendors/vectorstore/s3-vectors.ts` — NEW ACL: create a vector
  bucket/index, put vectors (from the fixed embedding), query kNN, map to the domain
  `QueryResult`. Uses AWS credentials from the standard env/credential chain.
- `packages/tech/src/rag-benchmark/backends.ts` — add the `s3-vectors` card
  (`kind: self-managed`, fixed embedding, cost, `source`).
- `packages/tech/src/entrypoints/run-rag-benchmark.ts` — register in the key/factory
  map. `docs/research-reports/rag-benchmark.{md,data.json}` — regenerate the fixture
  baseline. `docs/dependency-decisions.md` — record the AWS SDK.

## Implementation Steps

1. **Verify live first:** confirm S3 Vectors availability + region + the exact API
   (bucket/index create, put, query) with real AWS credentials before wiring — treat
   the ids/limits as correct-as-of-source (this surface is newer and moves).
2. Implement the `VectorStore` ACL; confine all AWS SDK types to this file; reuse the
   fixed embedding.
3. Add the `s3-vectors` registry card, cited to AWS docs.
4. Wire into the runner; ensure the fixture path renders it deterministically.
5. Regenerate + verify (Quality Gate).

## Considerations

- **Credential + region gating:** S3 Vectors may be region-limited; document the
  required region and IAM permissions in the report; an unavailable region is an
  honest `error`, not a fake number.
- **Fixed embedding dimension** must match what S3 Vectors' index is created with —
  assert it, and surface a mismatch as a clear error.
- **Cleanup:** delete the test bucket/index after a real run to avoid dangling storage
  cost.

## Quality Gate

- The `s3-vectors` card appears in the matrix and **measures live** (`measured`, 0
  errors) via the new ACL on the cited BEIR subset (recall@k / nDCG@k / MRR +
  ingest/latency/cost), as a **store-isolated** (fixed-embedding) reading; a cost
  estimate prints before the real run and test resources are cleaned up.
- `rag:fixture` ×2 byte-identical (baseline regenerated); a credential-absent /
  region-unavailable run renders `fixtured` / `error` honestly.
- `npm test` (tsc + vitest), `npm run lint`, `make build` all green;
  `dependency-decisions.md` updated with the AWS SDK assessment.

## Final Report

Development completed as planned. Verified the live S3 Vectors API before wiring
(create-vector-bucket → create-index float32/cosine → put-vectors → query-vectors
→ delete), then implemented the ACL against it. The live run measured the backend
(store-isolated, recall/nDCG/MRR = 1.0, ingest ~1.0s, query p50/p95 ~99/105ms) and
its test bucket + index were confirmed deleted afterward.

### Discovered Insights

- **Insight**: The AWS S3 Vectors SDK (`@aws-sdk/client-s3vectors`) could not be
  installed at its current release: the repo's `.npmrc` sets `min-release-age=7`,
  and every release newer than `3.1066.0` (2026-06-10) was younger than that
  supply-chain floor. Pinned to `3.1066.0` rather than overriding the gate.
  **Context**: This service client is new and ships frequent releases; a future
  bump must still clear the 7-day floor, and ids/limits should be re-verified
  against the live API (the surface moves).
- **Insight**: S3 Vectors credential-gating can't key on a single env var —
  credentials resolve from the AWS chain (named profile, explicit keys, or SSO).
  The runner's `keyEnv` was generalized from a single string to a list matched
  with "any present" (`AWS_PROFILE` | `AWS_ACCESS_KEY_ID`).
  **Context**: Any future SDK-chain-authenticated backend should register its
  candidate env vars the same way; a key-absent run then falls back to the
  fixtured store honestly.
- **Insight**: S3 Vectors returns cosine *distance* (smaller = closer), so the
  ACL negates it to the domain's higher-is-better score — identical convention to
  the sqlite-vec ACL, which keeps the two self-managed rows directly comparable.
  **Context**: Any new distance-based store must negate to score, or its ranking
  inverts silently (metrics would collapse without an error).

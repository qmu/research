# Dependency decisions

Per the vendor-neutrality policy, every external dependency (library, SDK, SaaS,
managed infrastructure, dataset) is recorded here before adoption. Implement it
ourselves first; depend only when the value clearly exceeds the cost of exit.

## Template

```
### <dependency>

- **Reason**: why we need it; what we considered implementing ourselves.
- **Assessment**:
  - License: <license, and compatibility with this MIT public repo>
  - Reputation: <maintainer, adoption, security history>
  - Development status: <active? release cadence?>
  - Sustainability: <bus factor, funding, governance>
- **Monitoring**: how we watch for problems (Dependabot, advisories).
- **Exit strategy**: how we replace it; what the anti-corruption layer isolates.
```

## Decisions

### typescript, @types/node, tsx, vitest, eslint, typescript-eslint, prettier

- **Reason**: Baseline TypeScript toolchain for the research packages; building
  a type checker, test runner, or formatter ourselves is out of scope.
- **Assessment**:
  - License: MIT / Apache-2.0 — compatible with this MIT repo.
  - Reputation: De-facto standard tooling, broad adoption, active security response.
  - Development status: Actively maintained.
  - Sustainability: Backed by Microsoft (TypeScript), the OpenJS Foundation, and
    well-funded OSS projects.
- **Monitoring**: Dependabot (`.github/dependabot.yml`), `npm audit` in CI.
- **Exit strategy**: Standard, swappable tooling; no domain logic depends on them.

### @anthropic-ai/sdk (packages/tech)

- **Reason**: The `llm-benchmark` topic calls the Anthropic Messages API. Implementing an HTTP client by hand would duplicate ret/streaming/typing the SDK provides; the dependency is isolated behind `packages/tech/src/vendors/llm/`.
- **Assessment**:
  - License: MIT — compatible with this MIT repo.
  - Reputation: Official Anthropic SDK; actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by Anthropic.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `LlmClient` anti-corruption layer (`generateAnswer`); swapping providers means adding another `src/vendors/llm/` implementation, not touching benchmark logic.

### openai (packages/tech)

- **Reason**: The `llm-model-comparison` topic measures OpenAI models live. The official SDK provides typed request/response and usage shapes; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/openai.ts` (Chat Completions) and `packages/tech/src/vendors/llm/openai-responses.ts` (the Responses API, for the `-codex` coding models). The **same SDK also fronts the xAI OpenAI-compatible endpoint** (the Grok lineup — `grok-4.3`, the `grok-4.20-0309` reasoning/non-reasoning pair, and the `grok-build-0.1` coding model) via a base-URL variant in `vendors/llm/xai.ts` — no new dependency is taken on for xAI; only a base URL differs. The `rag-benchmark` topic reuses the **same already-present SDK** for a second surface — OpenAI's managed **vector store / File Search** — isolated behind `packages/tech/src/vendors/vectorstore/openai.ts` (create store, upload+poll files, `vectorStores.search`); no new dependency is taken on, and that ACL implements the domain `VectorStore` port.
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official OpenAI SDK; broad adoption, actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by OpenAI.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `CompletionClient` contract; the SDK's usage shape is normalized to `Completion.outputTokens` in `vendors/llm/usage.ts`, so dropping the provider is a one-file change with no domain impact.

### @google/genai (packages/tech)

- **Reason**: The `llm-model-comparison` topic measures Google Gemini models live. The official SDK provides typed access and usage metadata; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/google.ts`.
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official Google Gen AI SDK; actively maintained.
  - Development status: Active, frequent releases.
  - Sustainability: Vendored by Google.
- **Monitoring**: Dependabot, `npm audit` in CI.
- **Exit strategy**: Reached only through the domain-named `CompletionClient` contract; `usageMetadata.candidatesTokenCount` is normalized to `Completion.outputTokens` in `vendors/llm/usage.ts`, so dropping the provider is a one-file change with no domain impact.

### sqlite-vec, better-sqlite3, @types/better-sqlite3 (packages/tech)

- **Reason**: The `rag-benchmark` topic needs a local, keyless vector-store
  baseline before any managed retrieval provider is measured. Implementing an
  approximate-nearest-neighbor index and SQLite binding ourselves would distract
  from the benchmark objective. `sqlite-vec` provides the vector extension,
  `better-sqlite3` provides an embedded database driver, and
  `@types/better-sqlite3` keeps the driver boundary typed. All access is isolated
  behind `packages/tech/src/vendors/vectorstore/sqlite-vec.ts`.
- **Assessment**:
  - License: `sqlite-vec` is MIT OR Apache-2.0, `better-sqlite3` is MIT, and
    `@types/better-sqlite3` follows the DefinitelyTyped MIT license;
    compatible with this MIT repo.
  - Reputation: `sqlite-vec` is a focused SQLite extension by Alex Garcia;
    `better-sqlite3` is widely adopted in Node.js projects.
  - Development status: `sqlite-vec` is young but actively released;
    `better-sqlite3` is mature and maintained.
  - Sustainability: The benchmark is protected by a `VectorStore`
    anti-corruption layer and keeps a deterministic fixture store for no-dependency
    test runs.
- **Monitoring**: Dependabot, `npm audit` in CI, and local benchmark fixture
  stability checks.
- **Exit strategy**: Replace only the `VectorStore` adapter and backend registry
  entry. Domain scoring, reports, and datasets do not depend on SQLite APIs.

### @aws-sdk/client-s3vectors (packages/tech)

- **Reason**: The `rag-benchmark` topic measures **AWS S3 Vectors** as a
  self-managed, fixed-embedding backend. The official AWS SDK v3 client provides
  typed commands for the vector bucket/index/put/query surface; hand-rolling a
  SigV4 HTTP client would duplicate that. All access is isolated behind
  `packages/tech/src/vendors/vectorstore/s3-vectors.ts`, which implements the
  domain `VectorStore` port. Pinned to `3.1066.0` — the newest release that
  clears the repo's `min-release-age=7` supply-chain gate (`.npmrc`); the S3
  Vectors client is new and its later releases were younger than that floor when
  this landed.
- **Assessment**:
  - License: Apache-2.0 — compatible with this MIT repo.
  - Reputation: Official AWS SDK for JavaScript v3, vendored by AWS.
  - Development status: Active; the S3 Vectors client tracks a newer AWS service,
    so treat ids/limits as correct-as-of-source and re-verify against the live
    API when bumping.
  - Sustainability: Isolated behind the `VectorStore` ACL with a deterministic
    fixture fallback; a credential-absent or region-unavailable run renders the
    card `fixtured` / `error`, never faked.
- **Monitoring**: Dependabot, `npm audit` in CI (`--audit-level=high`), and the
  benchmark fixture stability check.
- **Exit strategy**: Replace only the `VectorStore` adapter and the `s3-vectors`
  registry card. Domain scoring, reports, and datasets do not depend on AWS APIs.

### Cloudflare Vectorize / AutoRAG / R2 REST (packages/tech) — no new dependency

- **Reason**: The `rag-benchmark` topic measures **Cloudflare Vectorize**
  (self-managed, fixed embedding) and **Cloudflare AutoRAG** (fully-managed).
  Both are reached over Cloudflare's REST API using the runtime's built-in
  `fetch` — **no SDK dependency is taken on**. Access is isolated behind
  `packages/tech/src/vendors/vectorstore/vectorize.ts` (Vectorize v2:
  create/upsert/query/delete index) and `.../autorag.ts` (AutoRAG: R2 bucket +
  object upload, instance create, sync, search), each implementing the domain
  `VectorStore` port. Auth is `CLOUDFLARE_ACCOUNT_ID` + an API token.
- **Assessment**:
  - License / dependency: none added — native `fetch` only.
  - Surface stability: these APIs are newer and move; ids/limits/pricing are
    cited correct-as-of-source (2026-07) and were verified live before wiring.
    Vectorize v2 requires index dimensions in `[32, 1536]` and its mutations are
    eventually consistent (~5-15s). AutoRAG indexes asynchronously (6-hour cycle
    / rate-limited force sync) and its R2 data-source binding is dashboard-
    provisioned, so a REST-only live run renders an honest `error`, never faked.
  - Sustainability: isolated behind the two `VectorStore` ACLs with a
    deterministic fixture fallback; a credential-absent run renders `fixtured`.
- **Monitoring**: `npm audit` in CI (no package added), and the benchmark
  fixture stability check.
- **Exit strategy**: Replace only the two `VectorStore` adapters and their
  registry cards. Domain scoring, reports, and datasets do not depend on
  Cloudflare APIs.

> Per-research dependencies (LLM provider SDKs, database drivers, datasets) are
> added here by the ticket that introduces them, behind a `src/vendors/`
> anti-corruption layer.

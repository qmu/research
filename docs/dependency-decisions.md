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

- **Reason**: The `llm-model-comparison` topic measures OpenAI models live. The official SDK provides typed request/response and usage shapes; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/openai.ts` (Chat Completions) and `packages/tech/src/vendors/llm/openai-responses.ts` (the Responses API, for the `-codex` coding models). The **same SDK also fronts the xAI OpenAI-compatible endpoint** (the Grok lineup — `grok-4.3`, the `grok-4.20-0309` reasoning/non-reasoning pair, and the `grok-build-0.1` coding model) via a base-URL variant in `vendors/llm/xai.ts` — no new dependency is taken on for xAI; only a base URL differs.
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

> Per-research dependencies (LLM provider SDKs, database drivers, datasets) are
> added here by the ticket that introduces them, behind a `src/vendors/`
> anti-corruption layer.

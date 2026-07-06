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

- **Reason**: The `llm-model-comparison` topic measures OpenAI models live. The official SDK provides typed request/response and usage shapes; hand-rolling an HTTP client would duplicate that. Isolated behind `packages/tech/src/vendors/llm/openai.ts` (Chat Completions) and `packages/tech/src/vendors/llm/openai-responses.ts` (the Responses API, for the `-codex` coding models). The **same SDK also fronts the xAI OpenAI-compatible endpoint** (`grok-code-fast-1`) via a base-URL variant in `vendors/llm/xai.ts` — no new dependency is taken on for xAI; only a base URL differs.
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

> Per-research dependencies (LLM provider SDKs, database drivers, datasets) are
> added here by the ticket that introduces them, behind a `src/vendors/`
> anti-corruption layer.

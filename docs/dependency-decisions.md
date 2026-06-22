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

> Per-research dependencies (LLM provider SDKs, database drivers, datasets) are
> added here by the ticket that introduces them, behind a `src/vendors/`
> anti-corruption layer.

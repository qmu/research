# vendors

Anti-corruption layers for external dependencies whose lifespan and
compatibility we do not control — LLM providers, database engines, external
APIs. Each lives in its own subfolder (for example `llm/`, `db/`).

Per the vendor-neutrality policy:

- Name functions in the vocabulary of the domain (`generateAnswer`, not
  `fetchAnthropicCompletion`), so the provider is swappable.
- Keep the dependency direction ours → anti-corruption layer → theirs. No
  provider SDK type leaks into `domain/`.
- Record every new dependency in `docs/dependency-decisions.md`.

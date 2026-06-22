# vendors

Anti-corruption layers for external dependencies whose lifespan and
compatibility we do not control — data sources, external APIs, datasets.
Each lives in its own subfolder.

Per the vendor-neutrality policy:

- Name functions in the vocabulary of the domain, so the source is swappable.
- Keep the dependency direction ours → anti-corruption layer → theirs. No
  external SDK type leaks into `domain/`.
- Record every new dependency in `docs/dependency-decisions.md`, and verify
  the license and attribution of any third-party dataset before publishing.

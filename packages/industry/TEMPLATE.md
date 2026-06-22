# Adding an industry research topic

A research topic is a subfolder of this project, not a new package.

1. Create `src/<topic>/domain/` for the topic's pure logic (modeling, analysis,
   result shaping). No vendor or entrypoint types here.
2. Put any external data-source access behind an anti-corruption layer in
   `src/vendors/<source>/`, named in domain terms. Record the dependency in
   `docs/dependency-decisions.md`, and verify dataset licensing and attribution
   before anything is published.
3. Add a thin CLI runner `src/entrypoints/run-<topic>.ts`.
4. Write at least one unit test per public domain function, targeting boundary
   conditions. Keep these in the project so CI runs them as regression tests.
5. Author the result page at `docs/research-reports/<slug>.md` with `description`
   (and optional `title`) frontmatter and an objective, verifiable write-up.
   Bring back proprietary terminology you discover into `docs/glossary.md`.
6. Preview with `make docs`, then publish with `make publish`.

Ground the research in real market and industry structure — customs,
regulations, peer movements, market size and direction — not inferred fragments.

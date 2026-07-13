# Adding a technical research topic

A research topic is a subfolder of this project, not a new package.

Step 0 precedes this recipe: follow the proposal-first protocol in
`docs/research-development-guideline.md` (propose cadence, subjects, metrics,
cost/trial-count range, and accumulated history; get developer approval) before
scaffolding anything below.

1. Create `src/<topic>/domain/` for the topic's pure logic (scoring,
   aggregation, result shaping). No vendor or entrypoint types here.
2. Put any external SDK access (LLM provider, database engine) behind an
   anti-corruption layer in `src/vendors/<provider>/`, named in domain terms.
   Record the dependency in `docs/dependency-decisions.md`.
3. Add a thin CLI runner `src/entrypoints/run-<topic>.ts` that wires arguments
   to the domain logic and emits the result Markdown.
4. Write at least one unit test per public domain function, targeting boundary
   conditions. Keep these in the project so CI runs them as regression tests.
5. Author the result page at `docs/research-reports/<slug>.md` with `description`
   (and optional `title`) frontmatter and an objective, verifiable write-up.
6. Preview with `make docs`, then publish with `make publish`.

Document the exact commands, required credentials, and expected cost in the
result page so a reader can clone and reproduce the research.

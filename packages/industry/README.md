# @qmu/research-industry

Fundamental industry and market research.

This is a single npm project; individual researches live as subfolders under
`src/`. See [`TEMPLATE.md`](TEMPLATE.md) to add one.

## Layout

- `src/<topic>/domain/` — pure logic for each research topic.
- `src/entrypoints/` — thin CLI runners (`run-<topic>.ts`).
- `src/vendors/` — anti-corruption layers for external data sources and APIs.

## Commands

```sh
npm install
npm run dev     # run src/index.ts (lists usage)
npm run build   # tsc
npm test        # tsc --noEmit && vitest --run
npm run lint    # prettier --check && eslint
```

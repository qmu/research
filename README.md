# research

Public, reproducible foundational research for [qmu.co.jp](https://qmu.co.jp).

This repository holds qmu's fundamental technical and industry research — LLM
benchmarks, architectural studies (for example multi-tenant multi-database
models), and market research. Each research topic ships as runnable code so a
reader can clone this repository and reproduce the result for themselves. Result
pages are written as Markdown, previewed locally, and published to the corporate
site as foundational research.

## Repository layout

The top level is divided by role:

| Directory     | Role                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `packages/`   | Research code. `packages/tech/` and `packages/industry/` are each a single npm project; individual researches live as subfolders inside. |
| `scripts/`    | Repository-wide scripts (verb-named, e.g. `publish-research.sh`).    |
| `workloads/`  | Execution environment and infrastructure config (`workloads/docker/`). |
| `databases/`  | Database schemas and migrations, one subdirectory per database.      |
| `docs/`       | Documentation: the preview site, research reports, ADRs, the glossary, and the dependency-decision log. |
| `outputs/`    | Runtime output (gitignored).                                         |

## Commands

All common operations run through `make`. Run `make help` for the list.

| Command         | Effect                                                        |
| --------------- | ------------------------------------------------------------- |
| `make install`  | Install dependencies in every package.                        |
| `make build`    | Type-check and build every package.                           |
| `make test`     | Type-check and run unit tests in every package.               |
| `make lint`     | Lint and format-check every package.                          |
| `make format`   | Apply formatting across every package.                        |
| `make docs`     | Run the local research preview site (VitePress).              |
| `make publish`  | Copy finished research Markdown to the corporate site.        |

Continuous integration invokes these same commands, so what runs in CI is what
you can run locally.

## Reproduce a research

```sh
git clone <this repo>
cd research
make install
# then run a specific research, e.g.:
cd packages/tech && npm run dev
```

### Keyless path: fixture to result page

No API key is needed to get from a fresh clone to a rendered result page. Run
these from the repository root; no absolute path such as `/workspace` is assumed.

```sh
make install   # dependencies in packages/tech, packages/industry and docs
make drift     # regenerates every topic's keyless fixture into docs/research-reports/
make build     # type-checks and builds the VitePress site
make docs      # serves the preview site locally (VitePress dev server)
```

- `make drift` writes the fixture pages (for example
  `docs/research-reports/llm-model-comparison.fixture.md`,
  `llm-speed-comparison.fixture.md`, `llm-accuracy-comparison.fixture.md`) and
  fails if any regenerated file differs from the committed one.
- `make build` leaves the static result pages under
  `docs/.vitepress/dist/en/` (for example `llm-accuracy-comparison.html`) and
  `docs/.vitepress/dist/ja/`.
- To run a single topic's fixture, use `npm run <topic>:fixture` inside
  `packages/tech` (for example `npm run compare:fixture`).
- Use Node.js 22. Node 23 installs and builds, but npm prints `EBADENGINE`
  warnings and may add `"hasInstallScript": true` to
  `packages/tech/package-lock.json`; do not commit that change.

Each research topic documents its exact commands, required credentials, and
expected cost in its own README and result page.

## Requirements

- Node.js 22 (see `.nvmrc`)
- `make`
- Docker (optional, for `workloads/docker/` reproducible environments)

## License

[MIT](LICENSE).

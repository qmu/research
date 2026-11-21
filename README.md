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

Each research topic documents its exact commands, required credentials, and
expected cost in its own README and result page.

## Requirements

- Node.js 22 (see `.nvmrc`)
- `make`
- Docker (optional, for `workloads/docker/` reproducible environments)

## Reproduce the fixed RAG comparison

After `npm ci --prefix packages/tech`, run `make reproduce-fixture` from the
repository root. This keyless command uses the existing RAG fixture generator
with its fixed timestamp, mini corpus, k=3 and five trials. Fixture values test
the pipeline; they are not measurements of live providers.

`outputs/reproduce-fixture/` contains the unchanged common result schema in
`rag-benchmark.data.json`, the comparison table in `rag-benchmark.md`, combined
stdout/stderr in `command-output.txt`, and the generator's numeric status in
`exit-code.txt`. Override the directory with `make reproduce-fixture OUTPUT_DIR=/absolute/path`. Each run replaces these artifacts and removes stale
JSON/Markdown before execution. The runner propagates failure (GNU Make reports
recipe failures as status 2); `exit-code.txt` retains the generator's exact code.
Inspect the Markdown locally or view the matching fixture page at
`http://127.0.0.1:5173/en/rag-benchmark` after `npm ci --prefix docs` and
`npm --prefix docs run dev -- --host 127.0.0.1 --port 5173`.

## License

[MIT](LICENSE).

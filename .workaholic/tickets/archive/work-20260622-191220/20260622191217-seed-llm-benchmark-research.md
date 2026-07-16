---
created_at: 2026-06-22T19:12:17+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 2h
commit_hash: 263d3a2
category: Added
depends_on: [20260622191214-initialize-research-monorepo-skeleton.md, 20260622191215-vitepress-research-preview-site.md, 20260622191216-publish-pipeline-to-qmu-co-jp.md]
---

# Seed a reproducible LLM benchmark research, end to end

## Overview

Add one small, real LLM benchmark as the first research topic inside the
`packages/tech/` project, wired through the entire loop: a reader clones the
repo, runs the benchmark, and gets a result page that previews in the docs site
and can be published to qmu.co.jp. This proves request item 5 (a reader can
reproduce the benchmark from a clone, and the repo is self-explaining) and gives
the structure created by the earlier tickets a concrete, copyable example.

Covers request item 2 (a worked research topic) and item 5 (reproducibility).

## Key Files

- `packages/tech/src/llm-benchmark/domain/` - Pure benchmark logic: scoring, aggregation, result-shaping. No vendor or entrypoint types (coding-standards: domain layer is pure; test.md: keep fast regression tests here).
- `packages/tech/src/vendors/llm/` - Anti-corruption layer wrapping each LLM provider behind domain-named functions (e.g. `generateAnswer`, not `fetchAnthropicCompletion`); swappable, type-checked at the boundary (vendor-neutrality policy). Default to the latest Claude models for any Anthropic provider.
- `packages/tech/src/entrypoints/run-llm-benchmark.ts` - Thin CLI entrypoint a reader invokes to reproduce the benchmark; emits the result markdown.
- `packages/tech/src/llm-benchmark/*.test.ts` - Vitest tests for the pure scoring/aggregation against boundary cases (test.md: real-thing where possible, regression tests in CI).
- `docs/research-reports/llm-benchmark.md` - The generated result page (frontmatter `description`/`title`; body H1 + sections) that previews in the VitePress site and is the publish-pipeline input.
- `docs/dependency-decisions.md` - Add the LLM SDK dependency entry (License/Reputation/Sustainability/Exit) introduced by this benchmark.
- `.github/workflows/` - Per-package, path-filtered workflow for `packages/tech/**` (house CI shape: setup-node 22, `npm ci --include=dev`, per-package lockfile path).

## Implementation Steps

1. Implement the benchmark as a topic under `packages/tech/src/llm-benchmark/`: pure scoring and aggregation in `domain/`, provider access in `src/vendors/llm/` behind a domain-named anti-corruption interface so the provider is swappable, and a thin `entrypoints/run-llm-benchmark.ts` runner.
2. Keep the benchmark small and deterministic where possible (fixed prompt set, recorded/sampled outputs) so a reader can reproduce it cheaply; document required API keys and the exact `npm`/`make` commands in `packages/tech/README` and the result page.
3. Add vitest tests for the pure domain logic targeting boundary conditions (empty/zero/all-correct/all-wrong); these stay in CI as regression tests. Provider calls behind the ACL may be skippable before commit per test.md.
4. Generate `docs/research-reports/llm-benchmark.md` from the run (or a documented generation step), with `description`/`title` frontmatter and an objective, verifiable write-up (objective-documentation: facts over adjectives). Include a Mermaid diagram of the benchmark flow if helpful (diagram-generation: text-based diagrams).
5. Confirm the loop: `make docs` previews the page in VitePress; `make publish` (or `scripts/publish-research.sh llm-benchmark`) copies it to `../qmu-co-jp/docs/research/llm-benchmark.md`.
6. Add the LLM SDK to `docs/dependency-decisions.md`, and add a per-package, path-filtered CI workflow for `packages/tech/**` that runs the type-check and domain tests via the runner.

## Considerations

- The LLM provider must sit behind `src/vendors/llm/` with domain-named functions; no provider SDK types leak into `domain/` (vendor-neutrality + coding-standards, `packages/tech/src/vendors/llm/`).
- Reproducibility is the point: document keys, costs, and exact commands so a qmu.co.jp reader can clone and re-run; avoid non-deterministic steps that can't be re-derived (`packages/tech/README`, `docs/research-reports/llm-benchmark.md`).
- Use the latest Claude models by default for any Anthropic-backed benchmark target (e.g. Opus 4.8 / Sonnet 4.6 / Haiku 4.5); pin model IDs in the report so results are interpretable later (`packages/tech/src/vendors/llm/`).
- The result page frontmatter must satisfy the Astro schema so the publish pipeline succeeds (`docs/research-reports/llm-benchmark.md`, see `20260622191216`).
- Depends on all three prior tickets: the package project + runner (foundation), the preview site to view the page, and the publish pipeline to ship it — this ticket validates the whole chain.
- Keep tests honest: many passing AI-generated tests are not a health signal; target real boundary behavior (test.md policy, `packages/tech/src/llm-benchmark/*.test.ts`).

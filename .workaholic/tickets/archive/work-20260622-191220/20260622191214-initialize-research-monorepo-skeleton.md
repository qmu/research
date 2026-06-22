---
created_at: 2026-06-22T19:12:14+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 2h
commit_hash: ee3133f
category: Changed
depends_on:
---

# Initialize the research monorepo skeleton, tooling, and governance

## Overview

Turn the empty `research` repository into a valid, self-explaining, public
workaholic monorepo. This ticket establishes the role-divided top-level layout
mandated by the `directory-structure` policy, the two research npm projects
(`packages/tech/`, `packages/industry/`) as single projects per group, the
single canonical script runner, baseline CI/CD, containerization for
reproducible-by-clone setup, and the public-repo governance artifacts (LICENSE,
README, glossary, dependency-decision log, ADRs).

Scope covers request items 1, 2 (structure only — the seed research is item-2
content and lands in `20260622191217-seed-llm-benchmark-research.md`), 5, and 6.
The preview site (item 3) and the qmu-co-jp copy pipeline (item 4) are separate
dependent tickets.

**Decision (per user):** one npm project *per group*, not per topic. `packages/tech/`
and `packages/industry/` are each a single npm project; individual researches are
subfolders under each project's `src/`. This avoids proliferating `package.json`
files while keeping each group independently clonable and runnable.

## Key Files

Files to create (no existing code in the repo — reference precedents in parentheses):

- `LICENSE` - OSS license for the public repo (legal-compliance: a public repo must declare one; confirm dependency/data license compatibility).
- `README.md` - Self-explaining entry point: what the repo is, how to install/build/test/preview, and the list of runner commands (command-scripts: "the project README lists the available commands").
- `CLAUDE.md` - Repo guide for agents, including a `## Deploy` section the ship workflow reads.
- `.gitignore` - Ignore `node_modules/`, `dist/`, and `outputs/` (runtime output is gitignored per directory-structure).
- `.nvmrc` - Pin Node `22` (house standard; ref `/home/ec2-user/projects/data-platform/.github/workflows/*` setup-node `node-version: '22'`).
- `.prettierrc` - House formatting (ref `/home/ec2-user/projects/data-platform/.prettierrc`: printWidth 80, double quotes, semi, tabWidth 2, trailingComma all, arrowParens always, endOfLine lf).
- `Makefile` - The single canonical runner (command-scripts policy): `install`, `build`, `test`, `lint`, `format`, plus `docs` and `publish` targets wired in later tickets. CI invokes these, never inline logic.
- `packages/tech/package.json` + `tsconfig.json` - Single npm project for technical research (ref house tsconfig `/home/ec2-user/projects/data-platform/packages/realestate-mcp/tsconfig.json`: ES2022/ESNext/bundler/strict/noUnusedLocals+Parameters/declaration/outDir dist/rootDir src/types [node]; scripts `dev`=tsx, `build`=tsc, `tsc`=tsc --noEmit, `test`=tsc --noEmit && vitest --run).
- `packages/industry/package.json` + `tsconfig.json` - Single npm project for industry research, same shape.
- `packages/tech/src/`, `packages/industry/src/` - Tri-layout skeleton per coding-standards: `domain/` (pure logic), `entrypoints/` (CLI runners), `vendors/` (anti-corruption layers for LLM/DB SDKs). Include one documented placeholder topic folder + a topic template README so the structure is self-explaining.
- `workloads/docker/docker-compose.yml` + `Dockerfile`(s) - Pinned multi-stage, non-root images for reproducible local setup (containerization policy).
- `databases/` - Top-level directory (placeholder, README) reserved for the multi-tenant multi-DB study's schemas/migrations.
- `docs/glossary.md` - One-concept-one-word project glossary (terminology policy): `tech`, `industry`, `benchmark`, `tenant`, `research-report`, etc.
- `docs/dependency-decisions.md` - Dependency-decision log (vendor-neutrality policy template: Reason / License / Reputation / Development status / Sustainability / Monitoring / Exit).
- `docs/adr/0001-no-workspaces-independent-npm-projects.md`, `docs/adr/0002-one-npm-project-per-group.md`, `docs/adr/0003-vitepress-preview-astro-publish-boundary.md` - Initial ADRs (objective-documentation policy).
- `.github/workflows/ci.yml` - Baseline CI invoking the Makefile only (ci-cd policy); type-check, test, lint, format-check, dependency audit; required green before merge.
- `.github/dependabot.yml` - Dependency monitoring for the public repo (vendor-neutrality).

## Implementation Steps

1. Create the role-divided top level exactly per the `directory-structure` policy: `packages/`, `scripts/`, `workloads/`, `databases/`, `docs/`, `outputs/`. Use pronounceable names as-is (no abbreviations). Add a short `README.md` in each describing its role.
2. Scaffold `packages/tech/` and `packages/industry/` as single npm projects (no root `package.json`, no workspaces — confirmed house convention). Each: house `tsconfig.json`, `package.json` with the standard `dev`/`build`/`tsc`/`test` scripts, `type: module`, `private: true`, and qmu repository/author/license metadata. Add `vitest` as the test runner.
3. Inside each project's `src/`, establish the `domain/`/`entrypoints/`/`vendors/` tri-layout with a documented placeholder topic subfolder and a `TEMPLATE.md` explaining how to add a new research topic (so item 5 "self-explaining" holds).
4. Author the single canonical `Makefile` runner with `install`, `build`, `test`, `lint`, `format` targets that fan out to both package projects; reserve `docs` and `publish` targets (implemented in the dependent tickets). Add a `make help` listing.
5. Add house tooling: `.prettierrc`, `.nvmrc` (Node 22), ESLint config consistent with `coding-standards` (flag `any`/`as`/`!`/`==`/`enum`/`class`/`namespace`/`var`), and `.gitignore`.
6. Add `workloads/docker/`: a pinned (e.g. `node:22.x-alpine3.x`, no `latest`), multi-stage, non-root `Dockerfile` and a `docker-compose.yml` so `docker compose up` provides any local deps; document the one-command local bring-up in the README.
7. Add public-repo governance: `LICENSE`, self-explaining root `README.md`, `CLAUDE.md` (with `## Deploy`), `docs/glossary.md`, `docs/dependency-decisions.md`, and `docs/adr/` ADRs 0001–0003 recording the no-workspaces, per-group, and preview/publish-boundary decisions.
8. Add baseline CI (`.github/workflows/ci.yml`) that **only invokes the Makefile** (`make test`, etc.) plus a dependency-vulnerability scan, and `.github/dependabot.yml`. Keep CI logic reproducible locally per the ci-cd policy.

## Considerations

- Top-level names and roles must match the `directory-structure` policy verbatim; do not invent sibling dirs or place code outside `packages/` (`docs/adr/0001-no-workspaces-independent-npm-projects.md`).
- No root `package.json` / no workspaces is a deliberate house convention (avoids editing many manifests); each package owns its lockfile (ref `/home/ec2-user/projects/data-platform/packages/realestate-mcp/package.json`).
- CI must invoke the runner, never re-implement logic inline, so checks are locally reproducible (`.github/workflows/ci.yml`, `Makefile`).
- Public repo: every dependency needs a license/sustainability entry and the repo a clear OSS LICENSE; this interlocks with the dependency-decision log (`docs/dependency-decisions.md`, `LICENSE`).
- Container images must be pinned and non-root; no `latest` tags (`workloads/docker/`).
- Keep the `domain/`/`entrypoints/`/`vendors/` boundary even with one project per group: shared LLM/DB SDK access goes through `src/vendors/`, domain logic stays pure (`packages/tech/src/`, `packages/industry/src/`).
- This is the foundation ticket — `20260622191215`, `20260622191216`, and `20260622191217` all depend on the layout, runner targets, and `docs/` markdown convention it establishes.

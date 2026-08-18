---
type: Mission
title: Auto-deploy the docs site to a Cloudflare Worker on merge to main
slug: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
status: achieved
merge_policy:
created_at: 2026-08-18T12:22:03+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
assignee:
predicted_hours:
actual_hours: 0.4
feedback: [20260818122035-auto-deploy-docs-to-a-cloudflare-worker-on-merge-to-main-staging-research-qmu-co-jp.md]
tickets: []
stories: []
gate_type:
gate_target:
gate_assert:
claim: work-20260818-123849
---

# Auto-deploy the docs site to a Cloudflare Worker on merge to main

## Goal

The VitePress site under `docs/` is today a local preview only (`make docs`); the
sole hosted surface is the corporate copy on qmu.co.jp (ADR 0003). The feedback asks
for a hosted staging surface: every merge to `main` deploys the built site to a
Cloudflare Worker serving `staging-research.qmu.co.jp`, so reports are reviewable by
URL without a checkout, and without moving the publishing boundary.

## Experience

A pull request merges to `main`; CI builds the docs site and deploys it to the
Worker unattended. `staging-research.qmu.co.jp` then serves that commit's pages.
Nothing about `scripts/publish-research.sh` or the qmu-co-jp path changes.

## Acceptance

<!-- PROPOSED - provisional until a human replans this to drive-ready. -->

- [x] A merge to `main` deploys the built site with no manual step, and a failed
      deploy fails visibly instead of silently leaving the old build. (#20260818122248-deploy-the-docs-worker-from-ci-on-every-merge-to-main.md)
- [x] `staging-research.qmu.co.jp` serves the current site: both indexes and the
      per-topic report pages resolve. (#20260818122249-serve-the-deployed-worker-at-staging-research-qmu-co-jp.md)
- [x] The deploy runs from a repository `make` target CI invokes, with credentials
      supplied as secrets and the required ones documented. (#20260818122247-build-the-docs-site-into-a-deployable-cloudflare-worker-artifact.md)

## Changelog

- 2026-08-18: Proposed from feedback (issue #115).
- 2026-08-18 — ticket archived — 20260818122247-build-the-docs-site-into-a-deployable-cloudflare-worker-artifact.md
- 2026-08-18 — ticket archived — 20260818122248-deploy-the-docs-worker-from-ci-on-every-merge-to-main.md
- 2026-08-18 — ticket archived — 20260818122249-serve-the-deployed-worker-at-staging-research-qmu-co-jp.md
- 2026-08-18 — Implemented — artifact, CI trigger and hostname configured; awaiting the declared verification handoff (real deploy + qmu.co.jp DNS) — work-20260818-123849.md
- 2026-08-18 — run recorded (+0.4h) — run-20260818-123849
- 2026-08-19 — Deploy verified — CI deploy job green on 47130d4, 367 assets uploaded, custom domain staging-research.qmu.co.jp bound; both indexes, a report page, the built 404 and robots.txt all served over HTTPS — run-20260818-123849
- 2026-08-19 — mission achieved — mission.md
- 2026-08-18 — ticket archived — 20260818124500-make-help-omits-targets-whose-names-contain-a-digit.md
- 2026-08-18 — ticket archived — 20260818131500-deployment-record-still-says-the-merge-is-the-deployment.md

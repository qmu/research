---
type: Mission
title: Per-topic research pipeline: benchmark, LLM insights, JP translation
slug: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
status: active
created_at: 2026-07-09T02:20:03+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Per-topic research pipeline: benchmark, LLM insights, JP translation

## Goal

The research repository publishes foundational, reproducible comparisons that
help qmu (and the public) choose LLM/agent/vector infrastructure. The intended
shape — which the first documentation migration got wrong — is **one pipeline
per topic**: each topic (speed, accuracy, availability, OCR, vector-DB, plus the
reference topics) is a single runnable subcommand that (1) runs that topic's real
benchmark, (2) feeds the results to an LLM to write an **analytical overview /
insights report** in English, and (3) **translates that report into Japanese**.
The public VitePress site then presents each topic as a genuine generated report
in both languages — no hand-authored "meta viewpoint" intro pages slicing one
report into stubs.

This mission reorganizes the repo around that per-topic pipeline. It supersedes
the meta-IA stubs, hand-curated JP articles, and data-skeleton exporter built by
the 2026-07-08 drive (tickets `20260708182154` / `182159` / `182155`), while
keeping the measurement engines, probes, multi-trial CI, incremental history,
and trend charts those and earlier tickets produced — those become the
benchmarks each topic subcommand calls.

**Load-bearing constraint:** LLM-written insights and auto-translation are
non-deterministic and need API keys, so they can **not** be the byte-stable
keyless fixture CI depends on. The committed keyless path stays each topic's
deterministic **data** self-test; the **insights + JP** layer is a real-run,
owner-gated, regenerable artifact (the existing `.real` pattern).

## Scope

**In scope**

- A unified `research <topic>` CLI convention with a topic registry and a shared
  pipeline (benchmark → data artifact → EN insights → JP translation), each stage
  with a keyless deterministic fixture path and an owner-gated real path.
- Splitting the monolithic model×effort `compare` engine into distinct **speed**
  and **accuracy** topics.
- Migrating the existing **RAG**, **OCR**, and **availability** topics onto the
  unified CLI and giving them the insights + JP layer.
- Fitting the non-benchmark reference topics (**foundation-model catalog**,
  **Agent SDK** design comparison) into the same article structure.
- Reworking the VitePress site + publishing boundary so each topic shows its EN
  report + JP translation directly, with no meta intro/stub layer.

**Out of scope**

- A scheduler / automated orchestration (runs stay manual/owner-triggered).
- Publishing real (non-deterministic) numbers to qmu.co.jp as a CI step — the
  keyless data fixture remains the only CI-gated report.
- Changing the underlying measurement methodology of any probe (this is a
  restructure, not a re-measurement).

## Acceptance

- [x] A unified `research <topic>` CLI + topic registry runs the shared benchmark→artifact→insights→translation pipeline with per-stage fixture/estimate/real contracts (#20260709022000-unified-per-topic-research-cli.md)
- [x] An LLM insights-report generator turns a topic's data artifact into an English analytical overview, real-run/owner-gated with a deterministic keyless fixture stub (#20260709022001-llm-insights-report-generator.md)
- [x] A Japanese auto-translation stage renders the EN insights report into JP, real-run/owner-gated with a deterministic keyless fixture stub (#20260709022002-japanese-auto-translation-stage.md)
- [x] The monolithic compare engine is split into distinct speed and accuracy topics under the unified CLI, each emitting its own data artifact + insights + JP (#20260709022003-split-compare-speed-accuracy-topics.md)
- [x] RAG, OCR, and availability are migrated onto the unified topic CLI and gain the insights + JP layer without losing their benchmarks (#20260709022004-migrate-existing-topics-to-unified-cli.md)
- [ ] The non-benchmark reference topics (foundation-model catalog, Agent SDK design comparison) fit the topic/article structure with insights/JP and clear no-live-benchmark provenance (#20260709022005-nonbenchmark-reference-topics.md)
- [x] The VitePress site + publishing present each topic as EN report + JP translation directly, removing the meta IA stubs/intro and reconciling the exporter/boundary (#20260709022006-per-topic-site-and-publishing-rework.md)

## Changelog

- 2026-07-09 — mission created — mission.md
- 2026-07-09 — ticket archived — 20260709185801-derive-japanese-sidebar-from-research-topics.md
- 2026-07-09 — ticket archived — 20260709190517-report-history-translation-and-qmu-publish-pipeline.md
- 2026-07-10 — ticket archived — 20260710002018-standardize-public-research-article-outline.md
- 2026-07-13 — all 7 acceptance tickets (20260709022000–022006) archived under work-20260622-191220 and merged to main via PR #15 (147224c); checklist not updated at the time — noted retroactively during the 2026-07-17 reconciliation
- 2026-07-17 — reconciliation against main (ticket 20260717000606): items 1–5 and 7 verified with evidence — commits 7de604d (unified CLI + topic registry), d8f1afd (insights.ts, fixture stub + provenance), 321dd5d (translate.ts, verifyNumbersPreserved), 90f11d9 (speed/accuracy split), efc5f83 (RAG/OCR/availability insights+JP), 56d4067+d196d60 (site main line, meta stubs/combined pages removed); keyless `npm run research -- <topic> --fixture` passes for speed/accuracy/rag/ocr/availability/foundation-models/agent-sdk; `--estimate` prices insights+translation stages; 50 domain/CLI tests green; published EN reports + JP pages (`*.insights.ja.md`, provenance frontmatter, generated 2026-07-13 real run) committed for all six published topics — 6/7 checked
- 2026-07-17 — item 6 left unchecked: foundation-models is complete (catalog kind, insights+JP published) but agent-sdk has no insights/JP layer and no site placement (absent from site.ts, article orphaned from nav) — residue ticket 20260717003610-agent-sdk-insights-and-site-placement.md
- 2026-07-17 — reconciliation residue filed: keyless fixture artifact drift vs models.ts 27-model registry and compose-path divergence (20260717003611), legacy superseded docs/llm-foundation JP pages still served as orphans (20260717003612)

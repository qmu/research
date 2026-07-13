---
type: Concern
mission: living-research-development-guideline
tickets: [20260622191214-initialize-research-monorepo-skeleton.md, 20260622191215-vitepress-research-preview-site.md, 20260622191216-publish-pipeline-to-qmu-co-jp.md, 20260622191217-seed-llm-benchmark-research.md, 20260623215050-llm-model-comparison-poc.md, 20260704170045-llm-comparison-multimodel-multitrial-engine.md, 20260704170046-llm-comparison-comprehensive-report-and-a11y.md, 20260705001543-redesign-llm-comparison-probes.md, 20260706105042-recurring-incremental-llm-comparison-with-history.md, 20260706155233-add-coding-agent-models-codex-grok.md, 20260706175400-add-xai-grok-models-and-migrate-coding-slug.md, 20260706201930-commit-real-run-history-and-render-report-from-it.md, 20260706202819-rag-benchmark-foundation-sqlite-vec.md, 20260706202820-rag-benchmark-add-openai-vector-store.md, 20260706202821-rag-benchmark-add-aws-s3-vectors.md, 20260706203035-rag-benchmark-add-cloudflare-vectorize-and-autorag.md, 20260706212258-resume-real-sweep-pdf-refresh-and-backlog.md, 20260707195944-cover-llm-effort-na-foundation-models.md, 20260707210010-add-agent-sdk-comparison-research.md, 20260708143652-llm-comparison-multi-trial-confidence.md, 20260708143653-rag-benchmark-confidence-trials-and-queries.md, 20260708182152-rag-benchmark-incremental-history.md, 20260708182153-research-history-trend-chart.md, 20260708182154-reorganize-llm-foundation-research-ia.md, 20260708182155-research-vitepress-publishing-site.md, 20260708182156-information-accuracy-research-topic.md, 20260708182157-availability-downtime-research-topic.md, 20260708182158-ocr-capability-research-topic.md, 20260708182159-publishing-boundary-source-of-truth-reversal.md, 20260708182160-vision-capable-provider-port.md, 20260708200000-rag-benchmark-teardown-on-error.md, 20260709022000-unified-per-topic-research-cli.md, 20260709022001-llm-insights-report-generator.md, 20260709022002-japanese-auto-translation-stage.md, 20260709022003-split-compare-speed-accuracy-topics.md, 20260709022004-migrate-existing-topics-to-unified-cli.md, 20260709022005-nonbenchmark-reference-topics.md, 20260709022006-per-topic-site-and-publishing-rework.md, 20260709052000-availability-status-page-observation.md, 20260709120000-availability-llm-extraction-trends.md, 20260709185801-derive-japanese-sidebar-from-research-topics.md, 20260709190517-report-history-translation-and-qmu-publish-pipeline.md, 20260709223740-separate-published-research-topics-from-internal-sources.md, 20260710002018-standardize-public-research-article-outline.md, 20260712030400-research-development-guideline.md, 20260712031500-snapshot-structure-site-tooling.md, 20260712031600-migrate-llm-speed-snapshot-reference.md, 20260712043000-comparison-instrument-v2.md]
origin_pr: 15
origin_pr_url: https://github.com/qmu/research/pull/15
origin_branch: work-20260622-191220
origin_commit: 147224c
created_at: 2026-07-13T09:48:58+09:00
severity: moderate
status: resolved
resolved_by_pr: 22
resolved_by_commit: f3cc3ac
---

# JP pages are overwritten by the insights-translation stage after real runs

## Description

Running `research -- <topic> --real` ends with an insights translation that overwrites the topic's Japanese page with a non-outline document; the enforced-outline test catches it, but the recovery step is manual (see [ec38a52](https://github.com/qmu/research/commit/ec38a52) in packages/tech/src/research/translate-runner.ts)

## How to Fix

Run `npm run research:translate-report -- <topic>` after every real run (now documented), or reorder the pipeline so the full-report translation is the terminal JP stage

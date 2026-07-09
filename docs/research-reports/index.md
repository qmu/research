---
title: LLMs Research
description: English reports, data artifacts, and history kept as reproducible source material.
---

# LLMs Research

English reports, data artifacts, and history are kept here as reproducible
source material. The public reading line for the Japanese canonical articles is
[LLMs Research (Japanese)](../llm-foundation/).

These are organized by research topic. The keyless-fixture data reports here are
the byte-stable CI self-tests and the reproducible source for each topic; the
per-topic reading experience and its Japanese version are generated from these
by an owner-triggered real run.

**Topics**

- [Foundation model catalog](./foundation-models) — A reference catalog of the compared models: provider, tier, price, effort, and API surface.
- [LLM response speed](./llm-speed-comparison) — Sustained throughput, time-to-first-token, and total latency.
- [LLM output accuracy](./llm-accuracy-comparison) — JSON-schema limits, length-instruction following, and information accuracy.
- [LLM model comparison](./llm-model-comparison) — The combined model-by-effort sweep that speed and accuracy topics project from.
- [LLM API availability](./llm-availability) — Status-page incident history and derived 30/90-day availability trends.
- [OCR capability comparison](./ocr-comparison) — CER/WER and structured field extraction over synthetic documents.
- [RAG vector store benchmark](./rag-benchmark) — Retrieval quality, ingestion time, query latency, cost, and operational constraints.
- [LLM exact-match benchmark](./llm-benchmark) — A small exact-match accuracy benchmark that exercises the publication pipeline.

To add a study, see the `TEMPLATE.md` in the relevant package under `packages/`.

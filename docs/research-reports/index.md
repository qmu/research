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
per-topic reading experience (English insights and its Japanese translation) is
generated from these by an owner-triggered real run.

**Topics**

- [Foundation model catalog](./foundation-models) — a reference catalog of the
  compared models (provider, tier, price, effort, API surface), generated from
  the model registry. Reference data, not a measurement.
- [LLM response speed](./llm-speed-comparison) — sustained throughput,
  time-to-first-token, and total latency, projected from the model comparison
  sweep.
- [LLM output accuracy](./llm-accuracy-comparison) — JSON-schema limits,
  length-instruction following, and information accuracy, projected from the
  same sweep.
- [LLM model comparison](./llm-model-comparison) — the combined model×effort
  sweep the speed and accuracy topics project from (curated catalog facts plus
  live-measured behavioral probes).
- [LLM API availability](./llm-availability) — manual health-probe observation
  windows (not a scheduled uptime measurement).
- [OCR capability comparison](./ocr-comparison) — CER/WER over synthetic
  documents for vision-capable models.
- [RAG vector store benchmark](./rag-benchmark) — a keyless retrieval harness
  comparing vector-store behavior with a deterministic SciFact-style fixture.
- [LLM exact-match benchmark](./llm-benchmark) — a small, reproducible
  exact-match accuracy benchmark, runnable in seconds from a clone.

To add a study, see the `TEMPLATE.md` in the relevant package under `packages/`.

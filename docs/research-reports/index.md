---
title: LLMs Research
description: English reports, data artifacts, and history kept as reproducible source material.
---

# LLMs Research

English reports, data artifacts, and history are kept here as reproducible
source material. The public reading line for the Japanese canonical articles is
[LLM基礎検証](../llm-foundation/).

These are organized by research topic. Current reports and data artifacts are
the reproducible source for each topic; keyless fixture outputs remain available
as self-tests but do not replace owner-triggered real measurements on the public
reading path.

Past generated frames are listed in [History](./history).

**Topics**

- [Foundation model catalog](./foundation-models) — A reference catalog of the compared models: provider, tier, price, effort, and API surface.
- [LLM response speed](./llm-speed-comparison) — Sustained throughput, time-to-first-token, and total latency.
- [LLM output accuracy](./llm-accuracy-comparison) — JSON-schema limits, length-instruction following, and information accuracy.
- [LLM API availability](./llm-availability) — Status-page incident history and derived 30/90-day availability trends.
- [OCR capability comparison](./ocr-comparison) — CER/WER and structured field extraction over synthetic documents.
- [RAG vector store benchmark](./rag-benchmark) — Retrieval quality, ingestion time, query latency, cost, and operational constraints.

To add a study, see the `TEMPLATE.md` in the relevant package under `packages/`.

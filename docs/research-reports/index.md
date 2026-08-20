---
title: LLMs Research
description: English reports, data artifacts, and history kept as reproducible source material.
---

# LLMs Research

English reports, data artifacts, and history are kept here as reproducible
source material. The same studies in Japanese are at
[LLM基礎検証](/ja/) — use the
language switcher in the header to move between them.

These are organized by research topic. Current reports and data artifacts are
the reproducible source for each topic; keyless fixture outputs remain available
as self-tests but do not replace owner-triggered real measurements on the public
reading path.

Past generated frames are listed in
[History](/en/history).

**Topics**

- [Foundation model catalog](/en/foundation-models) — A reference catalog of the compared models: provider, tier, price, effort, and API surface.
- [LLM response speed](/en/llm-speed-comparison) — Output throughput, time-to-first-token, and total latency.
- [LLM output accuracy](/en/llm-accuracy-comparison) — JSON-schema limits, length-instruction following, and information accuracy.
- [LLM API availability](/en/llm-availability) — Status-page incident history and derived 30/90-day availability trends.
- [Token counting and metering](/en/token-metering-comparison) — Library-independent input-token counting — exact self-implemented BPE where the vocabulary is published, calibrated estimation where it is not — validated against API-reported counts on a pinned English/Japanese/code sample set.
- [RAG vector store benchmark](/en/rag-benchmark) — Retrieval quality, ingestion time, query latency, cost, and operational constraints.
- [OCR capability comparison](/en/ocr-comparison) — CER/WER and structured field extraction over synthetic documents.
- [Image generation](/en/image-generation-comparison) — Generation latency, per-image cost, rubric-checked prompt adherence, and exact-text rendering.
- [SVG generation](/en/svg-generation-comparison) — Render validity, prompt fidelity (rasterize + fixed vision judge), path complexity, SMIL/CSS animation presence, generation latency, and token cost of frontier LLMs generating SVG.
- [Speech (TTS / STT / STS)](/en/speech-comparison) — Text-to-speech intelligibility & latency, speech-to-text word accuracy & latency, per-unit cost, and speech-to-speech realtime capability.
- [Agent SDK comparison](/en/agent-sdk-comparison) — A design comparison of agent frameworks/runtimes (OpenAI Agents SDK, Claude Agent SDK, Cloudflare Agents SDK, LangGraph) from public documentation — not measured.
- [Computer use](/en/computer-use-comparison) — Task success, steps, latency, wall-clock, and per-task cost for API-native computer-use agents over a pinned browser-task suite, one fixed Playwright harness.
- [Agent VM / sandbox comparison](/en/agent-vm-comparison) — Isolation model, published price, capability envelope, and probed cold-start latency and fixed-task cost of the sandbox / microVM platforms agents run untrusted code in.
- [Deep research APIs](/en/deep-research-comparison) — Rubric answer quality, citation validity, source diversity, latency, and per-query cost of autonomous deep-research endpoints, held against a transparent Anthropic build-your-own baseline.
- [Trend recency](/en/trend-recency-comparison) — Web-grounded knowledge recency of search-augmented systems vs. ungrounded controls: recency accuracy, citation validity and freshness, answer latency, and search-billing cost over trailing-window event probes.

## Reproduce a study

Every report documents the exact commands, required credentials, and expected
cost to reproduce it. Clone the repository, install with `make install`, and run
the study's command as listed on its page. To add a study, see the
`TEMPLATE.md` in the relevant package under `packages/`.

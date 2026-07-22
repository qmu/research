---
type: Strategy
title: Periodically benchmark speech AI capabilities (TTS, STT, STS)
slug: periodically-benchmark-speech-ai-capabilities-tts-stt-sts
status: active
created_at: 2026-07-22T12:18:56+09:00
author: a@qmu.jp
---

# Periodically benchmark speech AI capabilities (TTS, STT, STS)

## Direction

qmu's foundational research should keep an honest, current, publicly reproducible
picture of what API-accessible **speech AI** can do — text-to-speech (TTS),
speech-to-text (STT), and speech-to-speech (STS) — so clients choosing a provider
for voice assistants, transcription pipelines, and realtime agents can rely on
measured evidence rather than vendor claims. Speech providers ship new voices and
models and revise prices on a weeks-to-months rhythm, so a one-time survey goes
stale; this direction is the standing commitment to re-measure on a recurring,
cost-bounded cadence and publish the result alongside qmu's other LLM基礎検証
topics.

The measurement stays evidence-based and mechanical: per-call latency, TTS
intelligibility (a fixed STT judge's word-accuracy against known text), STT word
accuracy (1 − WER against a reference), and STS round-trip latency — with
subjective naturalness/MOS deliberately excluded, honest per-cell provenance
(a number exists only when a real call returned; missing credentials are
unreachable rows, never synthesized), a keyless deterministic fixture that keeps
the topic CI-suitable, and every paid run bounded by an owner-approved per-trial
ceiling. Over time the value is a per-provider trend the published article can
point to, not any single snapshot.

Completion is not a goal: as long as speech AI keeps evolving, this direction
persists, executed by successive periodic-benchmark missions.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->

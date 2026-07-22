---
type: Mission
title: Periodic Research Target: Text-to-Speech, Speech-to-Text, Speech-to-Speech
slug: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: periodically-benchmark-speech-ai-capabilities-tts-stt-sts
drive_authorized: true
tickets: []
stories: []
concerns: []
---

# Periodic Research Target: Text-to-Speech, Speech-to-Text, Speech-to-Speech

## Goal

qmu.co.jp's foundational research measures text-side model behavior (speed,
accuracy, availability, OCR) and, recently, image generation — but says nothing
about **speech**, which clients increasingly ask about when choosing a provider
for voice assistants, transcription pipelines, and realtime agents. This mission
adds a recurring, reproducible **speech** benchmark to the published LLM基礎検証
set: which API-accessible speech models exist across text-to-speech (TTS),
speech-to-text (STT), and speech-to-speech (STS), what each unit costs, how fast
a call returns, and how accurately audio is transcribed — measured by the same
evidence-based standards (keyless fixture self-test, honest per-cell provenance,
dated trial history, Japanese article) as every other published topic, and with
naturalness/MOS and other subjective listening judgement deliberately excluded
(only mechanically verifiable word-accuracy).

### Design proposal (proposal-first; awaiting owner approval)

Per `docs/research-development-guideline.md`, the five agreed elements:

1. **Cadence** — monthly. Speech providers ship new voices/models and revise
   prices on a weeks-to-months rhythm; a monthly trial bounds staleness. A new
   TTS/STT model release at a covered provider triggers an off-cadence trial.
2. **Comparison subjects** — the curated speech registry
   (`packages/tech/src/speech/models.ts`), verified 2026-07-14 with cited
   sources: **TTS** — OpenAI TTS-1, ElevenLabs Multilingual v2, Google Neural2,
   Amazon Polly Neural, Deepgram Aura-2; **STT** — OpenAI Whisper, Deepgram
   Nova-3, AssemblyAI Universal, Google Chirp, Amazon Transcribe; **STS**
   (cataloged realtime-duplex capability, latency measured later) — OpenAI GPT
   Realtime, Google Gemini Live, AWS Nova Sonic, xAI Grok Voice. Anthropic is
   recorded as a non-subject (no speech API). The registry anchors on per-unit
   priced models (TTS per 1M chars, STT per audio-minute); token-billed newer
   models are deferred to a later instrument version.
3. **Metrics** — call latency (ms, lower is better); TTS intelligibility
   (word-accuracy of a fixed STT judge's transcription vs the synthesized text,
   ratio, higher is better); STT word accuracy (1 − word error rate vs a
   reference transcript, ratio, higher is better). Per-character (TTS) and
   per-minute (STT) catalog prices are reference data, not measured.
4. **Cost and trial count** — `npm run research -- speech --estimate` prices
   each real run. Premises: TTS bills per character plus one STT-judge read of
   each synthesized clip; STT bills per audio-minute. 1–3 repetitions per
   subject (one detects large movements; three bound run-to-run variance the
   artifact records as stdDev). The current 3-utterance manifest estimates
   **~$0.04 total per trial**; agreed ceiling **$10/trial**, and an estimate
   above it stops for re-approval. More repetitions narrow variance but raise
   cost.
5. **Accumulated history** — per-subject series for latency, intelligibility
   (TTS), and word accuracy (STT), one point per monthly survey; charts connect
   same-manifest-version points only. After three or more surveys the current
   article's 推移 (trend) block shows per-provider movement across the tendency
   window.

## Scope

Done means: a `speech` research topic exists following the proposal-first
protocol and TEMPLATE.md — pure domain scoring (word-error-rate), speech-provider
access behind `vendors/speech/` anti-corruption ports (`TextToSpeechClient` /
`SpeechToTextClient`) with a keyless deterministic fixture and per-provider
adapters, a thin runner with fixture/estimate/real modes, a published EN page +
JP translation wired through `site.ts` shared metadata (title == sidebar label),
unit tests including the disk-reading published-page guards, and at least one
owner-approved real trial committed as a dated frame.

Out of scope: naturalness / MOS / voice-quality opinion scoring (only
mechanically verifiable word-accuracy), voice cloning and prosody control
comparisons, token-billed model variants (deferred to a later instrument
version), and running any provider call in CI (the fixture path stays keyless
and deterministic).

## Experience

What an operator running `npm run research -- speech --real` (keys present), or a
reader opening the published 音声 (speech) report, can observe — each point is
verifiable against the artifact or the rendered pages:

- The English report and its Japanese translation each render the 7-section
  outline with §4 within budget, no mermaid, and the sidebar label equal to the
  page title — the same guards every published topic passes.
- §4 shows per-subject TTS and STT rows carrying real measured numbers from a
  trial that cost at most $10: call latency (ms), TTS intelligibility (a fixed
  STT judge's word-accuracy of each synthesized clip vs its known text), and STT
  word accuracy (1 − WER vs the reference transcript). A subject with no reachable
  key is labelled unreachable/`error`, never a synthesized number.
- The metrics discriminate: at least one subject is separated from another beyond
  run-to-run stdDev on latency or word-accuracy, so the table informs a real
  provider choice rather than reading as uniform.
- STS is a timed metric, not just a capability row: each cataloged
  realtime-duplex provider shows a round-trip latency (first audio-out after last
  audio-in), lower-is-better, alongside TTS/STT.
- The trial is preserved as a dated frame under
  `docs/research-reports/history/speech/<timestamp>/` (English Markdown, data
  artifact, Japanese Markdown), so the monthly series connects
  same-manifest-version points.
- The keyless fixture path stays byte-stable and CI-suitable: with no keys,
  `npm run research -- speech` and the disk-reading published-page guards produce
  the deterministic fixture report and pass.

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, history) proposed for owner approval before publishing/paid runs (#20260714005158-kickoff-propose-periodic-research.md)
- [x] Topic runnable via `npm run research -- speech` with fixture/estimate/real modes; keyless fixture byte-stable and CI-suitable; WER scoring, `TextToSpeechClient`/`SpeechToTextClient` ports + OpenAI adapters + keyless fixtures, registered in `topic.ts` + `run-research.ts` (#20260714005158-kickoff-propose-periodic-research.md)
- [x] Published EN + JP pages added to `publishedResearchTopics` passing the title==sidebar-label, no-mermaid, section-4 budget, and 7-section outline guards (#20260714013700-publish-speech-topic-to-site.md)
- [ ] Remaining real provider adapters wired and first real trial run within the $10 ceiling, committed as a dated history frame with the design-validation review (guideline step 3) (#20260714013701-speech-first-real-trial.md)
- [ ] STS round-trip latency measured for the cataloged realtime-duplex providers, upgrading STS from a capability row to a timed metric (#20260714013702-speech-sts-latency-measurement.md)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship` (#20260714013700-publish-speech-topic-to-site.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-14 — mission created (scaffold) — .workaholic/missions/active/periodic-research-target-text-to-speech-speech-to-text-speech-to-speech/mission.md
- 2026-07-14 — kickoff drive (autonomous /drive night): design proposal drafted (awaiting owner approval); topic built fixture-only end to end mirroring the image-generation precedent — WER scoring + tests, `vendors/speech` ports + OpenAI adapters + keyless fixtures, curated web-verified registry (TTS/STT priced, STS+non-subject cataloged), unified-CLI wiring; keyless fixture page passes 7-section/§4-budget/no-mermaid guards; estimate ~$0.04/trial (ceiling $10); full suite green (320 tests, lint, tsc). NOT yet published and NO paid run (both owner-gated) — 20260714005158-kickoff-propose-periodic-research.md
- 2026-07-14 — remaining, owner-gated: design sign-off + publish EN/JP to site (#20260714013700), first real trial + remaining adapters (#20260714013701), STS latency measurement (#20260714013702) — filed to .workaholic/tickets/icebox/
- 2026-07-14 — owner said proceed: PUBLISHED to site — `speech` added to publishedResearchTopics (design block + EN/JP sidebar labels), topic stages switched to benchmark+insights+translation, JP page hand-authored (keyless; no ANTHROPIC key present — regenerated by research:translate-report on first real run), indexes rebuilt; EN/JP pass outline/title==label/§4-budget/no-mermaid guards; 320 tests + lint green — 20260714013700-publish-speech-topic-to-site.md
- 2026-07-14 — still gated on API keys (none in this worktree): first real trial (#20260714013701), STS latency (#20260714013702); qmu-co-jp reflection on next /ship
- 2026-07-22 — developer approved the paid speech trial ($10/trial ceiling) 2026-07-22; tickets 013701/013702 moved icebox→todo/a-qmu-jp with the spend approval recorded in each (remaining gate is environmental provider keys only); wrote the observable ## Experience section. Strategy link + drive_authorized deferred pending the developer's strategy-granularity decision — mission.md
- 2026-07-22 — strategy created — periodically-benchmark-speech-ai-capabilities-tts-stt-sts — strategy.md
- 2026-07-22 — mission replanned — first real trial ($10 ceiling) + STS latency authorized; strategy linked; drive-ready — mission.md

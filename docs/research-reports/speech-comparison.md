---
title: Speech (TTS / STT / STS)
description: A reproducible comparison of speech AI APIs — text-to-speech intelligibility and latency, speech-to-text word accuracy and latency, per-unit catalog cost, and speech-to-speech realtime capability.
---

# Speech (TTS / STT / STS)

This report compares speech APIs by **mechanically verifiable** behavior only — a fixed speech-to-text judge reads synthesized audio and word-accuracy is computed against a reference; no naturalness (MOS) or other subjective listening judgement enters the scores.

## 1. Research Purpose

The purpose is to record which speech APIs exist across text-to-speech, speech-to-text, and speech-to-speech, what each unit costs, how fast a call returns, and how accurately audio is transcribed — the properties that decide integration choices.

## 2. Measurement Targets

### Target Models

The subjects are the speech models in the curated registry (`packages/tech/src/speech/models.ts`): text-to-speech and speech-to-text APIs, each with a cited source and last-verified date. Speech-to-speech is cataloged as a realtime capability, and its round-trip first-audio latency is measured for providers with a wired realtime adapter (section 7).

- **Anthropic** is not a subject: it exposes no speech API (Claude accepts only text/image input and returns text) (verified 2026-07-14).

### Target Metrics

Measured metrics are call latency (ms, lower is better), text-to-speech intelligibility (word-accuracy of a fixed STT judge's transcription vs the synthesized text, higher is better), speech-to-text word accuracy (1 − word error rate vs a reference transcript, higher is better), and speech-to-speech round-trip first-audio latency (ms from committing a short input turn to the first audio-output chunk over a realtime duplex session, lower is better). Per-character and per-minute prices are curated catalog data (reference), not measurements.

## 3. Scope and Constraints

- **Mechanically scored only.** Quality is word-accuracy against a reference; the instrument never scores naturalness or voice quality. Swapping the STT judge (`whisper-1`) is an instrument change, not a routine update.
- Manifest version `1`: 3 text-to-speech utterance(s) and 3 speech-to-text reference clip(s). History connects same-manifest-version points only.
- **Audio binaries are not committed.** The artifact records byte length, timing, transcriptions, and scores — enough to regenerate this page — never the audio itself. A real speech-to-text run reads reference clips from `SPEECH_AUDIO_DIR` (see the manifest's cited public-domain source).
- The fixture path is keyless and deterministic. Real adapters are wired for OpenAI, ElevenLabs, Google, Deepgram, and AssemblyAI (TTS/STT REST) and for OpenAI Realtime and Google Gemini Live (STS round-trip); each row measures only when its provider key is present, otherwise it is an honest `error` row. Amazon (SigV4) and xAI stay unwired. Real numbers appear only after an owner runs the real path within the approved ceiling (run `--estimate` first).
- Point-in-time: each measured row records its own `measuredAt` in the artifact (a frame may carry rows measured on different dates — e.g. a speech-to-speech round-trip added to a survey whose text-to-speech/speech-to-text rows stand from the prior run); catalog prices are as of each row's last-verified date. This frame's generated timestamp is `2026-07-19T02:22:34.606Z`.

## 4. Verification Results

This run has **2 measured** of 10 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

**Text-to-speech**

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
| Synthesis latency | 1679 ms — OpenAI TTS-1 | 1679 ms | 1679 ms |
| Intelligibility | 100.0% — OpenAI TTS-1 | 100.0% | 100.0% |

**Speech-to-text**

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
| Transcription latency | 1124 ms — OpenAI Whisper | 1124 ms | 1124 ms |
| Word accuracy | 95.8% — OpenAI Whisper | 95.8% | 95.8% |

**Speech-to-speech** — round-trip first-audio latency measured for 2 of 4 realtime providers: fastest 381 ms — OpenAI; slowest 1326 ms — Google. Per-provider rows and unreachable providers are in section 7. "Best"/"Worst" follow each metric's direction (lower latency, higher intelligibility and word accuracy are better).

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. Analysis

Rows with `measured` provenance can be compared within a capability on latency and word-accuracy; price is catalog context. Contrasting text-to-speech intelligibility with speech-to-text word accuracy localizes where error enters — synthesis clarity versus recognition.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- speech --fixture

# Cost preview, then the owner-gated real run (OpenAI adapters wired):
npm run research -- speech --estimate
SPEECH_AUDIO_DIR=./audio OPENAI_API_KEY=... npm run research -- speech --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills text-to-speech per character plus one STT-judge read of each synthesized clip, speech-to-text per audio minute (see the per-subject catalog prices), and speech-to-speech per realtime token (a short round-trip turn, estimated conservatively as a flat per-turn figure); the agreed ceiling is $10 per trial and `--estimate` must run first.

### Cleanup

No external resources are created. Synthesized and reference audio are held in memory for scoring and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-subject results**

| Subject | Provider | Capability | Provenance | Price | Streaming | Latency (mean±sd) | Intelligibility | Word accuracy | Note |
| ------- | -------- | ---------- | ---------- | ----- | --------- | ----------------- | --------------- | ------------- | ---- |
| OpenAI TTS-1 | openai | tts | measured | 15 USD/1M chars | yes | 1679 ± 632 (n=9) | 100.0% ± 0.0% (n=9) | not measured |  |
| ElevenLabs Multilingual v2 | elevenlabs | tts | error | 100 USD/1M chars | yes | not measured | not measured | not measured | Error: ELEVENLABS_API_KEY is required for a real elevenlabs run. |
| Google Cloud Neural2 | google | tts | error | 16 USD/1M chars | yes | not measured | not measured | not measured | Error: Google TTS Neural2 failed: 401 {   "error": {     "code": 401,     "message": "API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal. See https://cloud.google.com/docs/authentication",     "status": "UNAUTHENTICATED",     "details": [       {         "@type": "type.googleapis.com/google.rpc.ErrorInfo",         "reason": "CREDENTIALS_MISSING",         "domain": "googleapis.com",         "metadata": {           "method": "google.cloud.texttospeech.v1.TextToSpeech.SynthesizeSpeech",           "service": "texttospeech.googleapis.com"         }       }     ]   } } |
| Amazon Polly Neural | amazon | tts | error | 16 USD/1M chars | yes | not measured | not measured | not measured | Error: real adapter for provider 'amazon' is not wired yet (Amazon needs AWS SigV4 + the Transcribe async-S3 design decision; tracked as a follow-up); run --fixture or select a wired provider. |
| Deepgram Aura-2 | deepgram | tts | error | 30 USD/1M chars | yes | not measured | not measured | not measured | Error: DEEPGRAM_API_KEY is required for a real deepgram run. |
| OpenAI Whisper | openai | stt | measured | 0.006 USD/audio-minute | no | 1124 ± 588 (n=9) | not measured | 95.8% ± 6.3% (n=9) |  |
| Deepgram Nova-3 | deepgram | stt | error | 0.0077 USD/audio-minute | yes | not measured | not measured | not measured | Error: DEEPGRAM_API_KEY is required for a real deepgram run. |
| AssemblyAI Universal | assemblyai | stt | error | 0.0035 USD/audio-minute | yes | not measured | not measured | not measured | Error: ASSEMBLYAI_API_KEY is required for a real assemblyai run. |
| Google Cloud Speech-to-Text (Chirp) | google | stt | error | 0.016 USD/audio-minute | yes | not measured | not measured | not measured | Error: Google STT chirp failed: 401 {   "error": {     "code": 401,     "message": "API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal. See https://cloud.google.com/docs/authentication",     "status": "UNAUTHENTICATED",     "details": [       {         "@type": "type.googleapis.com/google.rpc.ErrorInfo",         "reason": "CREDENTIALS_MISSING",         "domain": "googleapis.com",         "metadata": {           "method": "google.cloud.speech.v1.Speech.Recognize",           "service": "speech.googleapis.com"         }       }     ]   } } |
| Amazon Transcribe | amazon | stt | error | 0.006 USD/audio-minute | yes | not measured | not measured | not measured | Error: real adapter for provider 'amazon' is not wired yet (Amazon needs AWS SigV4 + the Transcribe async-S3 design decision; tracked as a follow-up); run --fixture or select a wired provider. |

**Speech-to-speech (cataloged capability + measured round-trip)**

The round-trip is the first-audio latency after committing one short text input turn over a realtime duplex session (a control simplification that keeps the measurement reproducible without a committed audio clip). Providers without a wired realtime adapter, or without a present key, are honest `error` / not-attempted rows.

| Provider | API | Model id | Duplex realtime | Provenance | Round-trip first-audio (mean±sd) | Verified | Source / note |
| -------- | --- | -------- | --------------- | ---------- | -------------------------------- | -------- | ------------- |
| OpenAI | Realtime API (GPT Realtime, GA) | gpt-realtime | yes | measured | 381 ± 21 (n=3) | 2026-07-14 | https://developers.openai.com/api/docs/models/gpt-realtime |
| Google | Gemini Live API (2.5 Flash Native Audio) | gemini-2.5-flash-native-audio-preview-12-2025 | yes | measured | 1326 ± 120 (n=3) | 2026-07-14 | https://ai.google.dev/gemini-api/docs/live |
| AWS | Bedrock Nova Sonic (legacy; Nova 2 Sonic successor) | amazon.nova-sonic-v1:0 | yes | error | error | 2026-07-14 | Error: no wired realtime adapter for 'AWS' (Bedrock Nova Sonic (legacy; Nova 2 Sonic successor)); it stays a cataloged capability. Wire it or run --fixture. |
| xAI | Grok Voice Agent API | grok-voice-latest | yes | error | error | 2026-07-14 | Error: no wired realtime adapter for 'xAI' (Grok Voice Agent API); it stays a cataloged capability. Wire it or run --fixture. |

**Utterance manifest (version 1)**

| Utterance id | Kind | Text / reference |
| ------------ | ---- | ---------------- |
| tts-pangram | tts | The quick brown fox jumps over the lazy dog |
| tts-clarity | tts | She sells seashells by the seashore on a sunny day |
| tts-common | tts | Please remember to bring your umbrella and jacket tomorrow |
| stt-birch | stt | The birch canoe slid on the smooth planks |
| stt-glue | stt | Glue the sheet to the dark blue background |
| stt-depth | stt | It is easy to tell the depth of a well |

**Judge provenance.** Every text-to-speech output was read by `whisper-1`; each call's transcription and scores are preserved verbatim in the artifact.

The complete run record is committed as [`speech-comparison.data.json`](./speech-comparison.data.json): per-call latencies, audio byte lengths, transcriptions, and scores.

Generated: 2026-07-19T02:22:34.606Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-19T02:22:34.606Z](./history/speech/2026-07-19T02-22-34-606Z/speech-comparison)
- [2026-07-18T15:09:30.905Z](./history/speech/2026-07-18T15-09-30-905Z/speech-comparison)

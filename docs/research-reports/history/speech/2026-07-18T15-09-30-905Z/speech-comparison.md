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

The subjects are the speech models in the curated registry (`packages/tech/src/speech/models.ts`): text-to-speech and speech-to-text APIs, each with a cited source and last-verified date. Speech-to-speech is cataloged as a realtime capability (section 7).

- **Anthropic** is not a subject: it exposes no speech API (Claude accepts only text/image input and returns text) (verified 2026-07-14).

### Target Metrics

Measured metrics are call latency (ms, lower is better), text-to-speech intelligibility (word-accuracy of a fixed STT judge's transcription vs the synthesized text, higher is better), and speech-to-text word accuracy (1 − word error rate vs a reference transcript, higher is better). Per-character and per-minute prices are curated catalog data (reference), not measurements.

## 3. Scope and Constraints

- **Mechanically scored only.** Quality is word-accuracy against a reference; the instrument never scores naturalness or voice quality. Swapping the STT judge (`whisper-1`) is an instrument change, not a routine update.
- Manifest version `1`: 3 text-to-speech utterance(s) and 3 speech-to-text reference clip(s). History connects same-manifest-version points only.
- **Audio binaries are not committed.** The artifact records byte length, timing, transcriptions, and scores — enough to regenerate this page — never the audio itself. A real speech-to-text run reads reference clips from `SPEECH_AUDIO_DIR` (see the manifest's cited public-domain source).
- The fixture path is keyless and deterministic; only the OpenAI adapters are wired for the real path in this first instrument (other providers land with the first real trial). Real numbers appear only after an owner runs the real path within the approved ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the APIs at `2026-07-18T15:09:30.905Z`; catalog prices are as of each row's last-verified date.

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

**Speech-to-speech** — 4 of 4 cataloged providers expose a realtime duplex API; round-trip latency is measured by a later trial. The full capability table is in section 7. "Best"/"Worst" follow each metric's direction (lower latency, higher intelligibility and word accuracy are better).

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

The fixture path is keyless and costless. A real trial bills text-to-speech per character plus one STT-judge read of each synthesized clip, and speech-to-text per audio minute (see the per-subject catalog prices); the agreed ceiling is $10 per trial and `--estimate` must run first.

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

**Speech-to-speech capability (cataloged)**

| Provider | API | Model id | Duplex realtime | Verified | Source |
| -------- | --- | -------- | --------------- | -------- | ------ |
| OpenAI | Realtime API (GPT Realtime, GA) | gpt-realtime | yes | 2026-07-14 | https://developers.openai.com/api/docs/models/gpt-realtime |
| Google | Gemini Live API (2.5 Flash Native Audio) | gemini-2.5-flash-native-audio-preview-12-2025 | yes | 2026-07-14 | https://ai.google.dev/gemini-api/docs/live |
| AWS | Bedrock Nova Sonic (legacy; Nova 2 Sonic successor) | amazon.nova-sonic-v1:0 | yes | 2026-07-14 | https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-sonic.html |
| xAI | Grok Voice Agent API | grok-voice-latest | yes | 2026-07-14 | https://docs.x.ai/developers/model-capabilities/audio/voice-agent |

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

Generated: 2026-07-18T15:09:30.905Z

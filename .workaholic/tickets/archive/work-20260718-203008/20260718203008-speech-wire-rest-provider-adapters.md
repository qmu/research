---
created_at: 2026-07-18T20:30:08+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash: 4fe3136
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260714013700-publish-speech-topic-to-site.md]
---

# Speech: wire the REST/API-key provider adapters (keyless-verifiable)

## Overview

Only the OpenAI TTS/STT adapters are wired for the real path today
(`vendors/speech/openai.ts`); every other registry subject throws "not wired
yet" in `speech/run.ts`. This ticket wires the remaining providers that fit the
instrument's **in-memory, resource-free, single-shot REST** model so that the
owner-gated first real trial (#20260714013701, still in icebox) only needs the
trigger — no code change — for those providers.

Scope is deliberately the bearer/token/API-key REST providers:

- **TTS** — ElevenLabs (Multilingual v2), Google Cloud (Neural2), Deepgram (Aura-2).
- **STT** — Deepgram (Nova-3), AssemblyAI (Universal), Google Cloud (Chirp).

Explicitly **out of this ticket**: Amazon Polly (TTS) and Amazon Transcribe
(STT). Polly needs AWS SigV4 signing (the `credentials.ts` `AwsSigV4Credential`
contract, not a bearer key), and Transcribe is async batch over S3 — which
conflicts with the estimate's own "no persistent provider resources are created;
audio is scored in memory and discarded" promise. Amazon is a separate follow-up
that must resolve that design question first; it is recorded as an escalation,
not forced here.

## Key Files

- `packages/tech/src/vendors/speech/types.ts` — the neutral ports
  (`TextToSpeechClient` / `SpeechToTextClient`, `AudioClip`), unchanged.
- `packages/tech/src/vendors/speech/openai.ts` — the adapter pattern to mirror.
- `packages/tech/src/vendors/speech/{elevenlabs,deepgram,assemblyai,google}.ts`
  — new adapters (created here).
- `packages/tech/src/speech/run.ts` — `ttsClientFor` / `sttClientFor` routing.

## Implementation Steps

1. For each provider, add a `vendors/speech/<provider>.ts` behind the existing
   ports, mirroring `openai.ts`: measure wall-clock `elapsedMs` inside the call,
   key-gate by env var, and keep every provider dialect (voice ids, endpoints,
   response shapes, audio encodings) inside the ACL. Export the pure
   request-builder and response-parser helpers so they are unit-tested without a
   network call (the `vendors/llm/perplexity.ts` `extractPerplexityCitations`
   convention).
2. Route the new adapters in `speech/run.ts` `ttsClientFor` / `sttClientFor`,
   mirroring the OpenAI branch: a missing key throws a clear `<PROVIDER>_API_KEY
   required` so `runSpeechComparison` records an honest `provenance: "error"`
   row rather than a silent fixture substitution (provenance stays truthful on
   `--real`).
3. Keep the keyless fixture path (`--fixture`) byte-stable and untouched — no
   new adapter runs in CI; only the pure helpers are exercised by tests.

## Policies

- **Implementation — anti-corruption boundary.** Provider dialects (auth
  schemes, endpoint URLs, voice ids, JSON response shapes, audio encodings) live
  only in `vendors/speech/`; `domain/` and the entrypoint see only the neutral
  `TextToSpeechClient` / `SpeechToTextClient` ports. A new provider is a new file
  under `vendors/speech/`, never a branch in domain logic.
- **Implementation — machine-checkable early.** The parse/normalize logic that
  turns a provider response into a neutral type is a pure exported function with
  unit tests over recorded response shapes, so wire-format drift fails a test
  rather than a paid run.
- **Operation — keyless, deterministic CI.** No provider call runs in CI; the
  fixture path stays keyless and byte-stable. Real adapters are reachable only
  when their env key is present, and their absence yields an honest error row,
  never a fabricated measurement.

## Quality Gate

- `cd packages/tech && npm run build` — clean tsc, bare exit 0.
- `cd packages/tech && npm test` — full suite green (bare exit 0), including new
  pure-helper unit tests for every wired provider and the unchanged
  fixture-path guards.
- `cd packages/tech && npm run lint` — clean, bare exit 0.
- No new runtime dependency added (all adapters use `fetch` + `node:*` only).
- The keyless fixture path output is unchanged (byte-stable): the existing
  `speech/run.test.ts` fixture assertions still pass verbatim.

## Acceptance

- [x] ElevenLabs TTS, Google TTS, Deepgram TTS adapters wired behind the ports
      and routed in `ttsClientFor`, key-gated by env var.
- [x] Deepgram STT, AssemblyAI STT, Google STT adapters wired behind the ports
      and routed in `sttClientFor`, key-gated by env var.
- [x] Each adapter exports pure request/response helpers with keyless unit tests
      over recorded response shapes; `npm test` / `build` / `lint` green per
      package with bare exit codes.
- [x] Amazon Polly + Transcribe recorded as a distinct follow-up (SigV4 +
      Transcribe-async-S3 design question), not wired here.

## Final Report

Wired six real speech provider adapters behind the existing `vendors/speech/`
ports, all fitting the instrument's in-memory, single-shot, API-key/token REST
model:

- **New adapters** — `vendors/speech/elevenlabs.ts` (TTS), `deepgram.ts` (TTS +
  STT), `assemblyai.ts` (STT, async upload→submit→poll), `google.ts` (TTS + STT
  via `?key=` v1 REST). Each measures wall-clock `elapsedMs` inside the call and
  keeps every provider dialect (auth scheme, endpoints, voice ids, response
  shapes, audio encodings) inside the ACL.
- **Routing** — `speech/run.ts` now key-gates each provider through
  `PROVIDER_KEY_ENV` + `requireKey`; `ttsClientFor` / `sttClientFor` dispatch to
  the wired adapters. A missing key throws a clear `<ENV> is required` so
  `runSpeechComparison` records an honest `provenance: "error"` row, never a
  silent fixture substitution.
- **Keyless tests** — one `*.test.ts` per adapter over the exported pure
  request-builders and response-parsers (recorded shapes, no network). Full
  suite green: 587 pass / 1 skipped across 81 files (`tsc` + `vitest`), lint
  clean, no new runtime
  dependency. The keyless fixture path (`speech/run.test.ts`) is unchanged and
  byte-stable; `npm run research -- speech --estimate` prints ~$0.04/trial.

**Quality Gate:** `npm run build` exit 0, `npm test` exit 0, `npm run lint`
exit 0 (bare, per package). Verified.

**Deliberately not wired:** Amazon Polly (AWS SigV4, not a bearer key) and
Amazon Transcribe (async S3 batch, which conflicts with the estimate's
"no persistent provider resources" promise). Google's newest **Chirp** STT
variant is v2/regional/OAuth-only; this adapter targets the API-key v1
`recognize` surface and passes the model id through, with the v2 caveat noted in
`google.ts`. Both are recorded as icebox follow-up #20260718203009. The
owner-gated first real trial (#20260714013701) remains paid and untouched.

## Considerations

The first real trial is still owner-gated and paid (#20260714013701 in icebox):
this ticket adds no paid run and creates no persistent provider resources. Audio
binaries are never committed; adapters return byte length, timing, and text
only. AssemblyAI's transcription is async (upload → submit → poll), so its
measured latency legitimately includes poll wait — that is the honest end-to-end
transcription time for that provider's model.

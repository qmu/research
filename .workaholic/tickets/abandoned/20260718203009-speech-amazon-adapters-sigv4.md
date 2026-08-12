---
created_at: 2026-07-18T20:30:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260718203008-speech-wire-rest-provider-adapters.md]
blocked_by: AWS SigV4 credential-contract decision + Transcribe async-S3 design resolution
---

# Speech: wire Amazon Polly (TTS) and Transcribe (STT)

## Overview

The keyless adapter-wiring ticket (#20260718203008) wired every registry subject
that fits the instrument's in-memory, single-shot, API-key REST model
(ElevenLabs, Google, Deepgram, AssemblyAI + the existing OpenAI). Amazon is the
remainder because it does not fit that model without a design decision:

- **Amazon Polly (TTS)** authenticates with **AWS SigV4**, not a bearer key — the
  `vendors/llm/credentials.ts` `AwsSigV4Credential` contract (already used by
  `bedrock.ts`), not the `<PROVIDER>_API_KEY` env-gate the other speech adapters
  use. `SynthesizeSpeech` is synchronous and in-memory, so once signing is
  available it fits the instrument. Decide: add an `@aws-sdk/client-polly`
  dependency (a `docs/dependency-decisions.md` entry) or sign requests with
  `node:crypto` behind the ACL.
- **Amazon Transcribe (STT)** has no synchronous single-shot REST call: batch
  transcription is asynchronous over **S3** (StartTranscriptionJob → poll → read
  the S3 output object), and the streaming API is an HTTP/2 SigV4 event stream.
  Both conflict with the estimate's own promise — "No persistent provider
  resources are created; audio is scored in memory and discarded." Resolve the
  design first: either accept a transient S3 object in the instrument (and revise
  the promise) or implement the streaming path, before wiring.

## Implementation Steps

1. Extend the speech credential path to carry an `AwsSigV4Credential` (region +
   keys) alongside the bearer-key env gate, mirroring how `credentials.ts`
   generalizes the LLM credential contract.
2. Add `vendors/speech/amazon.ts` behind the existing `TextToSpeechClient` /
   `SpeechToTextClient` ports: Polly `SynthesizeSpeech` for TTS; the resolved
   Transcribe path for STT. Keep pure request-signing/response-parsing helpers
   exported for keyless unit tests.
3. Route Amazon in `speech/run.ts` `ttsClientFor` / `sttClientFor` (they
   currently throw a clear "Amazon needs AWS SigV4 …" error).

## Policies

- **Implementation — anti-corruption boundary.** SigV4 signing, S3 handling, and
  Transcribe's job/poll machinery live only in `vendors/speech/amazon.ts`; the
  ports and `domain/` never see AWS types.
- **Operation — resource-free instrument.** If Transcribe requires a transient S3
  object, the instrument's "no persistent provider resources" promise must be
  revised honestly (transient, torn down per call) rather than silently broken.
- **Planning — dependency decisions are recorded.** Adding any `@aws-sdk/*`
  package is a `docs/dependency-decisions.md` entry, not a silent addition.

## Quality Gate

- `cd packages/tech && npm run build` / `npm test` / `npm run lint` green per
  package, bare exit 0, with keyless unit tests for the pure signing/parse
  helpers.
- The keyless fixture path stays byte-stable; no AWS call runs in CI.

## Considerations

Owner-gated and paid at trial time (folds into #20260714013701's first real
trial). Until wired, Amazon's two registry cards record `provenance: "error"` on
a `--real` run, which is honest — the report shows a not-yet-measured row rather
than a fabricated number.

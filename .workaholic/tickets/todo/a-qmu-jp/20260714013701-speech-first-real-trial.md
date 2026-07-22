---
created_at: 2026-07-14T01:37:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260714005158-kickoff-propose-periodic-research.md]
blocked_by: provider API keys must be present in the run environment (spend approved 2026-07-22)
---

# Speech: wire remaining real adapters and run the first real trial

## Overview

The disposable first trial that validates the speech design (guideline step 3).
Only the OpenAI adapters are wired for the real path today; this ticket adds the
rest and runs one real trial within the $10 ceiling.

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session, $10/trial ceiling. Remaining gate is environmental: provider API keys
must be present in the run environment; the instrument self-reports missing
credentials and records unreachable rows.

## Implementation Steps

1. Implement the real adapters behind the existing `vendors/speech/` ports for
   the remaining providers, mirroring `vendors/speech/openai.ts`:
   - TTS: ElevenLabs, Google Cloud TTS, Amazon Polly, Deepgram Aura.
   - STT: Deepgram Nova-3, AssemblyAI Universal, Google Chirp, Amazon Transcribe.
   Route them in `speech/run.ts` `ttsClientFor` / `sttClientFor` (they currently
   throw "not wired yet" for non-OpenAI providers). Key-gate each by env var and
   fall back to fixture when absent, per the keyless-CI convention.
2. Provide reference audio: download the manifest's cited public-domain Harvard
   sentence clips into `SPEECH_AUDIO_DIR` named `<utterance-id>.wav`.
3. Re-confirm catalog prices/model-ids in `speech/models.ts` against the cited
   sources on the run date; update `lastVerified`.
4. `npm run research -- speech --estimate` (must be ≤ $10; stop for re-approval
   above it), then `npm run research -- speech --real`.
5. Archive the dated frame: `npm run research:archive -- speech --generated-at
   <iso>`; review whether the metrics discriminate between subjects and whether
   cost matched the estimate; confirm or revise the monthly cadence.

## Policies

- **proposal-first / owner-gated real run** — spend is approved (a@qmu.jp,
  2026-07-22, $10/trial ceiling); if `--estimate` exceeds $10, stop for
  re-approval. The remaining gate is environmental provider API keys only.
- **guideline Step 3 (validation trial)** — the first real trial is a disposable
  validation of the design; record whether the metrics discriminate and confirm
  or revise the monthly cadence in the mission.
- **No fabrication — provenance load-bearing** — a cell is `measured` only when a
  real call returned; missing credentials self-report as unreachable/`error`
  rows, never synthesized.
- **workaholic:mission** — on completion, tick the matching Acceptance item in
  `mission.md` and append a Changelog line.

## Quality Gate

- One real trial completes within the approved $10 ceiling and is committed as a
  dated history frame under `docs/research-reports/history/speech/<timestamp>/`.
- Every remaining TTS/STT provider adapter is routed in `speech/run.ts` (no
  "not wired yet" throw); providers without a key fall back to fixture and are
  labelled unreachable/`error`, not synthesized.
- Actual cost is verified against `--estimate` and the ceiling; the metrics'
  discrimination between subjects and the monthly cadence are reviewed and
  recorded in `mission.md` (Changelog + Acceptance tick).
- `cd packages/tech && npm test` and lint pass with bare exit codes.

## Considerations

Numerals/punctuation in TTS texts would corrupt the mechanical word match — keep
the manifest numeral-free. Audio binaries are never committed; the artifact keeps
byte length, timing, transcriptions, and scores only.

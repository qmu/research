---
created_at: 2026-07-14T01:37:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 9d1c943
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260714005158-kickoff-propose-periodic-research.md]
blocked_by: owner approval + provider API keys (proposal-first paid-run gate)
---

# Speech: run the first real trial and publish the measured frame

## Overview

**Owner-gated, paid** — the disposable first trial that validates the speech
design (guideline step 3). The six keyless REST adapters (ElevenLabs / Google /
Deepgram TTS + Deepgram / AssemblyAI / Google STT) already landed wired on
`4fe3136`; Amazon (Polly SigV4 + Transcribe async-S3) is split to a separate
follow-up. This ticket runs one real trial within the $10 ceiling with whatever
credentials are present, archives the measured dated frame, writes the
design-validation review, and re-composes the published EN/JP pages from the
measured frame. Developer authorized the paid run on 2026-07-18 ("go all the
actual runs").

## Policies

- **Objective docs (CLAUDE.md).** Every published cell carries honest
  per-provider provenance: a real `measured` row, or an `error` row with the
  provider's own failure text — never a fabricated number and never a silent
  fixture fallback. This is the mission's load-bearing standard.
- **Proposal-first research.** The trial spends only after the developer's
  explicit go and only within the agreed $10/trial provider ceiling; the
  `--estimate` is recorded before the `--real` run.
- **Layered `src/` (implementation policy).** History extraction is pure
  `domain/` logic (`research/domain/snapshot.ts`) with a keyless unit test; no
  provider access moves out of `vendors/speech/`.
- **Keyless, byte-stable fixture path.** The published pages are re-composed
  from the committed measured frame by the keyless `--fixture` path; audio
  binaries are never committed. `check-fixture-drift.sh` must stay green.

## Quality Gate

- `cd packages/tech` bare exit codes: `npm test`, `npm run build`, `npm run lint`
  all pass (no `make test`/`make lint`).
- `--estimate` recorded and within the $10 provider ceiling before `--real`.
- Measured artifact carries honest per-cell provenance (measured rows have real
  timing/scores; unreachable providers are `error` rows with their own message).
- A dated history frame is committed under
  `docs/research-reports/history/speech/<ts>/` (EN report + data artifact + JP
  report), and the published EN/JP current pages are re-composed from it (fixture
  render moved aside to the gitignored `*.fixture.*`).
- `research -- speech --fixture` re-run is a no-op against the committed pages
  (drift-stable), because the measured frame — not the fixture — is now the
  source of truth.

## Implementation Steps (as executed)

1. Wire remaining adapters — DONE earlier (`4fe3136`, six REST adapters);
   Amazon split to `20260718203009`.
2. Provide reference audio: segmented the cited public-domain Harvard sentences
   (Open Speech Repository list 1) into per-utterance clips (`stt-birch`,
   `stt-glue`, `stt-depth`) for `SPEECH_AUDIO_DIR`. Audio never committed.
3. `npm run research -- speech --estimate --trials 3` → ~$0.12 (≤ $10).
4. `npm run research -- speech --real --trials 3` → measured OpenAI TTS + OpenAI
   Whisper STT; honest `error` rows for the keyless/unreachable providers.
5. Add the missing `speech` snapshot extractor so the measured frame qualifies
   for measured-frame composition and the accumulated-history series (design
   element 5) can accrue.
6. Archive the dated frame; translate the raw measured report to JP; re-compose
   the published EN/JP pages from the frame; rebuild indexes.

## Considerations

Numerals/punctuation in TTS texts would corrupt the mechanical word match — the
manifest stays numeral-free. Audio binaries are never committed; the artifact
keeps byte length, timing, transcriptions, and scores only.

## Acceptance

- [x] `--estimate` recorded (~$0.12 at 3 reps for all 10 subjects) and within the
      $10 provider ceiling before the `--real` run.
- [x] First real trial run; measured artifact carries honest per-cell provenance
      (2 measured OpenAI rows, 8 honest `error` rows), committed as a dated
      history frame under `docs/research-reports/history/speech/`.
- [x] Published EN/JP current pages re-composed from the measured frame; the
      keyless `--fixture` regeneration is byte-stable (drift-clean).
- [x] `npm test` / `npm run build` / `npm run lint` green in `packages/tech`.
- [ ] All wired providers MEASURED (not just OpenAI) — deferred: needs
      ElevenLabs/Deepgram/AssemblyAI keys and a GCP OAuth/service-account
      credential for Google Cloud Speech (the present `GOOGLE_API_KEY` is a
      Generative-Language key the Cloud Speech APIs reject with 401). Tracked as
      a follow-up alongside Amazon (`20260718203009`).

## Final Report

**Outcome: implemented.** The mission's first real speech trial ran under the
developer's 2026-07-18 authorization and is committed as a measured dated frame
(`docs/research-reports/history/speech/2026-07-18T15-09-30-905Z/`), with the
published EN/JP pages re-composed from it (commit `9d1c943`).

**What measured.** Only the OpenAI-backed paths were reachable with the
environment's credentials:
- OpenAI TTS-1 (TTS): synthesis latency 1679 ± 632 ms (n=9), intelligibility
  100.0% ± 0.0% — the whisper-1 judge transcribed every synthesized clip exactly.
- OpenAI Whisper (STT): transcription latency 1124 ± 588 ms (n=9), word accuracy
  95.8% ± 6.3%.

**What errored (honest rows, never faked).** ElevenLabs / Deepgram (TTS+STT) /
AssemblyAI — no API key present. Google Neural2 / Chirp — the present
`GOOGLE_API_KEY` is a Generative-Language (Gemini) key; Cloud TTS/STT reject it
with `401 … "API keys are not supported by this API. Expected OAuth2 access
token …"`, so Google needs a GCP OAuth/service-account credential, not the Gemini
key. Amazon Polly/Transcribe — adapter not wired (`20260718203009`).

**Design-validation review (guideline step 3).**
- *Metric discrimination.* Cross-subject discrimination is limited this trial
  (one measured subject per capability), but within-subject the STT WER metric is
  sensitive: the birch clip scored 0.875 every repetition (Whisper heard "birch
  canoes" for the reference "birch canoe" — one substitution in eight words)
  while glue/depth scored 1.0. TTS intelligibility saturated at 1.0 for all three
  utterances, so at the strong-TTS + strong-judge end it is a weak discriminator;
  latency (with sd ≈ 600 ms) and STT word-accuracy carry the comparative signal.
- *Reps.* 3 repetitions were worthwhile — the latency stdDev (~600 ms) shows real
  run-to-run variance the artifact now records; keep 1–3 per the design.
- *Cost vs estimate.* Estimate ~$0.12 (3 reps × 10 subjects). Actual provider
  spend was far lower (~<$0.02) because 8/10 subjects errored before any billable
  call — only OpenAI billed (9 short syntheses + 9 judge reads + 9 STT reads,
  plus ~11 short Whisper probes used to identify the segmented reference clips).
  Publish-pipeline LLM spend: insights (~1 Sonnet call, ~$0.03) plus TWO
  full-report JP translations on claude-sonnet-5 (~$0.12 each on actual
  article-length output — the ~131k in the estimate is the max-token budget, not
  the real output). One translation was produced automatically by the `--real`
  pipeline before the measured frame existed (it translated the stale fixture EN,
  then was discarded) and one is the correct translation of the measured report.
  All-in actual ≈ $0.30.
- *Cadence.* Monthly confirmed appropriate.

**Instrument gap fixed in-trial.** The `speech` topic had no snapshot extractor,
so `snapshotPointsFor("speech")` returned `[]`, `latestMeasuredFrame` never
qualified, and the measured-frame composition could not engage (published pages
would have stayed fixture and no history/trend could accrue). Added a
capability-aware `speechSnapshotPoints` (latency + ttsIntelligibility for TTS,
latency + sttWordAccuracy for STT, n-guarded so a row never charts the quality
metric it did not measure), registered `speech`, with unit tests.

**Escalations (for the developer).**
1. Non-OpenAI providers remain error rows pending credentials — supply
   ElevenLabs/Deepgram/AssemblyAI keys and a Google Cloud service-account/OAuth
   credential (not the Gemini `GOOGLE_API_KEY`) to measure them; Amazon needs the
   `20260718203009` adapter. A follow-up real trial then fills the table.
2. Pipeline inefficiency: a `--real` run of a published benchmark topic composes
   and translates the CURRENT page before the measured frame is archived, so the
   first JP translation is spent on the stale fixture EN and discarded. The
   measured JP requires a second translate-report pass. Worth a pipeline fix so
   the first real trial pays for one translation, not two.
3. Minor doc-accuracy: the report generator's §3 line still says "only the OpenAI
   adapters are wired for the real path" — stale now that six REST adapters are
   wired. Left untouched (editing `speech/domain/report.ts` would move fixture
   bytes); worth a small follow-up to update the wording.

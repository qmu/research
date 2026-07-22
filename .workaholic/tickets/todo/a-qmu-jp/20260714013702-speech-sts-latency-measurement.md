---
created_at: 2026-07-14T01:37:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260714013701-speech-first-real-trial.md]
blocked_by: realtime provider API keys must be present in the run environment (spend approved 2026-07-22)
---

# Speech: measure STS round-trip latency (upgrade the capability row to a metric)

## Overview

v1 catalogs speech-to-speech (STS) as a realtime **capability** (which providers
expose a duplex API, cited) but measures no STS number. This ticket adds
round-trip latency measurement so STS becomes a timed metric alongside TTS/STT.

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session, $10/trial ceiling. Remaining gate is environmental: provider API keys
must be present in the run environment; the instrument self-reports missing
credentials and records unreachable rows.

## Implementation Steps

1. Add an STS port to `vendors/speech/types.ts` (e.g. a realtime session that
   sends one short audio turn and awaits the first audio response), with a
   keyless fixture that returns a deterministic round-trip latency so the
   fixture path stays byte-stable.
2. Wire real adapters for the cataloged STS providers (OpenAI GPT Realtime,
   Google Gemini Live, and — if reachable — AWS Nova Sonic, xAI Grok Voice) over
   their WebSocket/WebRTC realtime endpoints.
3. Add an STS section to the manifest (a fixed short prompt turn) and an STS
   metric (`stsRoundTripLatencyMs`, lower is better) to the domain types, run
   aggregation, and report §4/§7.
4. Extend `estimateSpeech` for the STS token-billed cost and keep the ceiling
   check.
5. Update the mission acceptance and `site.ts` `design.metrics` to include the
   STS latency metric; keep same-manifest-version history semantics.

## Policies

- **proposal-first / owner-gated real run** — spend is approved (a@qmu.jp,
  2026-07-22, $10/trial ceiling); STS is token-billed, so price with `--estimate`
  and stop above the ceiling. The remaining gate is environmental realtime
  provider API keys only.
- **No fabrication — provenance load-bearing** — an STS latency is recorded only
  from a real round-trip; missing credentials self-report as unreachable/`error`
  rows, never synthesized. The keyless fixture stays byte-stable.
- **workaholic:mission** — on completion, tick the matching Acceptance item in
  `mission.md`, update `site.ts` `design.metrics`, and append a Changelog line.

## Quality Gate

- `stsRoundTripLatencyMs` (lower is better) exists in the domain types, run
  aggregation, and report §4/§7; the keyless fixture returns a deterministic
  round-trip so the fixture path stays byte-stable.
- STS real adapters are wired for the cataloged duplex providers; those without a
  reachable key fall back and are labelled unreachable/`error`, never synthesized.
- `estimateSpeech` prices the STS token-billed turn and the ceiling check holds;
  any real run stays within the approved $10 ceiling.
- `site.ts` `design.metrics` and the mission Acceptance/Changelog are updated;
  `cd packages/tech && npm test` and lint pass with bare exit codes.

## Considerations

Realtime STS is streaming and stateful — measure a single, well-defined
round-trip (first audio-out after last audio-in), not full-conversation latency,
so the number is comparable across providers. Token-billed; price and confirm
before any real run.

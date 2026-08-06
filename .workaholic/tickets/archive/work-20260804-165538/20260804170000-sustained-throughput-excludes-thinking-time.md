---
created_at: 2026-08-04T17:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort:
commit_hash:
category: Changed
mission: support-newly-released-claude-models-in-the-llm-comparison
depends_on:
---

# Sustained throughput divides out thinking time, so a model that thinks longer measures as faster — the Opus 5 frame reports +785% while total response time regressed

## Overview

The real Claude sweep of 2026-08-04 (frame `2026-08-04T07:56:39.415Z`, commit
`43430b6`) produced a generational-delta table that asserts, at effort `low`:

| Metric | Former (Opus 4.8) | New (Opus 5) | Change | Direction |
| ------ | ----------------- | ------------ | ------ | --------- |
| Sustained throughput | 65.1 tok/s | 576.4 tok/s | **+785%** | **improved** |
| Time to first token | 1180 ms | 13378 ms | +1034% | regressed |
| Total response time | 7058 ms | 16046 ms | +127% | regressed |

Opus 5 took **2.3× longer end to end** and is reported as **8.9× faster**. Both
numbers come from the same three trials. The throughput figure is an artifact,
and it is the one a reader will quote.

## Mechanism (verified)

`packages/tech/src/llm-model-comparison/domain/throughput.ts`:

```ts
const generationMs =
  ttftMs > 0 && ttftMs < totalMs ? totalMs - ttftMs : totalMs;
return (outputTokens * 1000) / generationMs;
```

The metric is tokens per second **after the first token**. That is a defensible
definition of emission speed, but it makes the denominator the post-thinking
window. A model that spends most of its wall clock thinking before it emits gets
divided by the small remainder:

| config | outTok | ttft | total | window | tok/s |
| ------ | ------ | ---- | ----- | ------ | ----- |
| Opus 4.8 `high` t1 | 379 | 1062 ms | 6985 ms | 5923 ms | 64.0 |
| Opus 5 `low` t1 | 1724 | 16779 ms | 19423 ms | 2644 ms | 652.0 |
| Opus 5 `max` t3 | 2048 | 21751 ms | 22699 ms | **948 ms** | **2160.3** |

Opus 4.8 emits promptly (ttft ≈ 1 s) so its window is nearly the whole response.
Opus 5 thinks for 10–20 s and then emits in a burst, so its window is a sliver.
The two models are not being measured on the same quantity.

**A second failure mode compounds it.** When the streaming first-token event is
not captured, `ttftMs` is recorded as `0`, the guard `ttftMs > 0` falls back to
the full `totalMs`, and the same configuration measures ~90 tok/s instead of
~2000. Opus 5 `max` contains both shapes across three trials (89.2, 92.3,
2160.3), which is why its mean is 780.6 with a standard deviation of 1194.9.

## Why the existing gate does not catch it

The generational gate suppresses a direction when the gap does not clear the
combined run-to-run spread. That works where the artifact is *noisy*: Opus 5
`high` and `max` throughput are both correctly labelled `indistinguishable`.

It does not work where the artifact is *systematic*. At effort `low` all three
Opus 5 trials captured ttft normally and landed at 652/500/578 tok/s — tight
dispersion, so the gate admits the direction and publishes **improved +785%**.
Consistency is not correctness here; the metric is consistently measuring the
wrong window.

This is a distinct defect from
`20260801124500-generational-gate-uses-dispersion-not-standard-error.md`. That
ticket is about the gate's *statistic*; this one is about the *quantity being
compared*. Fixing the statistic would not remove this false direction — a tighter
band would admit it more readily.

## Impact

- **A published article would assert a false generational finding.** The
  comparison pages and the Japanese article are recomposed from this frame; the
  `low` row would ship as a measured improvement.
- **It is self-contradicting on the same page**, which is how it was caught:
  throughput improved 785% while total response time regressed 127%.
- **It is not specific to Claude.** Any generation that shifts work from emission
  into pre-emission thinking will measure as a throughput improvement. This will
  recur on every provider that ships a reasoning-heavier model.

## Key Files

- `packages/tech/src/llm-model-comparison/domain/throughput.ts` —
  `sustainedTokensPerSecond`, the `totalMs - ttftMs` window.
- `packages/tech/src/llm-model-comparison/domain/generational-delta.ts` —
  consumes the metric as `throughputTokensPerSec`; the section intro states the
  gate rule.
- `packages/tech/src/llm-model-comparison/run.ts:135` — where the metric is
  computed per trial.
- `docs/research-reports/history/2026-08-04T07-56-39.415Z.data.json.gz` — the
  frame that exposes it; the per-trial numbers above are reproducible from it.

## Policies

- `workaholic:implementation` / `objective-documentation` — a mechanically
  derived verdict is still a claim. "Sustained throughput" that excludes the
  majority of the response's wall clock does not describe what a reader takes it
  to describe, and the label is what makes it wrong rather than merely narrow.
- `workaholic:implementation` / `coding-standards` — the metric is pure domain
  logic and stays unit-testable in isolation; the fixture should include a
  long-ttft config, which no current fixture does.
- `workaholic:planning` / `verify-before-building` — the committed frame is the
  evidence any new definition must be justified against.

## Implementation Steps

1. **Decide the quantity with the owner.** Candidates:
   - **End-to-end tokens/sec** (`outputTokens / totalMs`) — comparable across
     models regardless of thinking behaviour, and consistent with total response
     time. Changes every historical throughput figure.
   - **Keep the post-ttft window but report it beside ttft and total**, and
     forbid it from carrying a generational direction on its own.
   - **Report both**, with only the end-to-end figure gating verdicts.
2. **Fix the `ttftMs == 0` fallback.** Silently substituting `totalMs` turns a
   missing measurement into a plausible-looking number a full order of magnitude
   off. An uncaptured first-token time should mark the trial, not be absorbed.
3. **Re-render the committed frames** under the chosen definition and **state in
   findings** which directions changed, as with ADR 0008.
4. **Record the decision in an ADR**, since it changes what published articles
   assert.

## Quality Gate

- A fixture with a long-ttft, short-emission config asserts that the reported
  throughput does not exceed the end-to-end rate by more than a stated factor —
  the property the current metric lacks entirely.
- A trial with an uncaptured first-token time is distinguishable in the artifact
  from one measured at 0 ms.
- Re-rendering `2026-08-04T07:56:39.415Z` produces a throughput direction for
  Opus 4.8 → Opus 5 `low` that is consistent with its total-response-time
  direction, or no direction at all — never the two contradicting each other.
- Existing fixtures still cover wide-dispersion suppression and the cost-metric
  exemption.
- `npm test`, `npm run build`, `npm run lint` in `packages/tech` each exit 0.

## Considerations

- **The frame is good; the derived metric is not.** Do not re-run the sweep to
  "fix" this — the raw per-trial records already contain everything needed
  (`outputTokens`, `ttftMs`, `totalLatencyMs`), so any new definition is
  computable from the committed frame at no further cost.
- The 2026-08-04 run cost ~$8.84 of the approved $15 ceiling. A re-run is not
  required and would not produce different raw numbers.

## Final Report

Resolved 2026-08-05 on `work-20260804-165538`. Owner chose **end-to-end
tokens/sec**; recorded as `docs/adr/0009-end-to-end-throughput.md`.

### What changed

Throughput is `outputTokens / totalMs`. The function takes **no**
time-to-first-token parameter — accepting one is what let an uncaptured
first-token event change the denominator, so the same configuration read
~90 tok/s on trials where the event was missed and ~2160 where it was caught.
Removing the parameter makes that class of error unrepresentable rather than
guarded against. Renamed "sustained throughput" → "output throughput", because
"sustained" described the retired window.

Step 2 of this ticket (the `ttftMs == 0` fallback) is also done, and turned out
to be its own defect rather than a detail of this one: all six adapters
initialised `ttftMs` to 0 and used 0 as the "not captured" sentinel, so a
non-measurement entered the mean as a real sample. They now emit `null`.

### Steps

1. **Decide the quantity with the owner** — done, end-to-end. ADR 0009 records
   the rejected alternatives, including keeping the retired window with a
   footnote, which was rejected because a metric that cannot support the
   comparison the page invites is not fixed by a caveat.
2. **Fix the `ttftMs == 0` fallback** — done, at the adapter layer, with
   committed frames converted on read.
3. **Re-render the committed frames and state the changes** — done; 7 of 9
   generational throughput directions changed, enumerated in the branch story
   and in ADR 0009's Consequences.
4. **Record the decision in an ADR** — done, 0009.

### Quality gate

| criterion | status |
| --------- | ------ |
| Fixture asserts the reported rate cannot exceed the end-to-end rate | met |
| An uncaptured first-token time is distinguishable in the artifact | met — `null`, not 0 |
| Re-rendering yields a throughput direction consistent with total response time, or none | met — Opus 5 `low` is +78% improved against a regressed total time, coherent because Opus 5 emits ~4.5× more tokens in ~2.3× the time |
| Existing fixtures still cover wide-dispersion suppression and the cost exemption | met — full suite green, 743 passed |
| `npm test` / `build` / `lint` each exit 0 | met, bare exit codes |

### Notes

- **No re-run was required**, as this ticket's Considerations predicted. The raw
  per-trial inputs survive in the frames; where they do not, the retired rate
  rescales exactly because the token count cancels. The $8.84 frame stayed valid.
- **The conversion had to reach every reader, not just one.** Applying it in the
  comparison entrypoint alone left `run-split-topic.ts` publishing retired
  numbers — the EN page read 576 tok/s while the comparison report beside it read
  96. Artifacts now declare their definition and projections carry that
  declaration, because a projection that dropped it would be rescaled a second
  time and silently shrink correct rates.
- **Still open:** uncaptured first-token times are excluded, not recovered.
  Opus 5 `max` reports TTFT at n=1. Recovery needs re-measurement, which no
  committed frame can supply. Tracked in ADR 0009's Open section.

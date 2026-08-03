---
created_at: 2026-07-27T11:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission:
claim: work-20260801-120846
---

# Per-effort generational verdicts claim more precision than 3 trials support — measured run-to-run noise exceeds the deltas being reported

> **Partly landed on `work-20260723-152406` (commit `32d5165`) — scope narrowed.**
> The dispersion gate itself is implemented: a measured metric now earns a
> direction only when the gap between the two means clears the two models'
> combined run-to-run spread (`sd_former + sd_new`), the spread is shown in its
> own table column, changes inside it read as `indistinguishable`, and the net
> verdict says how many were excluded. Cost metrics are exempt (registry facts,
> no spread). Materiality is checked *before* dispersion so a metric that did not
> move stays `unchanged`. Three tests cover it. On the Gemini data this withheld
> five of six throughput directions while keeping every TTFT and total-latency
> direction.
>
> **What remains is the sampling question**, which that change did not touch: the
> gate suppresses unsupportable claims but does not make the measurement better.
> The criteria below are reduced to that remainder — raising the trial count for
> paired generational configs, and deciding whether per-effort verdicts should
> exist at all or be aggregated across effort levels. Re-read this against the
> code before driving it; the sections above describe the original, wider defect
> and are kept as the record of why.

## Overview

The generational-comparison section renders a per-metric delta and a mechanical
net verdict for each **effort level** of each paired model. During the Gemini
refresh round the identical 12-config scoped sweep was run **twice** within a few
hours (the first run had to be repeated for an unrelated merge-base reason), which
accidentally produced a direct measurement of run-to-run noise on the same
configs, same instrument, same day:

| config | run 1 | run 2 | swing |
| --- | --- | --- | --- |
| Gemini 3.6 Flash `[high]` | 599 tok/s | 422 tok/s | −30% |
| Gemini 3.5 Flash `[high]` | 363 tok/s | 683 tok/s | +88% |
| Gemini 3.1 Flash-Lite `[high]` | 743 tok/s | 1290 tok/s | +74% |
| Gemini 3.1 Flash-Lite `[medium]` | 1564 tok/s | 1754 tok/s | +12% |
| Gemini 3.6 Flash `[low]` | 504 tok/s | 509 tok/s | +1% |

The published round then reports, from a single frame, verdicts such as
*"Gemini 3.5 Flash → 3.6 Flash, effort `high`: sustained throughput −38%,
regressed."* A −38% "regression" sits **inside** a noise band that re-running the
same config demonstrated to be ±30–88% at that effort. The number is real; the
*verdict attached to it* is not supported.

This is not an argument against the delta section — it is well-built, states its
threshold rule, and correctly refuses to net a faster-but-pricier result into
"improved". The problem is narrower: **a 1% relative threshold applied to a
metric whose replication error is tens of percent will label noise as a
direction**, and it does so per effort level, where the sample is thinnest.

### What is and isn't affected

- **Cost deltas are sound** — they are curated registry facts, not measurements
  (e.g. Flash-Lite output pricing genuinely rose $1.50 → $2.50).
- **TTFT deltas look sound** — the direction was consistent across both runs and
  across all three effort levels (3.6 Flash was slower to first token than 3.5
  Flash by +21% to +29% every time). A finding that reproduces is reportable.
- **Sustained-throughput verdicts are not** — they flipped sign between runs at
  `high` for three of four models.

## The rule the fix must satisfy

- **Do not emit a direction for a metric whose observed spread cannot distinguish
  it from zero.** The threshold must derive from the measurement's own dispersion
  (the artifact already records per-trial samples and standard deviation), not
  from a fixed 1%.
- **Report the uncertainty next to the delta.** A reader seeing "−38%" must also
  see the spread that produced it; a delta with a wide interval should read as
  *indistinguishable*, not as `regressed`.
- **Reconsider per-effort verdicts specifically.** Aggregating across effort
  levels, or raising trials for the paired generational configs only, would buy
  most of the precision back for a fraction of a full-sweep's cost.
- **State the trial count where the verdict is stated.** The reader currently
  cannot tell that each cell rests on 3 samples.

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — "verifiable
  language" includes not asserting a direction the data cannot distinguish; a
  mechanically-derived verdict is still a claim.
- `workaholic:planning` / `verify-before-building` — the threshold rule was
  designed before any replication data existed; now that replication data exists,
  it should set the threshold.

## Key Files

- The generational-delta renderer under `packages/tech/src/llm-model-comparison/`
  (the `### Generational comparison (former → new)` section and its net-verdict
  rule) — the threshold and the direction labelling.
- The report renderer for §7 Verification Data — where spread should appear
  alongside each delta.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — `--trials`
  handling, if paired generational configs should sample more deeply than the
  rest of the matrix.

## Quality Gate

Decided: keyless verification — this is a rendering and threshold rule over an
existing artifact, so fixtures with known dispersion prove it without spend.

**Acceptance criteria** — the dispersion gate landed in `32d5165`; what follows is
the remaining sampling work:

- [x] A metric whose dispersion cannot separate the two generations is labelled
      indistinguishable rather than improved/regressed. *(landed `32d5165`)*
- [x] Each rendered delta shows the spread behind it, and the net verdict says how
      many metrics were excluded. *(landed `32d5165`)*
- [x] Fixtures cover wide-dispersion suppression, tight-dispersion retention, and
      the cost-metric exemption. *(landed `32d5165`)*
- [x] The trial count is stated where verdicts are stated, so a reader can see the
      sample behind a direction rather than inferring it.
- [x] Paired generational configurations sample deeply enough to support a
      direction — either a higher `--trials` for those configurations only, or a
      documented decision that the current count is sufficient given the gate.
- [x] A decision is recorded on whether per-effort verdicts should exist at all,
      or whether the verdict should aggregate across effort levels for a pair;
      per-effort is where the sample is thinnest, and the gate currently suppresses
      most of those directions rather than the design being reconsidered.
- [x] `npm test`, `npm run build`, `npm run lint` in `packages/tech` each exit 0.

## Final Report

The remaining scope was three items — state the sample, decide on trial depth,
decide on per-effort verdicts. All three are closed, and the trial-depth decision
turned out to rest on something the ticket had not anticipated.

**1. The trials are stated where the verdict is stated.** The delta table gains a
**Trials** column drawn from each metric's own `n` — the count of contributing
successful trials the aggregate already records. It is **per metric, not per
run**, because the structural probes execute once while the speed probe repeats:
a single "3 trials" caption would have been wrong for half the rows. When the two
generations were sampled differently (an `--only-errored` repair can re-measure
one side more often) both counts are shown as `3 / 5`. Cost rows show `—`, since a
trial count on a registry fact would be a fabricated sample. The hardcoded
sentence "Each measurement is three trials" is gone from the intro — the count is
now derived from the artifact and cannot drift from what actually ran.

**2. Do NOT raise `--trials` for paired configurations — because it would not
work.** The gate tests

```
|mean_new − mean_former|  >  sd_former + sd_new
```

`sd` is the sample standard deviation, an estimate of how much individual trials
scatter. **It does not shrink as `n` grows** — only its estimate stabilises. So
spending on 10 or 30 trials per paired configuration would leave the threshold
essentially where it is and would **not** convert today's `indistinguishable`
throughput results into supported directions. The current count of 3 is
therefore "sufficient given the gate", which is precisely the option this
ticket's acceptance criterion allowed — but for a sharper reason than "it's good
enough".

**3. Verdicts stay per effort level.** Aggregating across the ladder was
considered and rejected: `low`, `medium` and `high` are **different operating
points**, not repeated samples of one quantity. Averaging them would report a
figure no configuration was ever measured at, and would bury the actual finding
— that the noise is concentrated at `high` (±30–88%) while `low` reproduced to
±1%. Per-effort is where the sample is thinnest, which is exactly why the
dispersion gate is applied there. Suppressing an unsupportable direction is the
right outcome; collapsing the axis to manufacture a supportable one is not.

Both decisions are recorded in `docs/adr/0008-generational-verdict-sampling.md`
rather than in this ticket alone, so they are findable from the code.

**A minted ticket:** `20260801124500-generational-gate-uses-dispersion-not-standard-error.md`.
Decision 2 exposes that the project currently has **no lever at all** for
resolving the suppressed directions — raising the sample does nothing, and
lowering the threshold would restore the original defect. The mismatch is that
the claim is about the two *means* while the test is about the two
*distributions' spread*; the matching statistic is the standard error of the
difference, `sqrt(sd_a²/n_a + sd_b²/n_b)`, which **does** shrink with `n`. That
was not implemented here because it changes which findings the published article
asserts — a research-reporting decision with an owner, not a refactor.

### Discovered Insights

- **Insight**: The dispersion gate is conservative in a way that is invisible
  from its output — it can never be satisfied by spending more.
  **Context**: A reader (or a future session) seeing five of six throughput
  directions withheld would reasonably conclude "we need more trials". That
  conclusion is wrong under this statistic, and nothing in the rendered section
  said so. The ADR now records it, and the `Trials` column makes the sample
  visible so the reasoning can be checked.
- **Insight**: `MetricStat.n` already existed and was never surfaced.
  **Context**: The aggregate has recorded the contributing trial count per metric
  all along ("so a reader can tell a 3-trial mean from a 1-trial one", per its own
  comment) — but only the mean and stdDev reached the delta table. The data
  needed for the ticket's first criterion required no new capture, only wiring.
- **Insight**: The fixture path does not exercise this section at all.
  **Context**: `make drift` stayed byte-stable across a rendering change that adds
  a table column, because the fixture sweep carries no registry pairing and so
  produces no generational section. Anything changed in `generational-delta.ts`
  must be covered by unit tests; the drift gate will not catch it.

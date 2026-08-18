---
created_at: 2026-08-01T12:45:00+09:00
status: abandoned
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
mission:
depends_on:
claim: work-20260813-040646
---

# The generational gate tests dispersion, not whether the two means differ — so no trial count can ever resolve a direction

## Overview

The generational-delta gate admits a direction only when

```
|mean_new − mean_former|  >  sd_former + sd_new
```

(`generational-delta.ts`, `outcomeOf`). `sd` is the sample standard deviation: an
estimate of how much *individual trials* scatter. It does **not** shrink as the
trial count grows — only its estimate stabilises.

The consequence, found while driving
`20260727110000-generational-verdicts-exceed-what-3-trials-support.md` and
recorded in `docs/adr/0008-generational-verdict-sampling.md`: **increasing
`--trials` cannot convert an `indistinguishable` result into a supported
direction.** The gate's threshold stays put no matter how much is spent. So the
project currently has no lever at all for resolving the throughput directions it
is suppressing — raising the sample does nothing, and lowering the threshold
would restore the original defect.

This is not a bug in the gate. The gate was built to stop labelling noise as a
direction and it does that correctly and conservatively. It is a **mismatch
between the statistic and the question**: the reported claim is about the two
*means* ("this generation is faster"), while the test is about the two
*distributions' spread*.

## The question the section actually asks

"Is the new generation's mean throughput different from the former's?" The
matching statistic compares the difference of means against the **standard error
of that difference**, which does shrink with `n`:

```
se_diff = sqrt( sd_former² / n_former  +  sd_new² / n_new )
```

Under this statistic 3 trials remains weak — but 10 or 20 becomes genuinely
discriminating, which makes a higher `--trials` for paired generational configs
a purchase that buys something, unlike today.

## Why this is filed rather than implemented

It changes **which findings the published article asserts**. A looser (but
correct) threshold will restore directions the current gate withholds, including
some of the Gemini throughput results deliberately suppressed in `32d5165`. That
is a research-reporting decision with an owner, not a refactor — and the ADR
records the current position as deliberate.

## Key Files

- `packages/tech/src/llm-model-comparison/domain/generational-delta.ts` —
  `outcomeOf` (the `Math.abs(absolute) <= spread` test), `measuredDeltasFor`
  (which currently passes `sd_former + sd_new` as `spread`), the `Trials` and
  `Run-to-run spread` columns, and the section intro that states the rule.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — `MetricStat`
  already carries `n` and `stdDev`, so the standard error needs no new capture.
- `docs/adr/0008-generational-verdict-sampling.md` — the decision this ticket
  would revisit.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — `--trials`, if
  paired configurations should sample more deeply once the statistic rewards it.

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — a
  mechanically-derived verdict is still a claim; the statistic behind it must
  match the claim being made. Asserting no direction where one is real is a
  reporting error in the same family as asserting one that is not.
- `workaholic:implementation` / `policies/coding-standards.md` — the threshold
  rule is pure domain logic and stays unit-testable in isolation.
- `workaholic:planning` / `verify-before-building` — the replication data that
  motivated the gate exists; any new threshold must be justified against that
  same recorded data, not against intuition.

## Implementation Steps

1. Add the standard-error-of-the-difference statistic beside the existing
   dispersion figure — keep both, since the spread column is genuinely
   informative to a reader.
2. Decide with the owner which one gates the `indistinguishable` label, and at
   what confidence (e.g. a ~2×`se_diff` band). Record the choice by superseding
   ADR 0008 rather than editing it.
3. Re-render the committed comparison frames under the new rule and **report the
   diff in findings** — how many directions are restored, and which. This is the
   material output; the code change is small.
4. If the new statistic makes deeper sampling worthwhile, add a higher
   `--trials` for paired generational configurations only, with the cost stated.

## Quality Gate

- The gate statistic is a pure function covered by fixtures at several `n`,
  asserting the load-bearing property the current gate lacks: **the same
  measured spread with a larger `n` yields a narrower band.**
- Re-rendering the committed frames under the new rule produces a stated,
  reviewed list of which directions changed label — never a silent re-labelling.
- Fixtures still cover wide-dispersion suppression, tight-dispersion retention,
  and the cost-metric exemption (the `32d5165` coverage must not regress).
- ADR 0008 is superseded by a new ADR rather than rewritten, so the reasoning
  chain stays readable.
- `npm test`, `npm run build`, `npm run lint` in `packages/tech` each exit 0.

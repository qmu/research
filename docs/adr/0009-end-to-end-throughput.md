# 0009 — Throughput is measured end to end, over the whole request

- **Status**: accepted (2026-08-04)
- **Supersedes**: the undocumented definition change of 2026-07-05 (`726b003`),
  which moved throughput from end-to-end to a post-first-token window without an
  ADR. That change is the reason this record exists: it was load-bearing on what
  published articles assert, and it was recorded only as a comment in
  `domain/throughput.ts`.
- **Related**: [0008](0008-generational-verdict-sampling.md) (the verdict gate
  this definition feeds).

## Context

Throughput has had two definitions.

**End-to-end** (until 2026-07-05): `outputTokens / totalMs`.

**Post-first-token** (2026-07-05 – 2026-08-04):
`outputTokens / (totalMs − ttftMs)`. It was adopted on the argument that
end-to-end was round-trip latency in disguise — a model slow to first token with
a small output read as low tok/s even when it emitted quickly. That argument is
correct as far as it goes.

The 2026-08-04 real Claude sweep (frame `2026-08-04T07:56:39.415Z`) showed what
it costs. Dividing by the post-first-token window makes the denominator the time
*after* thinking, so a model that shifts work into pre-emission reasoning
measures as faster the more it thinks. The generational table asserted, at effort
`low`:

| Metric | Opus 4.8 | Opus 5 | Change | Direction |
| --- | --- | --- | --- | --- |
| Throughput | 65.1 tok/s | 576.4 tok/s | **+785%** | improved |
| Total response time | 7058 ms | 16046 ms | +127% | regressed |

Two contradicting directions from the same three trials. One Opus 5 `max` trial
divided 2048 tokens by a 948 ms window and reported **2160 tok/s**.

A second failure compounded it. When the streaming first-token event was not
captured, `ttftMs` was recorded as `0`, the formula's guard fell back to the full
`totalMs`, and the *same* configuration measured ~90 tok/s on those trials and
~2160 on the one where the event was caught — a 24× spread produced by whether an
unrelated measurement succeeded.

The existing verdict gate did not catch this. It suppresses a direction whose gap
does not clear the combined run-to-run spread, which handles *noisy* artifacts:
Opus 5 `high` and `max` were correctly labelled `indistinguishable`. At `low` all
three trials captured `ttft` normally and landed tightly, so the gate admitted a
systematically wrong direction. Consistency is not correctness.

## Decision

**Throughput is `outputTokens / totalMs` — the whole request.** Time to first
token and total response time continue to be reported separately, so the split
between thinking and emitting stays readable; it is simply no longer divided out
of the rate.

The function takes no time-to-first-token parameter. Accepting one is what
allowed a missing measurement to change the denominator, so the parameter is
removed rather than guarded: the failure becomes unrepresentable.

Records declare which definition produced their numbers
(`throughputDefinition`), and archived frames are converted **on read** under
their own declaration. Archives are never rewritten — a frame stays a faithful
record of what its run observed, and the current definition is applied when the
record is interpreted. A future definition change therefore needs no migration.

## Alternatives considered

**Keep the post-first-token window, and forbid it from carrying a generational
direction on its own.** Rejected: the number would still be published beside the
others, and a reader comparing two models on it would still be misled. A metric
that cannot support the comparison the page invites is not fixed by a footnote.

**Report both rates.** Rejected for now as column cost against a benefit already
covered: TTFT and total response time are both already reported, so a reader who
wants the emission-only rate can see the components. Reconsider if emission speed
becomes a question the articles actually ask.

**Re-run the sweep under the new definition.** Unnecessary, and it was the
expensive option. The raw per-trial inputs survive in the frames, and where they
do not, the retired rate rescales exactly: the old rate times
`generationMs / totalMs` is the end-to-end rate, with the token count cancelling.
No frame needed re-measuring and no further spend was incurred.

## Consequences

**Accepted cost.** A model that thinks long and then emits quickly now reads as
slow, and its emission speed is not visible in this number. This is the failure
the 2026-07-05 change was made to avoid. It is accepted because the metric now
moves in the same direction as total response time — what a caller actually waits
for — and is comparable across models regardless of how they split their time.

**Every published throughput figure changed.** Re-rendering the committed frames
moved figures across all providers, in both directions; several previously
`indistinguishable` rows became directional, and several directional rows
reversed. The changes are enumerated in the branch story for
`work-20260804-165538`, and no row was silently relabelled.

**The metric's name changed** from "sustained throughput" to "output throughput",
because "sustained" described the retired window.

**The 88% run-to-run figure quoted in the section intro was observed under the
retired definition** and has not been re-measured. It is now attributed as such
in the prose rather than presented as a current estimate.

## Open

The `ttftMs: 0` ambiguity is not resolved by this decision, only removed from
throughput's path. Time to first token still cannot distinguish "measured at 0
ms" from "not captured", which contaminates its own mean — Opus 5 `high` shows
mean 10459 ms with stdDev 10048 ms across trials of 19922, 0 and 11456 ms. That
is tracked in
`.workaholic/tickets/todo/a-qmu-jp/20260804170000-sustained-throughput-excludes-thinking-time.md`
and needs a capture-layer change plus new measurements; it cannot be recovered
from the committed frames.

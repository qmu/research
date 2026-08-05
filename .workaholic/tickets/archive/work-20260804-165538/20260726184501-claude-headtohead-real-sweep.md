---
created_at: 2026-07-26T18:45:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Changed
depends_on: 20260726184500-claude-comparison-registry-add-opus-5.md
mission: support-newly-released-claude-models-in-the-llm-comparison
---

# Run the owner-approved real Claude head-to-head sweep and publish the refreshed comparison + generational delta

## Overview

With Opus 5 added and Opus 4.8 retained as its paired predecessor, run one real
head-to-head sweep so the article can state the generational delta with measured
numbers instead of a `not-measured` label.

**Spend is pre-approved: $15/run ceiling** (developer, 2026-07-26). The dry-run
estimate for the four current Anthropic models before Opus 5 was added was
**10 configs / ~110 API calls / ~$2.79 / ~17 min**; adding Opus 5 and correcting
the Fable 5 price to $10/$50 puts the expected figure around **$5**. Re-estimate
before spending — an estimate above the ceiling stops for re-approval rather than
being run.

## Implementation

1. **`--estimate` first** to confirm the current price against the ceiling:
   `npm run compare -- --estimate --models anthropic-claude-opus-5,anthropic-claude-opus-4-8,anthropic-claude-fable-5,anthropic-claude-sonnet-5,anthropic-claude-haiku-4-5`
   (adjust the id list to what the registry actually carries after the previous
   ticket). If the estimate exceeds $15, stop and report — do not run.
2. **Run the scoped sweep** (drop `--estimate`). Scoping to the Claude rows keeps
   the run inside the ceiling; the trade-off, which the report must state plainly,
   is that non-Claude rows keep their last real values rather than being
   re-measured in the same frame.
3. **Archive a dated frame** recording the exact Claude ids and prices that
   produced it.
4. **Recompose** the EN speed/accuracy pages and the generational-delta section
   from the measured frame; do not hand-edit the composed output.
5. **`npm run research:translate-report`** for the refreshed JP insights,
   including the delta narrative; regenerate the EN/JP indexes with
   `npm run research:site -- write-indexes`.
6. **Verify** the keyless `--fixture` recomposition is byte-identical, on a clean
   tree after committing (`check-fixture-drift` refuses to run with uncommitted
   `docs/research-reports`).

## Policies

- `workaholic:development` / `policies/overnight-ai.md` — the spend decision and
  the ceiling are pre-answered here so the run does not stop to ask mid-flight.
- `workaholic:implementation` / `policies/objective-documentation.md` — a cell is
  `measured` only when a real call returned; a scoped sweep must say which rows
  were re-measured and which carry forward, rather than letting the reader assume
  one frame measured everything.

## Quality Gate

Decided: real-run verification. The gate is the measured frame plus the
byte-identical keyless recomposition — the same pairing the Gemini round used.

**Acceptance criteria:**

- [ ] `--estimate` run and recorded before any spend; the figure is inside the
      $15 ceiling (or the run stopped for re-approval).
- [ ] Real sweep completed with every Claude config `measured` and zero errored
      rows, or each non-measured row carrying an honest `error` provenance and a
      stated cause.
- [ ] A dated frame is committed recording the exact model ids and prices used.
- [ ] EN comparison pages and the generational-delta section are recomposed from
      the measured frame and state, per metric, how Opus 5 compares to Opus 4.8
      plus a net verdict.
- [ ] The report states plainly which rows this frame re-measured and which
      carry forward from a previous frame.
- [ ] JP insights regenerated via `research:translate-report`; EN/JP indexes
      regenerated from the shared metadata (not hand-edited).
- [ ] Keyless `--fixture` recomposition is byte-identical, verified after commit
      on a clean tree; `npm test`, `npm run build`, `npm run lint` in
      `packages/tech` each exit 0.

## Final Report

Driven 2026-08-04/05 on `work-20260804-165538`.

### The run

`--estimate` first, as the ticket requires: 13 configs / 273 calls / **$8.84** /
~41 min, inside the $15 ceiling, so no re-approval was needed. Then the scoped
sweep: **13/13 Claude configs measured live**, zero errored among them. The 6
errored rows in the record are the pre-existing `bedrock-*` entitlement-lag
entries, carried forward untouched.

The desk had no local artifact — the normal state of a fresh worktree, since
`*.real.data.json` is gitignored — so the instrument reconstructed a 71-config
base from the committed history frames. That is the reproducible path (any clone
or CI run does the same) and it is what makes the carried-forward non-Claude rows
auditable. Its cost is real and worth recording: 0/13 configs warm-started and
the estimate rose from $5.80 to $8.84. **A desk should not import the untracked
local artifact to warm-start.**

Frame `2026-08-04T07:56:39.415Z` is committed.

### What the run exposed, and why publication stopped

The generational table asserted, at effort `low`, that Opus 5 improved
**+785%** on throughput while its total response time **regressed 127%** — two
contradicting directions from the same three trials. One `max` trial divided
2048 tokens by a 948 ms window and reported **2160 tok/s**.

The cause was the metric: `outputTokens / (totalMs − ttftMs)` measures emission
speed *after* thinking, so a model that shifts work into pre-emission reasoning
measures as faster the more it thinks. The verdict gate could not catch it — it
suppresses *noisy* gaps, and at effort `low` all three trials landed tightly.
Consistency is not correctness.

Publication stopped here rather than shipping the false finding. The owner chose
**end-to-end tokens/sec**; recorded as **ADR 0009**, which also documents the
2026-07-05 change that introduced the defect and had no ADR of its own.

A second defect surfaced underneath: every adapter used `ttftMs: 0` as both an
initial value and the "not captured" sentinel, so a non-measurement was averaged
in as a fast one (Opus 5 `high`: 10459 ± 10048 ms over 19922, 0, 11456). Adapters
now emit `null`.

### Converting the history cost nothing

No re-run was needed. Where the raw speed-call token count survives the rate
recomputes exactly; where it does not, the retired rate **rescales** exactly —
old rate × (generation window / total window), with the token count cancelling.
All 12 otherwise-unrecomputable trials converted this way. 47 archived trials had
their `ttftMs: 0` reinterpreted as not-captured.

### Acceptance criteria

| criterion | status |
| --------- | ------ |
| `--estimate` run and recorded before spend, inside the ceiling | met — $8.84 of $15 |
| Real sweep, every Claude config `measured`, zero errored | met — 13/13 |
| Dated frame committed with exact ids and prices | met — `2026-08-04T07:56:39.415Z` |
| EN pages + generational delta recomposed from the frame | met |
| Report states which rows were re-measured vs carried forward | met |
| JP insights regenerated; indexes regenerated from metadata | met |
| Keyless `--fixture` byte-identical after commit on a clean tree | met — `make drift` 0 |

### Direction changes (the material output)

7 of 9 generational throughput directions changed: 3 `indistinguishable →
improved`, 3 `indistinguishable → regressed`, 1 `improved → regressed`. Removing
the TTFT zeros additionally moved TTFT rows from `indistinguishable` to
`regressed`. Every change is enumerated in the branch story. **Three land on the
Gemini mission**, which is awaiting publish and whose article will differ.

Opus 4.8 → Opus 5 `low` stays `improved` but at **+78%**, now coherent with its
regressed total response time: Opus 5 writes ~4.5× more tokens in ~2.3× the time.

### Verification

Bare, unmasked exit codes: `packages/tech` lint 0 / test 0 (743 passed) / build
0; `make gate` 0; `make drift` 0 on a committed tree; `make publish-guard` 0;
VitePress build 0.

### Concerns carried forward

- **A sequencing error cost a translation.** The Japanese pages were translated
  before the TTFT fix, which changed the numbers they contain, so both had to be
  re-translated (~$7.20 wasted). Translate *after* every number-changing change
  has landed, not between them.
- Uncaptured first-token times are not recovered, only excluded. Opus 5 `max`
  now reports TTFT at n=1. Recovering them needs re-measurement.
- The dispersion-vs-standard-error gate defect
  (`20260801124500`) is untouched and still open. This work makes it more
  pressing, not less: the gate is now the only thing standing between a tight
  systematic artifact and a published direction.

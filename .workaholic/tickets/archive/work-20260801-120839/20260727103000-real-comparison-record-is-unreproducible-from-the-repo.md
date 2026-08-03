---
created_at: 2026-07-27T10:30:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission:
claim: work-20260801-120839
---

# The real comparison record is a gitignored machine-local file, so a scoped sweep on a fresh worktree silently replaces the published table instead of merging into it

## Overview

Running a Gemini-scoped `npm run compare` in a fresh mission worktree produced a
real record containing **only the 12 configs it measured**. Projecting that into
the published pages would have taken the speed and accuracy comparison tables
from **47 rows to 12** — deleting every non-Gemini model from the published
article. It was caught by inspection before publishing, not by any check.

The runner's merge logic is correct:

```
// Incremental runs MERGE the fresh configs into the previous record (never
// downgrading a real measurement); a full run replaces it outright.
const configs = previous ? mergeConfigs(previous.configs, fresh) : fresh;
```

The defect is in where `previous` comes from. It is read from
`docs/research-reports/llm-model-comparison.real.data.json`, which is
**gitignored** (`.gitignore` covers `docs/research-reports/*.real.*`). A fresh
worktree therefore has no `previous`, `mergeConfigs` never runs, and the scoped
run's output becomes the whole record — with no warning, because "no previous
record" is indistinguishable from "first full run" at that point in the code.

### The record cannot be rebuilt from the repository

This is the part that makes it more than a provisioning nuisance. `--render-latest`
documents itself as the "generate the report anytime from committed history" path,
reading the newest committed archive under `docs/research-reports/history/`. But
the committed frames are themselves **scoped snapshots**, not full records:

| committed frame | configs |
| --- | --- |
| `2026-07-06T13-08-50.282Z` | (earlier full-ish run) |
| `2026-07-12T05-47-26.268Z` | 47 — the record the published pages still show |
| `2026-07-20T07-00-41.413Z` | **6** |

So the newest committed frame holds 6 configs while the published table needs 47.
`--render-latest` cannot reconstruct the published article, and the only artifact
that can — the 48-config `.real.data.json` — exists solely as an untracked file on
one checkout. If that machine's working copy were lost, **the published table
could not be regenerated without re-running the full ~$21 sweep.**

### Third instance of the same root pattern

A gitignored, machine-local file that the worktree flow does not carry, silently
degrading a run rather than failing it:

1. `packages/tech/.env` → every provider credential missing; nights deferred paid
   work reporting "no credentials present" (fixed upstream in the worktree creator).
2. `llm-model-comparison.real.data.json` → the measurement record; a scoped sweep
   narrows the published table instead of merging (this ticket).

In both cases the code was correct and the *input* was silently absent. The
lesson generalises: **when absence of an input changes results rather than
stopping the run, absence must be reported.**

## The rule the fix must satisfy

- **A scoped run must not be able to silently shrink the record.** When `--models`
  or `--configs` narrows the run and no `previous` record is found, the runner must
  say so loudly and refuse to treat the partial result as the complete record —
  or require an explicit flag to do so.
- **Distinguish "first full run" from "scoped run with no base."** They are the
  same code path today and must not be; only the former may legitimately replace
  the record.
- **Make the record reproducible from the repository.** Either commit a full
  record artifact, or make each archived frame self-contained (a full record
  rather than only the configs that run touched), so `--render-latest` can
  actually deliver what it promises.
- **The projection step must refuse an implausible narrowing.** Rendering the
  published pages from a record with dramatically fewer configs than the pages
  currently carry should fail with the counts, not quietly rewrite the table.

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — a
  published table that silently loses 35 of 47 rows misrepresents the research;
  the provenance model exists precisely so a reader can trust what a cell means.
- `workaholic:operation` — the ability to regenerate a published artifact from
  committed state is an operational property; today it depends on one machine's
  untracked file.
- `workaholic:planning` / `verify-before-building` — the merge was assumed to have
  happened because the code says it merges; the input that gates it was never
  checked.

## Key Files

- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — the
  `previous ? mergeConfigs(...) : fresh` decision and the archive/record write.
- `packages/tech/src/llm-model-comparison/domain/merge.ts` — `mergeConfigs`
  itself is fine; it is simply never reached.
- `packages/tech/src/entrypoints/run-split-topic.ts` — the projection into the
  published speed/accuracy pages; this is where an implausible narrowing should
  be refused.
- `.gitignore` — the `docs/research-reports/*.real.*` rule that makes the record
  machine-local.

## Quality Gate

Decided: script-level verification with hermetic fixtures — the failure is a
control-flow branch on a missing file, which is exactly testable without spend.

**Acceptance criteria:**

- [ ] A scoped run (`--models` subset) with no previous record present fails, or
      warns unmistakably and refuses to write a narrowed record, rather than
      silently replacing it.
- [ ] A scoped run with a previous record present merges into it (regression test
      over the existing `mergeConfigs` behaviour).
- [ ] A first full run with no previous record still replaces the record as today.
- [ ] Projecting into the published pages refuses, with both counts reported, when
      the source record carries dramatically fewer configs than the pages hold.
- [ ] The published table is reproducible from committed state alone — verified by
      regenerating it in a clean checkout with no untracked artifacts present.
- [ ] `npm test`, `npm run build`, `npm run lint` in `packages/tech` each exit 0.

## Final Report

All six acceptance criteria are met. The fix has three parts, and the middle one
turned out to be the important one.

**1. A scoped run can no longer become the census.** `mayWriteWholeRecord` is a
pure predicate over `(selectorPresent, hasBase, allowPartialRecord)`; the runner
refuses when a selector is set and no base was found, naming both locations it
searched and both remedies. "First full run with no record" and "scoped run with
no base" are now different branches — which was the ticket's second rule.

**2. The record is reproducible from the repository — by folding, not by
committing another artifact.** `reconstructRecord` replays every committed frame
oldest→newest through the existing `mergeConfigs`. This reuses the exact policy
an incremental run already applies (carry forward untouched configs, never let
`error`/`fixtured` overwrite `measured`), so replaying the frames rebuilds the
same record the incremental runs built. `loadPreviousCore` now falls back to
this reconstruction when the gitignored local artifact is absent — which is the
*normal* state of a fresh worktree, and the actual root cause.

Measured on the committed frames in a clean worktree with **no** `.real.*` file
present:

| frame | configs |
| --- | --- |
| 2026-07-06 | 59 |
| 2026-07-12 | 47 |
| 2026-07-20 | **6** |
| 2026-07-26 | 12 |
| 2026-07-27 | 54 |
| **newest frame alone** | **54** |
| **reconstructed from all frames** | **71** (65 measured) |

So the reconstruction recovers **17 configurations** the newest frame alone
would drop. `--render-latest` now renders the reconstruction, which is what
makes its own documented promise — "generate the report anytime from committed
history" — actually true; before this it rendered a single scoped snapshot.

**3. The projection refuses an implausible narrowing.** `run-split-topic.ts`
compares the incoming projection against the committed `<group>.data.json` and
refuses on **any** decrease, printing both counts and pointing at
`--render-latest` as the rebuild path. `--allow-narrowing` is the explicit
override for a genuine removal.

**Why the acceptance criteria are verified by pure predicates rather than by
running the CLI.** The live scoped path requires provider credentials, and this
worktree carries a real `packages/tech/.env` — so exercising the refusal branch
end to end would have made paid API calls. The ticket's Quality Gate already
decided "script-level verification with hermetic fixtures", so the three
decisions were extracted as pure functions (`mayWriteWholeRecord`,
`isImplausibleNarrowing`, `reconstructRecord`) and covered by 15 unit tests. The
reproducibility criterion was verified for real, because that path is keyless.

### Discovered Insights

- **Insight**: The newest committed frame is not the fullest one, and nothing in
  the naming suggests that.
  **Context**: A frame is a snapshot of the configs *its run touched*, so frame
  size tracks the scope of a sweep, not the size of the matrix. `latestArchive`
  reads as "the latest full record" and is not — it picked a 6-config frame while
  the published table carried 47. Any code reaching for "the latest frame" as a
  stand-in for "the record" has the same bug.
- **Insight**: Folding the frames was available all along; the merge policy was
  already written.
  **Context**: `mergeConfigs` was built for incremental runs, but replaying the
  archive through it is the same operation over the same data. No new merge
  semantics, no second artifact to keep in sync, and the downgrade guard comes
  along for free — a reconstruction cannot be corrupted by a later error frame.
- **Insight**: The absent input was gitignored *by design*, so its absence is the
  normal state, not an anomaly.
  **Context**: `.gitignore` covers `docs/research-reports/*.real.*` deliberately
  (the artifact is large and machine-generated). That makes "no previous record"
  the default in every fresh worktree, which is why the failure was systematic
  rather than a one-off. The generalised lesson from the ticket holds exactly:
  when absence of an input changes results rather than stopping the run, absence
  must be reported.

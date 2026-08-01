---
created_at: 2026-07-22T14:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain, Config]
effort: 1h
commit_hash:
category: Changed
mission:
depends_on:
claim: work-20260801-120810
---

# Fix history-frame series-nav dead link blocking VitePress build for recovered topics

## Overview

The recovered measured Japanese history frames for **deep-research, speech, and
computer-use** carry the 推移 (Trend) / 過去の調査 (Past surveys) cross-run nav
blocks. The past-surveys entry links
`./history/<topic>/<ts>/<topic>-comparison` — which is **top-level-relative**
(authored for the current page under `docs/research-reports/`). From **inside a
frame directory** that link doubles the `/history/<topic>/<ts>/` segment (and is
self-referential for a single-survey topic), so it is a **dead link**, and
`make build` (VitePress, `ci.yml:24`) fails. This blocks the VitePress build on
each recovered topic's PR (first observed on deep-research PR #60).

This must be fixed **independently on its own branch and merged to `main`
FIRST**, so the three paused recovery ships (deep-research PR #60, plus the
pending speech and computer-use reports/ships) can then catch up on `main` and
complete. **agent-vm's ship is not blocked by this.**

## Mechanism (verified)

- The nav-block links come from `buildRelatedBlock` via `frameArticleLink`
  (`packages/tech/src/research/domain/current-article.ts`), which builds a
  top-level-relative `./history/<topic>/<frame>/<topic>-comparison` href.
- The **current** JP page (`<topic>-comparison.insights.ja.md`) is **composed
  from** the measured JP frame by `composeCurrentPagesFromLatestMeasuredFrame`
  (`packages/tech/src/research/current-article-runner.ts:278-292`) — the frame
  is **load-bearing** for the current page. So **hand-stripping the frame's
  blocks** fixes the VitePress build but breaks the keyless `make drift`
  (`ci.yml:39`): the keyless composition re-emits the (English) nav blocks onto
  the current page, which then drifts from the committed Japanese page.
- Proven both ways: frame **intact** → `make drift` exit 0 / `make build` fails;
  frame **stripped** (current page NOT regenerated) → `make build` exit 0 /
  `make drift` fails. **No frame-CONTENT edit alone satisfies both checks.**
- The **EN frames are already clean** (asymmetric — they carry no nav blocks),
  which is why only the JP frames trip the build.
- **trend-recency and token-metering are SAFE**: their 推移 block is text-only
  and symmetric across EN/JP, with no `./history/` past-surveys link.

## Fix Options

### (A) RECOMMENDED — minimal, config-only

Add a scoped `ignoreDeadLinks` to `docs/.vitepress/config.ts` matching
archived-frame series-nav self-links, e.g.:

```ts
ignoreDeadLinks: [/\/history\/[^/]+\/[^/]+\/[^/]+$/],
```

- Keeps `make drift` green (frames stay intact, so the current-page composition
  is unchanged and byte-stable).
- Covers all three affected topics at once, and touches neither frame content
  nor the renderer.
- **Downside:** real dead links **inside** history frames stop being validated
  repo-wide (the regex suppresses that class of link). Scope the regex as
  tightly as possible so only the frames' series-nav self-links are exempted.

### (B) BIGGER — permanent / symmetric (renderer + pipeline)

Make the archive/compose flow strip the survey-series blocks from JP frames the
same way EN frames are already clean, AND regenerate/re-translate the current JP
page so it stays consistent — then re-verify `make drift`.

- **Prototype already proven** on this branch's history in commit **`a55af1a`**
  (since reverted in `e0baa92` to pause the ship): it added a pure
  `stripSurveyBlocks()` to `current-article.ts`, applied it in
  `archive-runner.ts` to both markdown frame copies (data.json untouched), added
  a unit test, then re-archived + re-composed the deep-research artifacts.
  Result at that commit: `make build` 0 dead links AND `make drift` exit 0, PR
  #60 fully green. Use it as the reference implementation if Option B is chosen.
- **Trade-off surfaced by the prototype:** with clean frames + keyless
  byte-stable drift, the current JP page's nav-block prose renders in **English**
  (the keyless compose path does not translate; the EN side already behaves this
  way). Restoring Japanese nav prose would require wiring a translation step into
  the compose path — a further enhancement.

## Policies

- **Operation (運用) — delivery & runtime.** The fix exists to keep the primary
  delivery gate honest: `make build` (VitePress dead-link) and `make drift` must
  both pass for the recovered topics before they ship. Do not weaken one gate to
  green the other; the acceptance requires both. Prefer the most tightly-scoped
  change (Option A's regex must exempt only the frames' series-nav self-links, so
  the dead-link safety net keeps working everywhere else).
- **Implementation (実装) — coding-standards & directory-structure.** If Option B
  is taken, keep the block-stripping as **pure domain logic** in
  `domain/current-article.ts` (like the reverted `stripSurveyBlocks`) and apply
  it in the `archive-runner` seam; leave the data artifact untouched. Cover it
  with a unit test asserting an archived frame carries no `](./history/` link and
  no TREND/RELATED block.
- **Objective docs (CLAUDE.md).** Any regenerated page/frame must be the
  deterministic keyless output, verifiable by re-running the pipeline; record
  the English-nav-prose trade-off if Option B changes committed pages.

## Key Files

- `docs/.vitepress/config.ts` — Option A (add `ignoreDeadLinks`).
- `packages/tech/src/research/domain/current-article.ts` — Option B
  (`buildRelatedBlock`/`frameArticleLink`; the reverted `stripSurveyBlocks`).
- `packages/tech/src/research/archive-runner.ts` — Option B (strip on archive).
- `packages/tech/src/research/current-article-runner.ts:278-292` — the
  frame→current-page composition that makes the frame load-bearing.
- `.github/workflows/ci.yml:24,39` — the `make build` and `make drift` gates.

## Quality Gate

Verification method: run each gate from the topic's worktree and read **bare,
unmasked exit codes** (per CLAUDE.md, never through the masking `make test`
loop). The `make build` dead-link check is the one the earlier recovery missed
(it ran only `npm run build` = tsc), so it is mandatory here.

- For **deep-research, speech, and computer-use**, BOTH gates exit 0:
  - `make build` (VitePress) reports **0 dead links**.
  - `bash scripts/check-fixture-drift.sh` (i.e. `make drift`) is **byte-stable**
    on a clean tree.
- `cd packages/tech && npm test` exits 0 (bare, unmasked).
- The fix lands on its **own branch merged to `main` first**; then the three
  paused recovery ships catch up on `main` and complete. agent-vm is unaffected.
- If Option A: the `ignoreDeadLinks` regex is scoped to the frames' series-nav
  self-links only (do not blanket-disable dead-link checking).

## Final Report

Neither Fix Option was implemented as written — both were stale by the time the
ticket was driven. The residual work was the regression net the ticket's own
Policies section already demanded, and it immediately found a real violation.

**Option B's code fix is already on `main`.** `stripSurveyBlocks` was added in
`a55af1a`, reverted in `e0baa92` (to pause the ship, as the ticket records), and
then **reapplied in `2a22bfc`**, which is an ancestor of `origin/main`. It is
wired into `archive-runner.ts:118,130` for both markdown frame copies and unit
tested in `current-article.test.ts`. No committed frame on `main` carries a
`](./history/` link, and `make build` reports 0 dead links on a clean `main`.

**Option A was deliberately NOT taken.** Adding
`ignoreDeadLinks: [/\/history\/[^/]+\/[^/]+\/[^/]+$/]` to the VitePress config
would exempt the entire class of in-frame links — precisely the class in which
these failures appear — so it would suppress the detection of the next stale
frame rather than catch it. With the renderer already fixed, the config change
buys nothing and costs the dead-link net.

**What was implemented** is the Policies requirement: a guard test
(`packages/tech/src/research/history-frames.test.ts`) asserting that every
committed `.md` under `docs/research-reports/history/` carries no
`](./history/` link and neither survey-series block. `TREND_LABEL` /
`RELATED_LABEL` were exported from `domain/current-article.ts` so the guard
asserts against the renderer's own constants and cannot go vacuous if a label is
renamed. A third assertion fails if the walk finds no frames at all, so the
guard cannot pass by checking nothing.

**The guard found a real stale frame on `main`:**
`docs/research-reports/history/token-metering/2026-07-17T03-02-34-699Z/token-metering-comparison.md`
carried the 推移 block. It was archived before the strip fix landed. The ticket
had classified token-metering as SAFE, which was correct about the *build* (the
block is the first-survey text-only variant, so it carries no link and broke
nothing) but not about the *archive contract*: a frame archived today carries
neither block. It was brought into conformance by running the repo's own
`stripSurveyBlocks` over it, not by hand-editing.

### Discovered Insights

- **Insight**: The archive-time strip governs only frames written after it
  landed; it silently leaves every earlier frame non-conformant.
  **Context**: `stripSurveyBlocks` is applied in the `archive-runner` seam, so it
  is a *write-path* guarantee with no *read-path* counterpart. Between the fix
  landing and this guard, the repo's committed state and its stated contract had
  diverged with nothing to report it — the token-metering frame sat
  non-conformant across several drives. Any write-path normalization in this
  repo wants a committed-state assertion beside it.

- **Insight**: The three recovery branches (deep-research, speech, computer-use)
  still carry pre-fix frames, and this guard is what will catch them.
  **Context**: Their frames were archived before `2a22bfc`, so they carry the
  blocks *with* links. When those branches catch up on `main`, the guard fails in
  `npm test` naming the exact file — earlier and far more legibly than a VitePress
  dead-link error. Re-archiving the frame (or running `stripSurveyBlocks` over
  it, as done here) is the fix on each branch.

- **Insight**: `check-fixture-drift.sh` refuses to run against a dirty
  `docs/research-reports`, so it can only be verified after the commit.
  **Context**: `scripts/check-fixture-drift.sh:15` hard-exits on
  `git diff --quiet -- docs/research-reports`. Any ticket touching that tree
  cannot verify drift pre-commit; the honest order is archive, then drift. It
  regenerates only the *current* pages and never writes under `history/`, so an
  archived-frame edit cannot itself cause drift.

---
created_at: 2026-08-18T22:51:00+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy: review
verification_handoff:
claim: work-20260818-205634
---

# Make the keyless translation path refuse instead of overwriting a page with a stub

## Overview

`npm run research:translate-report -- <topic>` silently substitutes a placeholder
client when `ANTHROPIC_API_KEY` is absent, and then writes its output over the
topic's published Japanese page. The documented command therefore destroys a real
page whenever it is run without a key — including by a routine, by CI, or by a
developer who simply has no `.env`.

Measured on 2026-08-18 while driving
`20260816155216-regenerate-the-japanese-catalog-page-through-the-live-translation-path.md`,
which is blocked for exactly this reason:

```
$ npm run research:translate-report -- foundation-models --estimate
.env not found. Continuing without it.
research foundation-models: full-report translation estimate — 5 call,
  ~4190 prompt + ~81920 output tokens (model claude-sonnet-5)
```

`report-translation-runner.ts:43` forks on the key and returns
`createFixtureTranslationClient()` when it is missing; that client
(`vendors/llm/fixture.ts:63`) returns the single line
`_Fixtured 翻訳スタブ — 決定的プレースホルダ。_` per call.

**The guard that looks like it would catch this is defeated by design.** The stub
echoes every number it finds in the prompt (`FIXTURE_NUMBER_RE`, commented "so the
domain's numeric-preservation check passes on the keyless path"), so
`verifyNumbersPreserved` reports no miss and the run completes cleanly. Nothing
between the missing key and the overwritten page says anything is wrong — the
existing `.env not found. Continuing without it.` line is printed by the node
flag, not by a check, and reads as routine.

The provoking ticket names this as out of its own scope: "Consider … whether the
same run should also make the keyless path refuse rather than silently stub. That
is a separate change and belongs in its own ticket if pursued."

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — the fork lives in
  a runner; the refusal belongs where the client is selected, not scattered
- `workaholic:operation` / `policies/observability.md` — the defect is that a
  degraded run renders as a successful one; the fix is a path that reports the
  difference
- `CLAUDE.md` / **Layered `src/`** — the fixture client stays a vendor concern;
  what changes is which caller may select it

## Key Files

- `packages/tech/src/research/report-translation-runner.ts:43` —
  `translationClient()`, the silent fork on `ANTHROPIC_API_KEY`
- `packages/tech/src/vendors/llm/fixture.ts:63` —
  `createFixtureTranslationClient`, the stub and its number-echoing behaviour
- `packages/tech/src/entrypoints/translate-research-report.ts` — the entrypoint
  that owns the `--estimate` flag and would own an explicit opt-in flag
- `packages/tech/src/research/domain/translate.ts` — `verifyNumbersPreserved`, the
  check the echo defeats

## Implementation Steps

1. Decide the opt-in's spelling. The keyless path must stay reachable for tests
   and for CI, so the change is "refuse **unless asked**", not "remove". A single
   explicit flag on the entrypoint (`--fixture`, matching `npm run
   compare:fixture`'s existing vocabulary) is the candidate; do not invent a
   second env var.
2. Make `translationClient()` refuse when the key is absent and the flag was not
   passed: exit non-zero, name `ANTHROPIC_API_KEY` and the page that would have
   been overwritten, and write nothing.
3. Check every caller of the runner before changing the default — a test or an
   npm script that relies on the current silent fallback must be moved onto the
   explicit flag in the same change, or it breaks.
4. Leave `--estimate` keyless, as it is today: pricing a call needs no key and is
   the documented first step of a live regeneration.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- Running `npm run research:translate-report -- <topic>` with no
  `ANTHROPIC_API_KEY` and no explicit fixture flag exits non-zero and leaves the
  topic's `*.insights.ja.md` byte-identical.
- The refusal names `ANTHROPIC_API_KEY` and the path it declined to write.
- The keyless path is still reachable behind the explicit flag, and every existing
  test that used it still passes.
- `npm run research:translate-report -- <topic> --estimate` still works with no
  key.

**Verification method** — the commands/tests/probes that prove them:

- A test that runs the runner keyless over a fixture page and asserts both the
  non-zero exit and the unchanged file bytes.
- `cd packages/tech && npm test`, `make build`, `make lint` from the repository
  root — bare exit codes, no `| tail` and no `|| true`.
- `git status` after the keyless run shows no modification under
  `docs/research-reports/`.

**Gate** — what must pass before approval:

- CI green on the branch (type-check, tests, lint, dependency audit).

## Considerations

- **The fix must not make the fixture path unreachable.** CI runs keyless by
  design; a refusal with no opt-in would turn this defect into a broken build.
- **The number-echoing stub is not itself the bug and should stay.** It exists so
  the numeric check passes deterministically; what is wrong is that its output is
  allowed to reach a published page.
- **One page has already been damaged this way and was repaired by hand.**
  `foundation-models.insights.ja.md` currently carries
  `provenance: hand-authored-translation` for this reason, which is what
  `20260816155216` exists to undo — so this ticket protects the page that ticket
  will regenerate.

---
created_at: 2026-08-16T15:52:16+00:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy:
verification_handoff: ANTHROPIC_API_KEY for the live translation call — the keyless fixture client returns a one-line stub and would overwrite the page
claim: work-20260818-212426
---

# Regenerate the Japanese catalog page through the live translation path

## Overview

`docs/research-reports/foundation-models.insights.ja.md` currently carries a
**hand-authored** Japanese rendering of the catalog page, not an LLM translation:
its frontmatter says so (`translation_model: none (hand-authored)`,
`provenance: hand-authored-translation`).

It was written that way while implementing
`20260815052030-give-the-foundation-model-catalog-page-its-own-non-verification-outline`,
which moved the catalog topic onto its own four-section outline (概要 / 収録範囲 /
カタログ / 出典). That change necessarily invalidated the committed Japanese page,
which was still on the seven verification headings, and the normal regeneration
route was unavailable in that run: `npm run research:translate-report --
foundation-models` needs `ANTHROPIC_API_KEY`, and without it
`report-translation-runner.ts` falls back to `createFixtureTranslationClient`,
whose `generateAnswer` returns the single line
`_Fixtured 翻訳スタブ — 決定的プレースホルダ。_` — i.e. running the documented
command keylessly would have destroyed the page rather than regenerated it.

The hand-authored page is faithful (every figure is copied from the regenerated
English page, and the surviving prose is the previous translation's own wording),
but it is outside the pipeline: it is not reproducible from the English source by
running a command, which is the property every other published Japanese page has.
This ticket restores that property.

The English side needs nothing — it regenerates keylessly and byte-stably today.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `CLAUDE.md` / **Objective docs** — the regenerated page stays factual and verifiable
- `CLAUDE.md` / **Proposal-first research** — the version-creation operation is untouched

## Key Files

- `docs/research-reports/foundation-models.insights.ja.md` — the page to regenerate.
  Its frontmatter is the marker: `provenance: hand-authored-translation` must
  become `llm-translation` again, written by the runner rather than by hand.
- `packages/tech/src/research/report-translation-runner.ts:43` — `translationClient()`,
  the `ANTHROPIC_API_KEY` fork that silently selects the stub client.
- `packages/tech/src/vendors/llm/fixture.ts:63` — `createFixtureTranslationClient`,
  the stub whose output would replace the page.
- `packages/tech/src/research/domain/translate.ts` — `buildTranslationPrompt`
  already selects the catalog heading pairs per topic, so a live run emits the
  catalog headings without further change.
- `packages/tech/src/research/domain/article-outline.test.ts` — the repo-wide
  sweep that pins both languages to the topic's outline; it must stay green.

## Implementation Steps

1. Confirm a live key is present (`ANTHROPIC_API_KEY`), and price the call first:
   `cd packages/tech && npm run research:translate-report -- foundation-models --estimate`.
2. Run it for real: `npm run research:translate-report -- foundation-models`.
   Check the runner's own numeric-fidelity warning is silent — it reports any
   figure from the English page missing in the translation.
3. Diff the regenerated page against the hand-authored one. Prices, model ids,
   counts, and the eight source URLs must be identical; only wording may move.
   Investigate any figure that changed rather than accepting it.
4. Re-run `npm test` in `packages/tech` so the outline sweep confirms the
   regenerated page still carries 概要 / 収録範囲 / カタログ / 出典.
5. Leave `research:archive` and everything under `docs/research-reports/history/`
   untouched.

Consider, while a key is available, whether the same run should also make the
keyless path refuse rather than silently stub: a `translate-report` invocation
with no key currently overwrites a real page with a placeholder, which is how the
page could have been lost. That is a separate change and belongs in its own
ticket if pursued.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `docs/research-reports/foundation-models.insights.ja.md` carries
  `provenance: llm-translation` and a real `translation_model`, written by the
  runner.
- The page still carries exactly the four catalog headings and no
  `1. 調査の目的` … `7. 検証データ` heading.
- Every figure on the page matches the English page: 30 models, 8 providers, and
  each per-model price row.
- No change under `docs/research-reports/history/`.

**Verification method** — the commands/tests/probes that prove them:

- `cd packages/tech && npm test` — including the outline conformance sweep.
- `make build && make lint` from the repository root, bare exit codes, no
  `| tail` and no `|| true`.
- `rg '^## ' docs/research-reports/foundation-models.insights.ja.md` shows the
  four catalog sections.
- `git status` shows no incidental change under `docs/research-reports/history/`.

**Gate** — what must pass before approval:

- CI green on `main` (type-check, tests, lint, dependency audit).

## Considerations

- The translation is LLM-generated and non-deterministic, so the regenerated page
  will not be byte-identical to the hand-authored one. Only the figures are
  required to match; wording differences are expected and fine.
- `verifyNumbersPreserved` retries the call once before giving up, so a single
  numeric miss is self-healing; a reported miss after the retry is real and
  should be investigated rather than hand-patched.

## Attempt log

### 2026-08-18, unattended `[Implement]` run — step 1 fails, steps 2–5 not started

Step 1 has two halves. The pricing half ran; the key half did not.

```
$ npm run research:translate-report -- foundation-models --estimate
.env not found. Continuing without it.
research foundation-models: full-report translation estimate — 5 call,
  ~4190 prompt + ~81920 output tokens (model claude-sonnet-5)
```

So the call is priced: **5 calls, ~4190 prompt + ~81920 output tokens, model
`claude-sonnet-5`**. That number is recorded here so the next attempt does not
have to install and re-run to get it.

What was checked for the key, and found:

| Probe | Result |
| --- | --- |
| `ANTHROPIC_API_KEY` in the run's environment | unset |
| `.env` anywhere in the checkout | absent — only `packages/tech/.env.example`, which lists the variable empty |
| `.worktree-env` at the repository root | absent, so no env file is carried into a claim worktree |
| the runner's own report | `.env not found. Continuing without it.` |

Step 2 was **not** run: with the key absent, `translationClient()`
(`report-translation-runner.ts:43`) returns `createFixtureTranslationClient()`,
and running the documented command would have replaced the page with the stub's
one line. That is the destruction this ticket exists to reverse, not to repeat.

Worth knowing for the next attempt: the numeric-fidelity warning in step 2 cannot
be used as a keyless safety net. The fixture stub echoes every number it finds in
the prompt — `FIXTURE_NUMBER_RE` in `vendors/llm/fixture.ts`, commented "so the
domain's numeric-preservation check passes on the keyless path" — so
`verifyNumbersPreserved` stays silent over a destroyed page. That mechanism is now
its own ticket,
`20260818225100-make-the-keyless-translation-path-refuse-instead-of-stubbing.md`.

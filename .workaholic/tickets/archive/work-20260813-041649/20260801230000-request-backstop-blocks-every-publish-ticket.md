---
created_at: 2026-08-01T23:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category:
mission:
depends_on:
claim: work-20260813-041649
---

# `/request` can never deliver this repository's publish ticket — its backstop substring-matches a repo name that is also a directory name on both sides

## Overview

`/ship`'s documented final step is to generate a publish ticket into the sibling
corporate repository, and `/request` is the only sanctioned route across a
repository boundary. On 2026-08-01, after shipping PRs #68–#76, that step failed
and could not be completed by any legitimate means.

`submit-request.sh:50-53` refuses a body containing this repository's own name:

```sh
source_name="$(basename -- "$SOURCE_ROOT")"      # "research"
if grep -qiF -- "$source_name" "$body_file"; then ... refuse
```

The match is a **case-insensitive plain substring**, and this repository's
basename is `research` — an ordinary English word that appears inside the path
names on *both* sides of the publish plan:

- every source path: `docs/research-reports/...`
- every destination path: `docs/llm-foundation-research/...` — this is the
  **corporate repository's own directory name**, not ours.

A publish ticket is a list of ~70 such paths. It cannot be expressed without the
substring, so the refusal is unconditional: no publish ticket can ever be
submitted through `/request` while the source repo is named `research`.

## Current behavior

`submit-request.sh` exits with
`{"ok": false, "error": "body still names this repository ('research') — mask it and re-confirm"}`
for a body that names this repository nowhere — only directories that happen to
contain the word. The instruction it gives ("mask it") is unfollowable, because
the destination paths belong to the target repo and masking them would destroy
the ticket's only content.

The developer had already confirmed destination and verbatim body at the
`/request` gate; the failure is entirely in the mechanical backstop underneath it.

## Expected behavior

The backstop should refuse a body that **names this repository as a repository**,
and not a body that contains the word as part of an unrelated path segment.

## Steps

1. Tighten the match in `submit-request.sh:50-53` so it recognizes repository
   references rather than substrings. Candidates, in preference order:
   - match the remote URL / `owner/name` form (`qmu/research`, the clone URL),
     which is unambiguous;
   - match the bare name only at a path or word boundary where it is not
     preceded by `-`/`/` and not followed by `-`/`/` (so `research-reports` and
     `llm-foundation-research` do not match, while a bare `research` does);
   - keep the absolute-path check at `:54-56` unchanged — it is already exact and
     has no false-positive mode.
2. Add fixtures for the two shapes that must pass — a body containing
   `docs/research-reports/x.md` and one containing
   `docs/llm-foundation-research/x.md` — and the shapes that must still refuse:
   a bare repo name and a `qmu/research` reference.
3. Re-run `/ship`'s publish step end to end and confirm the ticket lands in the
   corporate repo's todo directory.

## Considerations

- **Do not work around this by writing the file with a shell redirect.** The
  skill notes that `hooks/guard-repo-confinement.sh` does not see redirects; an
  agent using that knowledge to route around a refusal is exactly the failure the
  guard exists to prevent. The backstop is wrong, and the fix is to correct it,
  not to bypass it.
- The `/request` confirmation gate itself worked correctly and should not be
  weakened by this change. Only the mechanical last-resort check is defective.
- The publish payload is regenerable at any time with
  `npm run research:site -- qmu-ticket` in `packages/tech`, so nothing was lost —
  the ticket simply could not be delivered.
- Renaming this repository would also resolve the collision, but that is a far
  larger change and the backstop would still be wrong for the next repo whose
  name is a common word.

## Policies

- `workaholic:implementation` / **fail-fast, machine-checkable gaps** — a
  backstop that cannot distinguish a repository reference from a path segment
  fails closed on legitimate work. Its matching rule must be expressible and
  tested, not incidental.
- `workaholic:operation` / **ci-cd** — a delivery step that structurally cannot
  succeed is worse than an absent one: it reports a masking failure the developer
  cannot act on, and the real cause is invisible from the message.
- `workaholic:design` / **security design** — the confinement rule is correct and
  must survive this fix. Narrowing a false positive must not widen the true
  positive: naming this repository, or its path, still has to be refused.

## Quality Gate

**Acceptance criteria**

1. A body containing `docs/research-reports/...` and
   `docs/llm-foundation-research/...` paths submits successfully.
2. A body containing a bare reference to this repository by name, or its absolute
   path, or its `owner/name` remote form, is still refused.
3. The `/ship` publish step completes end to end: the ticket lands in the
   corporate repo's `todo/<user>/` and nothing is committed there.

**Verification method**

Fixture-driven test over `submit-request.sh` covering the four bodies in criteria
1 and 2, asserting the script's raw exit status and JSON `ok` field. Then one real
`/ship` publish run.

**Gate that must pass**

The new fixture test, plus `make gate`, `packages/tech` lint and tests, and the
VitePress docs build — all with bare, unmasked exit codes.

## Final Report

Verified resolved upstream, twice over. No change was needed in this repository,
and none was made.

**The surface is gone.** `/request` — the command whose `submit-request.sh`
backstop this ticket reports — was **retired on 2026-08-05**. It wrote a ticket
file into the target repository's tree, and the rule it existed to satisfy now
forbids that outright: `rules/general.md` reads "Never modify another repository
… To raise work against a different repository, use `/fb <the ask> to
<owner/name>` — it opens the ask as a GitHub **issue** on the target, writing
into no checkout of it at all. That is the only sanctioned way", and it names the
retirement in the same line. No `submit-request.sh` exists anywhere in the
installed plugin (v1.0.176), and `/request` is not among its commands.

**And the backstop defect itself was fixed, not merely dropped.** The successor
route carries the same protection, and
`skills/feedback/reference/crossing.md` records the exact repair this ticket
asked for (lines 127-144): the check "matches a reference, not a substring and
not a word, and that is a usability requirement", noting that under the plain
substring match "a repository whose basename is an ordinary English word could
not" get an ask through — which is this ticket's `research` case stated
generically. A bare name now refuses only where it reads as a reference: inside
backticks, or in an URL form. Absolute paths are refused exactly as before, and
the verbatim human confirmation is unchanged. The record cites
`qmu/workaholic#384`, where the same publish plan was refused on two lines that
named no repository at all.

So the publish ticket this repository could not deliver on 2026-08-01 is
deliverable now, by a different and better route: `/ship` generates the publish
ticket into the sibling `qmu-co-jp` worktree directly (this repository's own
`CLAUDE.md` documents that flow), and anything genuinely needing to cross a
repository boundary goes as a `/fb` issue.

### Discovered Insights

- **Insight**: A guard that matches a plain substring of a repository name is
  unsound whenever that name is an ordinary word, and the failure is
  *asymmetric*: it never lets a bad ask through, it only blocks good ones, so it
  produces no incident and quietly makes a whole route unusable.
  **Context**: `research` appears in path fragments, prose, and directory names
  on both sides of the boundary. The fix is to match the shape of a reference —
  backticked, or an URL form — not the presence of characters.
- **Insight**: This ticket was closed by two independent upstream changes: the
  command was retired *and* the check was corrected on its successor. Verifying
  only the first would have left the wrong conclusion recorded — that the
  protection was dropped rather than fixed.
  **Context**: When a ticket's surface disappears, check whether its *substance*
  moved before recording it as moot.

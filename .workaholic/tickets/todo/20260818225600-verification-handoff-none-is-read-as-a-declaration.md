---
created_at: 2026-08-18T22:56:00+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy: review
verification_handoff:
claim: work-20260818-223958
---

# A `verification_handoff:` value of "none" routes the unit to handoff anyway

## Overview

`verification_handoff:` is optional ticket frontmatter whose **non-emptiness** is
the signal. `verification-handoff.sh` tests exactly that:

```sh
if [ -n "$_c_value" ] && [ -z "$REASON" ]; then
    HANDOFF="true"
```

Its own header states the intended semantics — "the value NAMES what cannot run …
Absent or empty means the ordinary route" — so a value that names *nothing*
inverts the author's declaration. Measured on 2026-08-18 against a ticket in this
repository's own backlog:

```
$ verification-handoff.sh tickets .../20260818220100-migrate-both-npm-packages-to-typescript-7.md
{"handoff": true, ...,
 "reason": "none — the work is keyless and offline apart from `npm install`", ...}
```

The ticket's author wrote "none — the work is keyless and offline apart from `npm
install`", i.e. *there is no handoff*. The router read it as one.

The consequence is not cosmetic: `workaholic:drive` §6 reads this axis **before**
the merge-policy table and a declared handoff outranks `auto`, so this ticket's
pull request will open and stay open, never merge, and finish 🟡 with the token
forced to `pending` — for a unit whose author declared it fully verifiable here.
It has not bitten yet only because the ticket is blocked upstream for an unrelated
reason.

## Policies

- `workaholic:operation` / `policies/observability.md` — a router whose verdict
  contradicts the declaration it read reports a state that is not the case
- `workaholic:implementation` / `policies/coding-standards.md` — the fix is one
  predicate in one script, not a second field

## Key Files

- `plugins/workaholic/skills/drive/scripts/verification-handoff.sh` — the
  `[ -n "$_c_value" ]` test in `consider()`, and the header stating the semantics
- `plugins/workaholic/skills/drive/SKILL.md` §6 and
  `plugins/workaholic/skills/drive/reference/routing.md`, *The declared handoff* —
  the prose the script implements
- `.workaholic/tickets/todo/20260818220100-migrate-both-npm-packages-to-typescript-7.md`
  — the local ticket carrying the value, and the reproduction

These paths are in `qmu/workaholic`, not in this repository; the local convention
is to file the defect here and route the fix through `/fb`, as
`20260813035140-handoff-pr-opened-on-a-branch-carrying-no-work.md` does.

## Implementation Steps

1. Decide which half is wrong. Two defensible answers, and they are not
   equivalent: either the **script** should treat a value that declares nothing as
   empty, or the **field** should never carry such a value and the ticket writers
   (`workaholic:create-ticket`, `workaholic:propose`) should refuse to emit one.
2. Note that a free-text field cannot be pattern-matched safely — "none", "なし",
   "n/a", "not applicable" is an open set, and a router that guesses at prose is
   the thing `verification-handoff.sh`'s own header rejects ("a routing decision
   made by reading prose is a guess"). That argues for the writer-side fix, or for
   a single exact, documented sentinel (`none`) rather than a matcher.
3. Fix the local ticket's frontmatter as part of the same change: a driving run
   may not edit the field itself, so a person or the ticket's author has to clear
   it.
4. Route the agreed change to `qmu/workaholic` via `/fb`.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- A ticket whose `verification_handoff:` declares no missing verification routes
  as an ordinary unit — `handoff: false`.
- A ticket whose `verification_handoff:` names a real missing verification is
  unchanged: `handoff: true` with the reason verbatim.
- Whatever rule is chosen is stated in the script's header and in
  `reference/routing.md`, so the next author knows what the field accepts.

**Verification method** — the commands/tests/probes that prove them:

- `verification-handoff.sh tickets <fixture>` over three fixtures — a declaring
  ticket, a nothing-declaring ticket, and one with the field absent — asserting
  the three verdicts.
- The reproduction above re-run against
  `20260818220100-migrate-both-npm-packages-to-typescript-7.md`, expecting
  `handoff: false` once its frontmatter is corrected.

**Gate** — what must pass before approval:

- The three fixture assertions green, and the `/fb` issue opened against
  `qmu/workaholic` carrying the reproduction.

## Considerations

- **The failure is silent and in the safe direction, which is why it can sit
  unnoticed.** A wrongly-declared handoff never merges anything it should not; it
  only refuses to merge something it should, and forces `pending`. That makes it
  low-severity and easy to leave — and also easy to mistake for the router working.
- **Do not fix it by teaching the run to override the script.** `workaholic:drive`
  §6 makes this a script decision precisely because it gates merges to `main`; a
  run that reasons its way past the verdict is the failure mode the design avoids.
- The same reasoning applies to `merge_policy`, which is an enum and therefore
  cannot express this bug — evidence that the free-text choice is what carries the
  cost here, and it was a deliberate choice with its own good reason.

## Attempt log

### 2026-08-18, unattended `[Implement]` run — steps 1 and 2 answered, step 4 blocked

Steps 1 and 2 are decidable here and are decided below. Steps 3 and 4 are not:
step 3 is explicitly a person's act, and step 4's target repository is outside
this container's GitHub scope. The payload for step 4 is written out verbatim so
filing it is one copy-paste.

**The reproduction is no longer theoretical.** It was measured on a real unit
during this same run, driving
`20260818220100-migrate-both-npm-packages-to-typescript-7.md`:

```
$ verification-handoff.sh tickets .../20260818220100-migrate-both-npm-packages-to-typescript-7.md
{"handoff": true, ..., "reason": "none — the work is keyless and offline apart from `npm install`", ...}
```

The verdict was honored rather than reasoned past, so that unit's pull request
(#134) is open, unmergeable, with its claim standing and a `## Handoff` section
whose *Not done* line reads "none — the work is keyless and offline apart from
`npm install`". The predicted consequence is now an artifact a reviewer can look
at.

### Step 1 — which half is wrong: the writer, with a narrow validator

Neither of the ticket's two candidates survives on its own, and the third
(a documented sentinel) does not survive contact with the actual value:

| Candidate | Why it fails |
| --- | --- |
| Router treats a nothing-declaring value as empty | Requires matching prose at route time — the exact thing the script's own header rejects ("a routing decision made by reading prose is a guess"), on the axis that gates merges to `main`. |
| A single exact sentinel (`none`) | The real value is `none — the work is keyless and offline apart from \`npm install\``. An exact-match sentinel does not fire on it, so the bug that provoked the ticket would still be live. |
| Writers refuse to emit one | Correct direction, but on its own it cannot see a value a human types, and it leaves every already-written ticket wrong. |

**The decision: keep the router's predicate exactly as it is, and reject the
value at write time.** `hooks/validate-ticket.sh` already machine-checks
frontmatter and already enforces an enum on `merge_policy`; it gains one narrow
rule — a `verification_handoff:` value whose **first token** is a negation from a
small, closed, documented list is refused, with a message telling the author to
leave the field empty instead.

Why this placement and not the router's:

- **A false positive costs a rejected ticket, not a wrong merge.** At route time
  the same matching would decide whether machinery merges to `main`; at write
  time the worst case is an author being told to clear a field, with a human
  right there to judge it.
- **The router's contract is unchanged**, so nothing in `workaholic:drive` §6 or
  `reference/routing.md` has to relax its "non-emptiness is the signal" rule —
  the rule simply becomes true, because nothing can write a value that means
  emptiness any more.
- **The open set stays closed.** The ticket is right that `"none" / "なし" /
  "n/a" / "not applicable"` is open-ended; a deny-list that is wrong only ever
  fails to catch a new phrasing, which is the pre-existing behaviour, never a
  new failure.

### Step 2 — the closed list, and what it matches

Only the **first token** of the trimmed value, case-insensitively, against:
`none`, `no`, `n/a`, `na`, `nil`, `なし`, `不要`, plus the two-word forms `not
applicable` and `not needed`. Anything else — including a value that merely
*contains* one of these words later ("the device none of the runners has") — is
a declaration and passes. First-token-only is what keeps the rule from reading
prose: it inspects a label, not a sentence.

### Steps 3 and 4 — both blocked, for different reasons

**Step 3 (clear the local ticket's field) is a person's act and was not done.**
`workaholic:drive` §6 and `reference/routing.md` both state the field is never
edited by a run; clearing it would grant this run's own sibling unit permission
to merge, which is precisely the direction the rule guards. It is asked for in
PR #134's `## Handoff` and in that unit's Slack finish line.

**Step 4 (file it on `qmu/workaholic`) cannot be reached from here.** This
container's GitHub access is scoped to `qmu/research` alone; there is no
`qmu/workaholic` checkout on the machine either
(`20260813035140-handoff-pr-opened-on-a-branch-carrying-no-work.md` measured the
same boundary three times before this run). The block is per-container
configuration, identical on every tick, so no retry by this routine reaches it.

### The payload to file — verbatim

> **Title:** `verification_handoff:` accepts a value that declares no handoff, and routes the unit to handoff anyway
>
> **Body:**
>
> `skills/drive/scripts/verification-handoff.sh`'s `consider()` tests
> `[ -n "$_c_value" ]`, so a `verification_handoff:` value that NAMES NOTHING
> inverts its author's declaration. Measured in `qmu/research` on
> `20260818220100-migrate-both-npm-packages-to-typescript-7.md`, whose author
> wrote `verification_handoff: none — the work is keyless and offline apart from
> \`npm install\``:
>
> ```
> $ verification-handoff.sh tickets .../20260818220100-…md
> {"handoff": true, ..., "reason": "none — the work is keyless and offline apart from `npm install`", ...}
> ```
>
> `workaholic:drive` §6 reads this axis before the merge-policy table and a
> declared handoff outranks `auto`, so the unit's pull request opens and stays
> open, its claim stays standing, and the token is forced to `pending` — for a
> unit its author declared fully verifiable. Live consequence:
> `qmu/research#134`.
>
> **Requested fix — at the writer, not the router.** Leave
> `verification-handoff.sh` untouched: matching prose at route time is what its
> own header rejects, and it is the axis that gates merges to `main`. Instead
> `hooks/validate-ticket.sh` should refuse a `verification_handoff:` value whose
> first token (trimmed, case-insensitive) is one of `none`, `no`, `n/a`, `na`,
> `nil`, `なし`, `不要`, `not applicable`, `not needed`, with a message telling
> the author to leave the field empty. First-token-only is deliberate: it
> inspects a label, not a sentence, so a genuine declaration that happens to
> contain the word "none" still passes. State the accepted-values rule in the
> script header and in `skills/drive/reference/routing.md`, *The declared
> handoff*.
>
> **Acceptance:** three fixtures through `verification-handoff.sh tickets` — a
> declaring ticket (`handoff: true`, reason verbatim), a field-absent ticket
> (`handoff: false`), and a nothing-declaring ticket, which must now be
> impossible to write: `validate-ticket.sh` rejects it and names the rule.

### 2026-08-18 21:40 UTC, unattended `[Implement]` run — second attempt; step 3 gains a second, independent block

Steps 1 and 2 stand exactly as decided above and were not re-derived. This entry
records only what this tick measured.

**The router is unchanged at plugin tree 1.0.187** (`plugin-src.sh` → `registry`,
`src_immutable: true`), so the defect is live at the newest tree on the machine:

| Probe at 1.0.187 | Result |
| --- | --- |
| `grep -nE '_c_value\|HANDOFF=' skills/drive/scripts/verification-handoff.sh` | `93: if [ -n "$_c_value" ] && [ -z "$REASON" ]` → `94: HANDOFF="true"` — the predicate verbatim as filed |
| `grep -n 'verification_handoff' hooks/validate-ticket.sh` | no match — the writer-side rule this ticket asks for does not exist |

The second row is the one worth recording: the decision in *Step 1* places the fix
in `validate-ticket.sh`, and that file carries no `verification_handoff` rule of
any kind at 1.0.187, so the requested change is still an addition rather than an
amendment.

**Step 3 now has two independent blocks, not one.** The first is the one already
recorded — the field is a declaration a run may not write for itself. The second
was measured this tick and is simpler: the ticket carrying the bad value,
`20260818220100-migrate-both-npm-packages-to-typescript-7.md`, is **under another
runner's active claim**:

```
$ list-claims.sh
{"unit": "batch-20260818211724", "branch": "work-20260818-211724",
 "artifacts": [".../20260818220100-migrate-both-npm-packages-to-typescript-7.md"],
 "last_commit_at": "2026-08-18T21:19:10+00:00", "stale": false, "resumable": false,
 "resume_reason": "claim_active"}
```

Editing an artifact another live claim holds is a collision the claim protocol
exists to prevent, so step 3 is not merely reserved for a person — it is
unavailable to *any* concurrent run while that claim stands. The value is
confirmed still in place:

```
$ sed -n '8p' .../20260818220100-…md
verification_handoff: none — the work is keyless and offline apart from `npm install`
```

**Step 4 is blocked on the same structural boundary as before** and was not
re-probed: this container's GitHub access is scoped to `qmu/research`, so the `/fb`
issue cannot be filed from here and no retry by this routine reaches it. *The
payload to file* above is unchanged and remains a single copy-paste.

### 2026-08-18 22:40 UTC, unattended `[Implement]` run — third attempt; nothing moved

Steps 1 and 2 stand as decided and were not re-derived. This entry records only
what this tick measured.

**The defect is live at plugin tree 1.0.188** (`plugin-src.sh` → `registry`,
`src_immutable: true`, the only tree on the machine):

| Probe at 1.0.188 | Result |
| --- | --- |
| `grep -nE '_c_value\|HANDOFF=' skills/drive/scripts/verification-handoff.sh` | `93: if [ -n "$_c_value" ] && [ -z "$REASON" ]` → `94: HANDOFF="true"` — the predicate verbatim as filed (md5 `de0fa555163bb61a4ecd9c4ee5cfced9`) |
| `grep -n 'verification_handoff' hooks/validate-ticket.sh` | exit 1, no match — the writer-side rule *Step 1* asks for still does not exist (md5 `15d3a4ecc3dfd8cd3ce3c5ac952288a8`) |

**Step 3's two blocks both still hold.** The field is a declaration a run may not
write for itself, and the ticket carrying the bad value is still under a
standing claim — `list-claims.sh` reports `batch-20260818211724` /
`work-20260818-211724` holding
`20260818220100-migrate-both-npm-packages-to-typescript-7.md`, `stale: false`,
`resume_reason: parked_with_pr`. Parked is not released: the claim stands while
its pull request waits, so editing the artifact is still the collision the claim
protocol exists to prevent. The value is confirmed in place at line 8:

```
verification_handoff: none — the work is keyless and offline apart from `npm install`
```

**Step 4 is blocked on the same structural boundary** and was not re-probed:
this container's GitHub access is scoped to `qmu/research`, so the `/fb` issue
cannot be filed from here and no retry by this routine reaches it. *The payload
to file* above is unchanged and remains a single copy-paste.

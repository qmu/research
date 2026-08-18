---
created_at: 2026-08-18T22:56:00+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy: review
verification_handoff:
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

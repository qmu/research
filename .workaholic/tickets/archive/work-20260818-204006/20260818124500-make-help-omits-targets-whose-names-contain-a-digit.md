---
created_at: 2026-08-18T12:45:00+00:00
status: done
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff:
claim: work-20260818-204006
---

# Make help omits targets whose names contain a digit

## Overview

`make help` does not list `a11y`, even though the target carries the `## `
comment the help recipe reads. The recipe filters with

```
grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST)
```

and `[a-zA-Z_-]+` matches no digit, so `a11y` never reaches the `awk`. Every
other target happens to be letters-only, which is why this has gone unnoticed:
the one documented target a developer cannot discover from `make help` is the
accessibility check CI runs on every commit.

Observed on 2026-08-18 while confirming that a newly added `deploy-docs` target
appears in the help output (ticket
`20260818122247-build-the-docs-site-into-a-deployable-cloudflare-worker-artifact.md`).
`deploy-docs` itself lists correctly; `a11y` is absent above it.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` / `policies/ci-cd.md` — inspections are discoverable repository commands, not runner-only knowledge

## Key Files

- `Makefile` — the `help` recipe's `grep -E` pattern, and the `.PHONY` list that
  is the authoritative set of targets.

## Implementation Steps

1. Widen the character class to include digits (`^[a-zA-Z0-9_-]+:`) so any
   documented target is listed.
2. Confirm `make help` now lists every target that carries a `## ` comment —
   compare the help output against the `## `-annotated targets in the file rather
   than eyeballing it, so the next digit-bearing target cannot silently drop out.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `make help` lists `a11y`.
- Every target in the `Makefile` carrying a `## ` comment appears in
  `make help`, and no target without one does.

**Verification method** — the commands/tests/probes that prove them:

- `make help | grep a11y`.
- Compare `make help` against
  `grep -E '^[a-zA-Z0-9_-]+:.*## ' Makefile` — the two lists must name the same
  targets.

**Gate** — what must pass before approval:

- CI green (`make gate`, `install`, `build`, `test`, `lint`, `a11y`,
  `publish-guard`, `drift`).

## Considerations

- The fix is one character class, but the second acceptance criterion is the
  point: an ad-hoc check of `a11y` alone leaves the same defect waiting for the
  next target named with a digit.

## Final Report

Development completed as planned.

The `help` recipe's filter is now `^[a-zA-Z0-9_-]+:.*?## .*$$`. The only visible
change is that `a11y` appears in `make help`; nothing else about the recipe, the
`awk` formatter or the column width moved.

Verified by set comparison rather than by eye, as step 2 asks — three sets built
from the file and from the command and diffed pairwise:

```
$ make help | awk '{print $2}' | sort                       # what help lists
$ grep -oE '^[a-zA-Z0-9_.-]+:.*## ' Makefile | sed 's/:.*//' | sort   # what is annotated
$ tr ' ' '\n' <<< "<the .PHONY list>" | sort                # what is declared
```

All three are identical (14 targets: `a11y build deploy-docs docs drift format
gate help install install-docs lint publish publish-guard test`), which proves
both acceptance criteria at once — every `## `-annotated target is listed, and no
unannotated target is. `make help | grep a11y` returns the row. `make gate` is
green, so widening the class did not disturb the per-package targets it proves.

### Discovered Insights

- **Insight**: the `.PHONY` list, the set of `## `-annotated targets and the
  `make help` output are three independently maintained lists that happen to
  agree today; nothing in the repository asserts that they must.
  **Context**: this defect was exactly one of those three drifting from the other
  two, and it went unnoticed for the life of the `a11y` target. A durable guard
  would be a `check-make-gate.sh`-style assertion that diffs the three sets, not a
  wider regex — the regex fixes today's drift and leaves the class of drift open.
  Not added here: `scripts/check-make-gate.sh` exists to prove one specific
  property (per-package failure propagation), and folding an unrelated assertion
  into it, or minting a second gate script, is a scope decision this ticket does
  not carry. Recorded as a deferred decision instead.
- **Insight**: `make -C <dir> help` prepends `make: Entering directory …` /
  `Leaving directory …` lines that survive an `awk '{print $2}'` extraction as
  the tokens `Entering` and `Leaving`.
  **Context**: any scripted comparison of the help output must run from inside
  the directory (a `( cd … && make help )` subshell) or pass
  `--no-print-directory`; otherwise the comparison reports two phantom targets and
  looks like a failure of the fix.

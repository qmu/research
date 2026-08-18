---
created_at: 2026-08-18T12:45:00+00:00
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

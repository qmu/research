---
created_at: 2026-08-13T05:44:27+09:00
author: a@qmu.jp
mission:
depends_on:
---

# Cloud routines fire on schedule but load no plugin — commit the Claude Code Web bootstrap

## Overview

`/setup-routines` (2026-08-13) created this repository's two Claude Code Web
routines directly via `RemoteTrigger` — `[Propose] research` (`15 * * * *`,
`trig_01HTJL96tLBwQUTjgEEn8DXx`) and `[Implement] research` (`30 * * * *`,
`trig_01MbG5A1Ta4HoL1oi1w1F5q5`). The same run's `check-bootstrap.sh` reported
the repository unbootstrapped on all four counts: `hook_missing`,
`not_registered`, `enabled_plugin`, `marketplace`.

A Claude Code Web routine runs in a fresh, ephemeral container where
`enabledPlugins` alone installs nothing. Without the committed
`SessionStart` bootstrap, every scheduled fire stops at its own
"the workaholic plugin must be loaded" precondition — firing on time, doing
nothing, and reading as healthy. A configured routine and a working routine
are different states; this commit is what separates them.

## Changes

- `.claude/hooks/session-start.sh` — byte-for-byte copy of the plugin's
  canonical `skills/workaholify/bootstrap/session-start.sh` (1.0.166),
  executable.
- `.claude/settings.json` — new file: `SessionStart` entry (matcher
  `startup`, timeout 120) running the hook, `enabledPlugins`
  `workaholic@workaholic`, `extraKnownMarketplaces` pointing at
  `qmu/workaholic`.

## Deliberately excluded

`.claude/git-identities` is NOT added, on the developer's explicit
instruction (2026-08-13): the login-to-email mapping should be resolvable
on demand rather than committed as a file. The plugin treats an absent
mapping as status quo, not an error. Known cost, accepted: a cloud session
keeps the container's default git identity, so the developer's own
`[Implement]` routine cannot claim personally-assigned tickets until an
on-demand resolution lands in the workaholic plugin.

## Policies

- `workaholic:development` — `policies/policy-as-plugin.md`: the bootstrap is
  the plugin's canonical template installed by reference, not a hand-written
  copy; the repository commits only the thin installation.
- `workaholic:development` — `policies/overnight-ai.md` /
  `policies/parallel-long-running-agents.md`: unattended scheduled runs must
  actually be able to work; a routine that fires and loads nothing violates
  the point of running agents unattended.

## Quality Gate

- Acceptance: `bash <plugin>/skills/workaholify/scripts/check-bootstrap.sh
  <worktree>` returns `ok: true` — `matches_canonical: true`, matcher
  `startup`, timeout `120`, `enabled_plugin: true`, `marketplace: true`,
  empty `problems`.
- Verification method: run the check against the worktree before commit;
  it is a pure read and needs no keys.
- Gate that must pass: repository CI (`make gate` first in `ci.yml`) stays
  green — this change touches only `.claude/`, no package code, so the
  existing targets must pass unchanged.
- No `.claude/git-identities` file appears in the diff (developer
  instruction, see *Deliberately excluded*).

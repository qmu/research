---
created_at: 2026-08-18T22:01:00+09:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy:
verification_handoff: none — the work is keyless and offline apart from `npm install`
claim: work-20260818-211724
---

# Migrate both npm packages to TypeScript 7

## Overview

Dependabot proposed `typescript` 5.9.3 → 7.0.2 for `packages/industry` (PR #96,
closed 2026-08-18). It cannot land as an isolated bump, and it cannot land in one
package alone.

`make install` fails on the bump with `npm error code ERESOLVE`: every
`@typescript-eslint/*` package in the tree — and `typescript-eslint@8.66.0`
itself — declares `peerDependencies: { "typescript": ">=4.8.4 <6.1.0" }`.
TypeScript 7 is outside that range, so the install resolves to nothing and every
later CI step is unreachable. The failure is in the linter stack's declared
support, not in this repository's code.

Both packages pin `typescript: ^5.9.3` (`packages/tech` with
`typescript-eslint: ^8.64.0`, `packages/industry` with `^8.66.0`), so this is one
repository-wide migration, not two independent bumps: the two packages share the
coding-standards lint configuration and are built by the same `make` targets.

TypeScript 7 is the native (Go) compiler port, so the migration is also a
behaviour change in the toolchain, not only a version number: type-check output,
`tsc` flags, and editor/CLI performance all change with it.

## Policies

- `docs/adr/` — no workspaces: each package is an independent npm project with
  its own lockfile, so the bump is applied per package and both lockfiles move.
- CLAUDE.md, "One runner" — the migration is verified through `make`, not through
  ad-hoc `npx tsc` invocations.

## Key files

- `packages/tech/package.json`, `packages/tech/package-lock.json`
- `packages/industry/package.json`, `packages/industry/package-lock.json`
- `packages/tech/tsconfig.json`, `packages/industry/tsconfig.json`
- `.github/dependabot.yml` — majors are deliberately ungrouped, so the next
  proposal arrives as its own PR again.

## Implementation steps

1. Confirm the blocker is gone: the installed `typescript-eslint` release
   declares a `typescript` peer range that admits 7.x. Until it does, this ticket
   is not startable — record the checked version and stop.
2. Bump `typescript` (and `typescript-eslint` to whatever release carries the
   support) in **both** packages, regenerating each lockfile independently.
3. Fix what `tsc` 7 newly rejects. Expect the strictness deltas to surface in
   `packages/tech/src`, which is essentially all of this repository's code.
4. Re-check `tsconfig.json` in both packages against the 7.x compiler options —
   flags removed or renamed in the port must be migrated, not silently dropped.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/tech` and `packages/industry` both resolve `typescript` to a 7.x
  version in their lockfiles.
- `make install`, `make build`, `make test` and `make lint` all exit 0 from the
  repository root.
- `make drift` exits 0 — the keyless fixture path stays byte-stable across the
  compiler change.
- No `--legacy-peer-deps`, no `overrides` block, and no `.npmrc` peer-dependency
  escape hatch is introduced to force the install.

**Verification method** — the commands/tests/probes that prove them:

- `make install && make build && make test && make lint && make drift` from the
  repository root, bare exit codes, no `| tail` and no `|| true`.
- `node -e 'console.log(require("./packages/tech/package-lock.json").packages["node_modules/typescript"].version)'`
  and the same for `packages/industry`.
- `npm ls typescript` inside each package reports no unmet peer dependency.

**Gate** — what must pass before approval:

- CI green on the branch (`make gate`, install, build, test, lint, a11y,
  publish-guard, drift, audit).

## Considerations

- `packages/industry` has zero test files and runs with `--passWithNoTests`, so
  its green `make test` is weak evidence on its own. Its type-check (`make
  build`) and lint are the real signals there.
- The two lockfiles are regenerated separately by design; do not try to share a
  resolution between the packages.
- If the linter stack supports 7.x only in a new major of its own, that major is
  part of this migration and belongs in the same PR — splitting it produces an
  intermediate commit that cannot install.

## Step 1 checks

Step 1 says the ticket is not startable until the linter stack's declared
`typescript` peer range admits 7.x, and to record the checked version. Each row is
`npm view <pkg>@<tag> version peerDependencies.typescript`.

### 2026-08-18, unattended `[Implement]` run — not startable

| Package | Channel | Version | Declared `typescript` peer range |
| --- | --- | --- | --- |
| `typescript-eslint` | `latest` | 8.67.0 | `>=4.8.4 <6.1.0` |
| `typescript-eslint` | `canary` | 8.67.1-alpha.7 | `>=4.8.4 <6.1.0` |
| `@typescript-eslint/eslint-plugin` | `latest` | 8.67.0 | `>=4.8.4 <6.1.0` |
| `@typescript-eslint/parser` | `latest` | 8.67.0 | `>=4.8.4 <6.1.0` |

`typescript@latest` is 7.0.2, outside every range above. `npm view
typescript-eslint dist-tags` lists only `latest`, `canary` and the historical
`rc-v8` (8.0.0-alpha.62) — there is no `next` or `rc` channel carrying 7.x support,
so the blocker is not merely unreleased on the stable channel, it is unpublished
anywhere.

Repository pins at the time of the check are unchanged from the Overview:
`packages/tech` `typescript ^5.9.3` / `typescript-eslint ^8.64.0`,
`packages/industry` `typescript ^5.9.3` / `typescript-eslint ^8.66.0`.

Stopped here, as step 1 instructs; nothing was bumped and no lockfile was touched.

**Cheapest way to re-check** — one command, no install:

```
npm view typescript-eslint@latest peerDependencies.typescript
```

Startable as soon as that prints a range whose upper bound admits 7.x.

### 2026-08-18 21:17 UTC, unattended `[Implement]` run — still not startable

The cheapest re-check the previous attempt left, re-run verbatim, plus the two
sibling packages and both non-stable channels:

```
$ npm view typescript-eslint@latest version peerDependencies.typescript
version = '8.67.0'
peerDependencies.typescript = '>=4.8.4 <6.1.0'

$ npm view typescript-eslint@canary version peerDependencies.typescript
version = '8.67.1-alpha.17'
peerDependencies.typescript = '>=4.8.4 <6.1.0'

$ npm view @typescript-eslint/eslint-plugin@latest version peerDependencies.typescript
version = '8.67.0'
peerDependencies.typescript = '>=4.8.4 <6.1.0'

$ npm view @typescript-eslint/parser@latest peerDependencies.typescript
>=4.8.4 <6.1.0

$ npm view typescript@latest version
7.0.2

$ npm view typescript-eslint dist-tags
{ 'rc-v8': '8.0.0-alpha.62', latest: '8.67.0', canary: '8.67.1-alpha.17' }
```

Unchanged from the 2026-08-18 check earlier today except that `canary` advanced
`8.67.1-alpha.7` → `8.67.1-alpha.17`, still declaring the same peer range. The
upper bound is still `<6.1.0` and `typescript@latest` is still `7.0.2`, so the
install would still resolve to `ERESOLVE`. Stopped at step 1 as instructed:
nothing was bumped, no lockfile was touched, and no repository pin moved.

**Two things worth recording for the next re-check, so it stays one command.**

The blocker is upstream and time-based, not something this repository can act on;
ten alpha releases in one day on a peer range that has not moved is evidence the
support is not imminent. And the routing note below is now measured rather than
predicted.

**This ticket's own `verification_handoff:` value routes its unit to `handoff`.**
Measured on this run, which is the reproduction
`20260818225600-verification-handoff-none-is-read-as-a-declaration.md` asked for:

```
$ verification-handoff.sh tickets .../20260818220100-migrate-both-npm-packages-to-typescript-7.md
{"handoff": true, ..., "reason": "none — the work is keyless and offline apart from `npm install`", ...}
```

The run honored the verdict rather than reasoning past it (`workaholic:drive` §6
makes this a script decision precisely because it gates merges to `main`), so this
unit's pull request opens and stays open, its claim stays standing, and its finish
line is 🟡 — for a ticket whose author declared there is **no** handoff. Clearing
the field is a person's act, not a driving run's; until it is cleared, every
re-check of this ticket costs one PR that cannot merge.

---
created_at: 2026-07-17T13:06:39+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
mission:
---

# `make test` / `build` / `lint` return 0 when a non-final package fails — CI called a red `main` green

## Overview

Every per-package target in the `Makefile` discards the failure of every package
except the last one. `make test` exits **0** while `packages/tech` is genuinely
broken, and **CI invokes these same targets** (`.github/workflows/ci.yml`), so
the repository's primary gate reports success on trees that do not pass their
own tests. This has already happened on `main`.

### Mechanism (verified)

```make
PACKAGES := packages/tech packages/industry

test: ## Type-check and run unit tests in every package
	@for p in $(PACKAGES); do echo "==> test $$p"; (cd $$p && npm test); done
```

The whole `for` loop is **one** recipe line, so make evaluates exactly one exit
status for it: the shell's. A POSIX `for` loop's exit status is the status of
the **last command it ran** — i.e. the last iteration. Every earlier iteration's
status is discarded. Nothing in the loop body (`(cd $$p && npm test)`) propagates
a failure outward, and there is no `set -e`, no `|| exit`, no status accumulator.

Because `PACKAGES` lists `packages/tech` **first** and `packages/industry`
**last**, `packages/tech` — the package holding essentially all of this repo's
code — sits permanently in the masked position. `packages/industry` is only
safe by accident of ordering. **Adding a third package silently widens the hole**
to two masked packages.

Confirmed against the real tree (a deliberate `tsc` error injected into
`packages/tech`, raw exit codes, reverted afterwards):

| command | raw exit |
| --- | --- |
| `cd packages/tech && npm test` (ground truth) | **2** |
| `make test` (same broken tree) | **0** |
| `make lint` (same broken tree) | **0** |
| build's package loop, exact recipe line (same broken tree) | **0** |
| control: same error moved to the **last** package | **2** (caught) |

The `tsc` error is printed to the log in plain sight — `make` just does not act
on it. A reader skimming a green run sees nothing wrong.

### Affected targets

| target | shape | status |
| --- | --- | --- |
| `test` | loop only | **masked** (non-final packages) |
| `lint` | loop only | **masked** |
| `build` | loop + separate `docs` line | **masked** for packages; the `docs` line is its own recipe line and is checked |
| `install` | loop + separate `docs` line | **masked** (a failed dependency install in `packages/tech` is swallowed) |
| `format` | loop only | masked, but not a gate — cosmetic |
| `drift` | single `bash scripts/check-fixture-drift.sh` | **safe** — one command, and the script itself is `set -euo pipefail` |
| `a11y`, `docs`, `publish` | single command | **safe** |

Note: ci.yml's "Audit dependencies" step ends in `|| true` **deliberately**
(advisory audit, not a gate) and is out of scope — do not "fix" it here.

### Blast radius on CI — what is proven

`ci.yml` runs `make install/build/test/lint/a11y/drift`. A second workflow,
`build-research-tech.yml`, runs `npm test` and `npm run lint` **directly** with
`working-directory: packages/tech`, so it does **not** go through the loop and
does **not** mask. That gives a per-commit A/B test of the defect, and the two
workflows disagree on the same SHA three times in today's history:

| head SHA | where | `ci` (`make test`) | `build-research-tech` (`npm test`) |
| --- | --- | --- | --- |
| `0b09ddc` | **`main`**, merge of PR #50 | ✅ success (Test step explicitly `success`) | ❌ **failure** — `AssertionError: expected undefined to be true` |
| `7b53196` | PR #52 (**open now**) | ✅ success | ❌ **failure** — `SyntaxError: Invalid regular expression … /gu: Invalid group` at `src/token-metering/domain/pretokenize.ts:41`, via `src/token-metering/domain/bpe.test.ts:37` |
| `ada7084` | PR #49 branch | ✅ success | ❌ **failure** |

**Proven, not suspected:** `main` at `0b09ddc` was genuinely red and `ci`
reported green. Checking that commit out and running `cd packages/tech && npm
test` reproduces the failure locally (**raw exit 1**), independent of CI. That
commit is the `#47`×`#50` semantic merge conflict later described in `714b255`
("main was red") — `agent-vm`'s `fixtureRewritesCurrentPage` came out
`undefined`. `main` carried it for ~19 minutes (01:25 → 01:44 JST) until PR #49's
merge incidentally repaired it. Across that window `ci` was green on every
commit. This directly answers "were past green CI runs actually green?" —
**at least one was not.**

**Proven to be the reason it was not worse:** `build-research-tech.yml` caught
all three. So the repo has not been flying blind on `packages/tech` — but only
because a second workflow happens to duplicate the check, and only when the PR
touches `packages/tech/**` (its `paths:` filter). That backstop is the sole
reason this defect has not yet shipped a broken `main` unnoticed.

**Proven gap in that backstop:** PR #46 changed **0** files under
`packages/tech`, so `build-research-tech` never ran on its merge commit
(`40e6bee`) — `ci`'s masking `make test` was the **only** gate on `packages/tech`
for that commit. The structural hole is real: any change that breaks
`packages/tech` without touching `packages/tech/**` (a root/tooling/docs change,
a semantic merge conflict like `0b09ddc`'s) is masked with no net.

**Suspicion only — do not overclaim:**

- `40e6bee` itself was checked out and tested: `packages/tech` passes (raw exit
  0). It was genuinely green. No masked failure found there.
- No masked-and-unnoticed failure is proven for #47, #48, #51, #53 — the two
  workflows agree on those.
- `make build`'s masking of `npm run build` (tsc **emit**) is not covered by
  `build-research-tech` (which never runs `npm run build`), but `npm test` runs
  `tsc --noEmit` over the same sources, so the overlap is high. An emit-only
  failure is possible in principle; **no instance was found**.
- `make install`'s masking is structurally identical; **no instance was found**.
- The review window was the last 30 runs. Older history was not audited and
  nothing here should be read as a claim about it.

## Policies

- **HQ rule — 検証は exit code をマスクしない.** The `for`-loop shape is exactly
  the prohibited pattern: a verification step whose real status is discarded
  before anyone can act on it. This is the canonical instance, in the
  repository's own canonical runner.
- **workaholic:operation** / `policies/ci-cd.md` — the policy names this failure
  outright: the state to prevent is "**treating a green indicator — absent any
  evidence of what the inspection actually verified — as proof the code is
  healthy**". It also requires build, type checking, tests, and lint be
  consolidated into a single inspection command that "arrives at the same result
  whether a human or an AI executes them". Today the single inspection command
  returns 0 on a tree that fails its own tests, which is worse than having no
  command: it manufactures the green indicator the policy warns about.
- **workaholic:implementation** / `policies/command-scripts.md` — "CI invokes the
  same commands as a developer, not a separate set of commands maintained in CI
  YAML", and the intolerable state "a script file that exists but is never run in
  CI, creating a divergence between documented and actual procedure". The repo's
  own `CLAUDE.md` codifies this as **"One runner. All common operations run
  through `make`; CI invokes the same targets."** The Makefile *is* the contract
  — which is precisely why a lying Makefile is a severity-1 defect and not a
  cosmetic one: every developer and agent is instructed to trust it.
- **workaholic:implementation** / `policies/test.md` — regression tests exist so
  gaps are machine-checkable early. A gate that cannot fail checks nothing; the
  fix must itself be covered by a test (see Quality Gate).
- **`CLAUDE.md`** — "CI must be green before merge to `main`". At `0b09ddc` that
  invariant was reported satisfied and was not.

## Implementation Steps

1. **Make every per-package loop fail-fast or status-accumulating.** Pick one
   shape and apply it uniformly to `install`, `build`, `test`, `lint`, `format`:

   - **Preferred — per-package prerequisites.** Give each package its own target
     so make itself evaluates one status per package and stops on the first
     failure, which also restores `make -k` / `-j` semantics:

     ```make
     test: $(PACKAGES:%=test-%) test-docs
     test-%: ; @echo "==> test $*"; $(MAKE) -C $* test   # or: cd $* && npm test
     ```

   - **Minimal — fail-fast in the loop.** Keeps the current shape, one line:

     ```make
     test:
     	@set -e; for p in $(PACKAGES); do echo "==> test $$p"; (cd $$p && npm test); done
     ```

     (`set -e` inside the recipe's own shell; do **not** rely on `.SHELLFLAGS`
     alone being inherited.) A status accumulator
     (`rc=0; ... || rc=$$?; ... exit $$rc`) is acceptable where running **all**
     packages before failing is wanted — for `test`/`lint` that is arguably
     better than fail-fast, since it reports every broken package in one run.
     Either is fine; silently returning 0 is not.

2. **Keep the `docs` steps in `build`/`install` as their own checked lines** —
   they already work; do not fold them into the loop and re-create the bug.

3. **Add the regression test** (see Quality Gate) so a green gate can never again
   be a vacuous gate.

4. **Decide the fate of `build-research-tech.yml`.** It is the backstop that
   caught all three real failures, but it duplicates `make` logic inline in
   workflow YAML — which contravenes the "One runner" convention. Once `ci.yml`
   genuinely fails, it is redundant *for gating* — but its `paths:` filter means
   it is **not** currently redundant, and it is the only reason this was found at
   all. **Do not delete it in the same change that fixes the Makefile**; a
   reviewer must be able to see the fixed `ci.yml` go red on its own first.
   Record the decision rather than letting it drift.

5. **Re-run the gate against the known-bad commit** to prove the fix on real
   history, not just a synthetic case (see Quality Gate).

6. **Fix or close PR #52.** Its `packages/tech` tests fail *today* (`7b53196`,
   `pretokenize.ts:41` regex `Invalid group`) while `ci` calls it green. Once
   this ticket lands, that PR's `ci` will correctly go red. Flag it to the PR's
   owner rather than letting the newly-honest gate ambush them. **`main` itself
   is currently green** — `packages/tech` passes at `ec158df` (raw exit 0) — so
   this is not an active production breakage.

## Quality Gate

- **The regression test is the point of this ticket.** A deliberately failing
  **non-final** package must make the target non-zero. Assert on the **raw exit
  code**, never through a pipe (`cmd | tail` masks status — the same class of bug
  this ticket fixes):

  ```sh
  # in a scratch fixture, or by injecting a temporary failure into the FIRST package
  make test; rc=$?; [ "$rc" -ne 0 ] || { echo "REGRESSION: make test masked a failure"; exit 1; }
  ```

  Cover `test`, `build`, and `lint`, each with the failure in the **first**
  package, and verify with a healthy tree that they still return 0. Wire it into
  a target the CI already runs so the test cannot rot.
- With a deliberate `tsc` error injected into `packages/tech` (first position):
  `make test`, `make build`, `make lint` each return **non-zero**, and the run
  names the offending package.
- With a clean tree: all targets still return **0** (no false positives). Verify
  `packages/industry` deps are installed first — an uninstalled package fails for
  the wrong reason and will fake a pass of this gate.
- **Prove it against real history:** check out `0b09ddc` (the red `main`), apply
  the fixed Makefile, and confirm `make test` returns **non-zero** — the commit
  where CI reported green. This is the acceptance test that matters; a synthetic
  fixture alone does not demonstrate the incident is closed.
- `make drift` stays green and byte-stable (it is unaffected, and must remain so).
- Ordering-independence: the fix must hold no matter where the failing package
  sits in `PACKAGES`. Do not accept a fix that merely reorders the list — that
  hides the bug behind luck and leaves the next added package exposed.

## Considerations

- **Severity.** This is not a latent nit. It is the repository's only
  general-purpose gate, `CLAUDE.md` instructs every developer and agent to trust
  it, and it has already passed a genuinely broken `main`. Every "CI green"
  judgment made through `make test` since the Makefile was introduced (`d15e4a1`,
  the initial skeleton — the loop shape has never been changed; `git log -- Makefile`
  shows four commits, none touching it) carries this caveat.
- **Why it hid for so long.** The defect only shows when a **non-final** package
  fails *and* someone compares against a non-masking check. With two packages and
  `packages/tech` first, the masked case is the common case — but
  `build-research-tech.yml` quietly covered it whenever a PR touched
  `packages/tech/**`, which most PRs do. The failure mode was invisible precisely
  because the backstop was doing the gate's job.
- **`make -k` / `-j`.** The single-line loop also defeats `make -k` and
  parallelism, since make sees one opaque command. The per-package-prerequisite
  shape in step 1 fixes the exit status *and* restores both, which is the reason
  to prefer it.
- **Local reproduction needs `packages/industry` deps.** `packages/industry` has
  no `node_modules` in a fresh checkout, so `make test` fails there (exit 2) for
  an unrelated reason and can mislead the investigator into thinking the gate
  works. Run `make install` (or `npm install` in `packages/industry`) before
  reproducing.
- The same masking shape (`for … do (cd …) done` as one recipe line) should be
  grepped for anywhere else it may have been copied — `scripts/*.sh` are
  currently `set -euo pipefail` and clean, but the pattern is contagious.

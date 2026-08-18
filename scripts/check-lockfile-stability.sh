#!/bin/sh -eu
# Prove `npm install` is a no-op, in every npm project.
#
# The three projects (packages/tech, packages/industry, docs) are independent npm
# projects with their own lockfiles (docs/adr/, no workspaces). Their lockfiles are
# written by whatever npm the installing machine happens to run, and npm versions
# disagree about the FILE FORMAT, not only about resolution: npm 11 writes `libc`
# arrays onto optional platform packages that npm 10 strips out again. So a
# repository whose lockfiles were last written by an npm other than the one its own
# `.nvmrc` pins hands every contributor three modified files after running the
# documented install command — churn to notice and revert every time, and churn to
# commit into an unrelated pull request when nobody notices. Measured 2026-08-18:
# 24 `libc` blocks and 75 lines across the three lockfiles.
#
# The fix that made this checkable is the `engines` field in each package.json,
# which states the Node and npm the lockfiles were written by. This script is the
# half that keeps it true: it runs the install and fails when npm rewrote anything.
#
# Two decisions worth not re-deriving:
#
#   * It runs the install ITSELF rather than trusting a preceding `make install`.
#     A check that only inspects the tree passes vacuously wherever nobody
#     installed, which is every local run. With node_modules warm — the CI order,
#     right after `make install` — the second install is cheap.
#   * It compares CONTENT HASHES taken either side of the install, not `git diff`.
#     What is being measured is npm's own effect, so it must be measurable on a
#     branch that is legitimately editing those manifests (the change that
#     introduced this script edited all six files), and a git comparison would
#     report the author's work as npm's.
#
# Usage: check-lockfile-stability.sh
# Exit:  0 when npm rewrote nothing; 1 otherwise, naming each file it rewrote.

PROJECTS="packages/tech packages/industry docs"
MANIFESTS="package.json package-lock.json"

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root"

echo "==> check-lockfile-stability: node $(node -v), npm $(npm -v)"

digest() { sha256sum "$1" | cut -d' ' -f1; }

rc=0
failed=""
for p in $PROJECTS; do
  before_json=$(digest "$p/package.json")
  before_lock=$(digest "$p/package-lock.json")
  echo "==> install $p"
  (cd "$p" && npm install --silent >/dev/null)
  [ "$(digest "$p/package.json")" = "$before_json" ] || {
    rc=1
    failed="$failed $p/package.json"
  }
  [ "$(digest "$p/package-lock.json")" = "$before_lock" ] || {
    rc=1
    failed="$failed $p/package-lock.json"
  }
done

if [ "$rc" -ne 0 ]; then
  echo "check-lockfile-stability: npm install rewrote:$failed" >&2
  echo "  The installing npm disagrees with the one that wrote these files." >&2
  echo "  Install with the npm each package.json 'engines' declares, or move" >&2
  echo "  'engines' and commit the regenerated lockfiles in the same change." >&2
  exit 1
fi

echo "check-lockfile-stability: npm install rewrote nothing in $(echo "$PROJECTS" | wc -w | tr -d ' ') projects."

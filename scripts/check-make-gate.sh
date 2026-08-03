#!/usr/bin/env bash
# Prove the Makefile's per-package targets REPORT a failure instead of masking it.
#
# The defect this guards against: a bare `@for p in $(PACKAGES); do (cd $$p &&
# npm test); done` is one recipe line, so make evaluates one exit status — the
# shell's — and a POSIX `for` loop's status is its LAST iteration's. Every
# earlier package's failure was discarded. `packages/tech` is listed FIRST, so it
# sat permanently in the masked position: `make test` returned 0 on a tree that
# failed its own tests, and CI invokes these same targets. `main` was genuinely
# red at 0b09ddc while CI reported green.
#
# The assertions below run against a SCRATCH FIXTURE, not the real packages, by
# overriding PACKAGES and DOCS_DIR on the make command line. That keeps this
# check fast and hermetic — it tests the RECIPE SHAPE, which is where the bug
# lived, rather than re-running the repository's real suites.
#
# Every assertion reads a RAW exit code. Never pipe a command under test
# (`cmd | tail` masks status — the same class of bug this script exists to catch).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$(mktemp -d "${TMPDIR:-/tmp}/check-make-gate.XXXXXX")"
trap 'rm -rf "$FIXTURE"' EXIT

# A fixture "package" whose test/build/lint scripts all exit with $2. npm runs
# these directly — no install, no network.
make_package() {
  local dir="$FIXTURE/$1"
  local code="$2"
  mkdir -p "$dir"
  cat > "$dir/package.json" <<EOF
{
  "name": "gate-fixture-$1",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "exit $code",
    "build": "exit $code",
    "lint": "exit $code"
  }
}
EOF
}

make_package good 0
make_package other 0
make_package bad 1

# The docs line of \`build\` is a separate, already-checked recipe line; point it
# at a no-op so this check never runs the real VitePress build.
mkdir -p "$FIXTURE/docs"
cat > "$FIXTURE/docs/package.json" <<'EOF'
{ "name": "gate-fixture-docs", "version": "1.0.0", "private": true,
  "scripts": { "build": "exit 0" } }
EOF

failures=0

# Run one target over a given PACKAGES list and compare its RAW exit code.
assert_exit() {
  local description="$1" target="$2" packages="$3" expected="$4"
  local rc=0
  if make -C "$ROOT" "$target" PACKAGES="$packages" DOCS_DIR="$FIXTURE/docs" \
    > "$FIXTURE/out.log" 2>&1; then
    rc=0
  else
    rc=$?
  fi
  if [ "$rc" -eq "$expected" ] || { [ "$expected" -ne 0 ] && [ "$rc" -ne 0 ]; }; then
    echo "  ok   make $target — $description (exit $rc)"
  else
    echo "  FAIL make $target — $description: expected exit $expected, got $rc" >&2
    sed 's/^/       | /' "$FIXTURE/out.log" >&2
    failures=$((failures + 1))
  fi
}

# Assert the run NAMES the offending package, so a red gate is actionable
# without a debugger rather than merely non-zero.
assert_names_offender() {
  local target="$1"
  if grep -q "FAILED in:.*bad" "$FIXTURE/out.log"; then
    echo "  ok   make $target — names the failing package"
  else
    echo "  FAIL make $target — did not name the failing package" >&2
    failures=$((failures + 1))
  fi
}

echo "==> check-make-gate: a failing package must make the target non-zero"

for target in test build lint; do
  # The failure in the FIRST position is the masked case: this is the assertion
  # the old recipe shape failed.
  assert_exit "failure in the FIRST package" "$target" \
    "$FIXTURE/bad $FIXTURE/good" 1
  assert_names_offender "$target"

  # Ordering-independence: the fix must hold wherever the failing package sits.
  # A fix that merely reorders PACKAGES would pass the case above and fail here.
  assert_exit "failure in the LAST package" "$target" \
    "$FIXTURE/good $FIXTURE/bad" 1
  assert_exit "failure in the MIDDLE package" "$target" \
    "$FIXTURE/good $FIXTURE/bad $FIXTURE/other" 1

  # No false positives: a healthy tree must still return 0.
  assert_exit "all packages healthy" "$target" \
    "$FIXTURE/good $FIXTURE/other" 0
done

# `install` and `format` share the identical `for_each_package` implementation,
# so the shape is proven by the three gates above. They are not exercised here
# because `install` would run a real `npm install`.

if [ "$failures" -ne 0 ]; then
  echo "check-make-gate: $failures assertion(s) failed — a per-package target is masking failures." >&2
  exit 1
fi

echo "check-make-gate: per-package targets report failures in every position."

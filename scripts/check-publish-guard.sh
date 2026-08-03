#!/usr/bin/env bash
# Prove `publish-research.sh copy` cannot silently replace downstream-authored prose.
#
# The exporter shares its destination directory with hand-authored content: at
# least one exported article (the vector-store comparison) was given an
# authored descriptive body on the qmu-co-jp side, which is now the
# authoritative text. Before the ownership check existed, any re-run replaced it
# without a word.
#
# Runs against a scratch qmu-co-jp and a scratch ledger (--qmu-dir /
# PUBLISH_LEDGER), so it never reads or writes the real sibling checkout.
# Every assertion reads a RAW exit code and the destination's bytes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/check-publish-guard.XXXXXX")"
trap 'rm -rf "$SCRATCH"' EXIT

QMU="$SCRATCH/qmu-co-jp"
DEST_DIR="$QMU/docs/llm-foundation-research"
mkdir -p "$DEST_DIR"
export PUBLISH_LEDGER="$SCRATCH/publish-ledger.tsv"

# Publish a real committed report, addressed by its docs-relative slug, so the
# check exercises the actual resolution path rather than a stubbed one.
SLUG="research-reports/token-metering-comparison.insights.ja"
SRC="$ROOT/docs/$SLUG.md"
DEST="$DEST_DIR/token-metering-comparison.insights.ja.md"

if [ ! -f "$SRC" ]; then
  echo "check-publish-guard: fixture source missing: docs/$SLUG.md" >&2
  exit 1
fi

failures=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1" >&2; failures=$((failures + 1)); }

publish() {
  ( cd "$ROOT" && ./scripts/publish-research.sh copy "$SLUG" --qmu-dir "$QMU" "$@" ) \
    > "$SCRATCH/out.log" 2>&1
}

echo "==> check-publish-guard: downstream-authored prose must survive a re-run"

# 1. A fresh (never-authored) article exports normally.
if publish; then
  if cmp -s "$SRC" "$DEST"; then
    pass "a fresh destination is exported"
  else
    fail "a fresh destination was not written correctly"
  fi
else
  fail "the first export failed (exit $?)"
  cat "$SCRATCH/out.log" >&2
fi

# 2. An unmodified destination is still ours, so a re-run may rewrite it.
if publish; then
  pass "an unmodified destination is re-exported"
else
  fail "re-exporting an unmodified destination failed"
  cat "$SCRATCH/out.log" >&2
fi

# 3. THE POINT: a hand-edited destination is left untouched, with a stated reason.
AUTHORED='# 手で書き下ろした本文

この記事は qmu-co-jp 側で執筆された正本である。エクスポータが黙って上書きしてはならない。
'
printf '%s' "$AUTHORED" > "$DEST"
AUTHORED_HASH="$(sha256sum "$DEST" | cut -d' ' -f1)"

publish || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "a hand-edited destination is left byte-identical"
else
  fail "a hand-edited destination was OVERWRITTEN -- the guard does not hold"
fi
if grep -q "SKIPPED (authored downstream)" "$SCRATCH/out.log"; then
  pass "the skip is reported, not silent"
else
  fail "the skip was silent"
  cat "$SCRATCH/out.log" >&2
fi
if grep -q "reason:" "$SCRATCH/out.log"; then
  pass "the skip states a reason"
else
  fail "the skip stated no reason"
fi

# 4. --dry-run over a diverged destination must also refuse, and write nothing.
publish --dry-run || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "--dry-run leaves a diverged destination untouched"
else
  fail "--dry-run modified a diverged destination"
fi

# 5. --force is the explicit, deliberate override.
if publish --force; then
  if cmp -s "$SRC" "$DEST"; then
    pass "--force overwrites a diverged destination"
  else
    fail "--force did not overwrite"
  fi
else
  fail "--force failed (exit $?)"
  cat "$SCRATCH/out.log" >&2
fi

# 6. Bootstrap: a destination that predates the ledger and differs from the
#    source is treated as authored, not as a stale export.
rm -f "$PUBLISH_LEDGER"
printf '%s' "$AUTHORED" > "$DEST"
publish || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "an unrecorded, differing destination is treated as authored"
else
  fail "an unrecorded, differing destination was overwritten"
fi

# 7. Bootstrap, the other way: an unrecorded destination identical to the
#    source has nothing to lose and must not block the publish.
rm -f "$PUBLISH_LEDGER"
cp "$SRC" "$DEST"
if publish; then
  pass "an unrecorded destination equal to the source still publishes"
else
  fail "an unrecorded but identical destination was wrongly skipped"
  cat "$SCRATCH/out.log" >&2
fi

if [ "$failures" -ne 0 ]; then
  echo "check-publish-guard: $failures assertion(s) failed -- the exporter can clobber downstream prose." >&2
  exit 1
fi

echo "check-publish-guard: downstream-authored prose is never silently replaced."

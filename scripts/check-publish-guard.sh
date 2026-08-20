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

# ---------------------------------------------------------------------------
# 8-12. THE DOWNSTREAM-OWNED MARK.
#
# Until 2026-08-03 the script told operators to protect downstream prose by
# recording the destination's hash in the ledger. That is the copy branch's own
# precondition, so the NEXT run overwrote the file. These assertions pin the
# replacement: a standing decision that survives repetition, --force, and
# --dry-run. Assertion 9 is the one the old remedy fails -- it is the second run
# that destroyed the text, so a single-run check would have passed throughout.
# ---------------------------------------------------------------------------
rm -f "$PUBLISH_LEDGER"
printf '%s' "$AUTHORED" > "$DEST"
DEST_REL="docs/llm-foundation-research/token-metering-comparison.insights.ja.md"

mark_downstream() {
  ( cd "$ROOT" && ./scripts/publish-research.sh mark-downstream "$DEST_REL" ) \
    > "$SCRATCH/mark.log" 2>&1
}

if mark_downstream; then
  if [ "$(awk -F'\t' -v k="$DEST_REL" '$1 == k { print $2 }' "$PUBLISH_LEDGER")" = "downstream" ]; then
    pass "a destination can be marked downstream-owned in committed data"
  else
    fail "mark-downstream did not record the mark"
  fi
else
  fail "mark-downstream failed (exit $?)"
  cat "$SCRATCH/mark.log" >&2
fi

# 9. THE POINT: byte-identical across TWO consecutive runs.
publish || true
publish || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "a downstream-owned destination survives two consecutive copy runs"
else
  fail "a downstream-owned destination was overwritten -- the mark does not hold"
  cat "$SCRATCH/out.log" >&2
fi

# 10. Reported as a settled exclusion, never as a divergence to resolve.
if grep -q "downstream-owned (excluded)" "$SCRATCH/out.log" \
  && ! grep -q "SKIPPED (authored downstream)" "$SCRATCH/out.log"; then
  pass "the exclusion is reported as intentional, not as an unresolved divergence"
else
  fail "a downstream-owned destination was reported as a divergence"
  cat "$SCRATCH/out.log" >&2
fi

# 11. --force is NOT the opt-out. The generated-text-wins override must not
#     reach a file whose ownership was handed away by a separate decision.
publish --force || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "--force does not overwrite a downstream-owned destination"
else
  fail "--force silently overwrote a downstream-owned destination"
fi

# 12. --dry-run writes nothing and still reports the exclusion.
publish --dry-run || true
if [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$AUTHORED_HASH" ]; then
  pass "--dry-run leaves a downstream-owned destination untouched"
else
  fail "--dry-run modified a downstream-owned destination"
fi

# 13. The dedicated opt-out does work -- and does not silently revoke the mark,
#     which would return the file to the exporter without anyone deciding so.
if publish --force-downstream-owned; then
  if cmp -s "$SRC" "$DEST"; then
    pass "--force-downstream-owned is the explicit override"
  else
    fail "--force-downstream-owned did not overwrite"
  fi
  if [ "$(awk -F'\t' -v k="$DEST_REL" '$1 == k { print $2 }' "$PUBLISH_LEDGER")" = "downstream" ]; then
    pass "the mark survives an explicit override"
  else
    fail "an override silently revoked the downstream-owned mark"
  fi
else
  fail "--force-downstream-owned failed (exit $?)"
  cat "$SCRATCH/out.log" >&2
fi

# ---------------------------------------------------------------------------
# 15-21. PRUNE -- deleting the copies a renamed destination leaves behind.
#
# The dated Japanese surveys were renamed on 2026-08-19 (the `.ja` suffix left
# the site's Japanese routes, so it left the copy destinations with them), and
# the copy stage cannot notice a rename: it writes the new name and never looks
# at the old one. Prune reads the ledger in the deleting direction, so the same
# ownership rules decide -- and it deletes, which is the one operation nothing
# downstream can undo. These assertions pin what it must refuse.
# ---------------------------------------------------------------------------
rm -f "$PUBLISH_LEDGER"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR/history/retired/2026-01-01T00-00-00-000Z"

ORPHAN_REL="docs/llm-foundation-research/history/retired/2026-01-01T00-00-00-000Z/retired.ja.md"
EDITED_REL="docs/llm-foundation-research/history/retired/2026-01-01T00-00-00-000Z/edited.ja.md"
OWNED_REL="docs/llm-foundation-research/history/retired/2026-01-01T00-00-00-000Z/owned.ja.md"
ABSENT_REL="docs/llm-foundation-research/history/retired/2026-01-01T00-00-00-000Z/absent.ja.md"
# A destination the plan DOES name, so prune must leave it alone.
PLANNED_REL="docs/llm-foundation-research/foundation-models.md"

seed_prune_fixture() {
  printf 'exporter output\n' > "$QMU/$ORPHAN_REL"
  printf 'exporter output\n' > "$QMU/$EDITED_REL"
  printf 'exporter output\n' > "$QMU/$OWNED_REL"
  printf 'exporter output\n' > "$QMU/$PLANNED_REL"
  OUR_HASH="$(sha256sum "$QMU/$ORPHAN_REL" | cut -d' ' -f1)"
  {
    printf '%s\t%s\n' "$ORPHAN_REL" "$OUR_HASH"
    printf '%s\t%s\n' "$EDITED_REL" "$OUR_HASH"
    printf '%s\t%s\n' "$OWNED_REL" "downstream"
    printf '%s\t%s\n' "$ABSENT_REL" "$OUR_HASH"
    printf '%s\t%s\n' "$PLANNED_REL" "$OUR_HASH"
  } | LC_ALL=C sort > "$PUBLISH_LEDGER"
  # Authored downstream AFTER we recorded it: the bytes no longer match.
  printf 'qmu-co-jp が書き直した本文\n' > "$QMU/$EDITED_REL"
  EDITED_HASH="$(sha256sum "$QMU/$EDITED_REL" | cut -d' ' -f1)"
}

prune() {
  ( cd "$ROOT" && ./scripts/publish-research.sh prune --all --qmu-dir "$QMU" "$@" ) \
    > "$SCRATCH/prune.log" 2>&1
}

seed_prune_fixture

# 15. --dry-run deletes nothing at all.
prune --dry-run || true
if [ -f "$QMU/$ORPHAN_REL" ] && grep -q "would delete orphan" "$SCRATCH/prune.log"; then
  pass "--dry-run reports the orphan without deleting it"
else
  fail "--dry-run deleted an orphan or reported nothing"
  cat "$SCRATCH/prune.log" >&2
fi

if prune; then
  # 16. Our own untouched output, no longer in the plan, is what prune is for.
  if [ ! -e "$QMU/$ORPHAN_REL" ]; then
    pass "an orphan matching the ledger is deleted"
  else
    fail "an orphan matching the ledger survived"
  fi
  if ! grep -q "^$ORPHAN_REL	" "$PUBLISH_LEDGER"; then
    pass "the deleted orphan's ledger row is dropped"
  else
    fail "the ledger still claims a file that was deleted"
  fi

  # 17. THE POINT: an orphan edited downstream is prose, not our output.
  if [ -f "$QMU/$EDITED_REL" ] \
    && [ "$(sha256sum "$QMU/$EDITED_REL" | cut -d' ' -f1)" = "$EDITED_HASH" ]; then
    pass "an orphan authored downstream is left byte-identical"
  else
    fail "an orphan authored downstream was DELETED -- the guard does not hold"
  fi
  if grep -q "KEPT (authored downstream)" "$SCRATCH/prune.log" \
    && grep -q "reason:" "$SCRATCH/prune.log"; then
    pass "the refusal is reported with a reason"
  else
    fail "an orphan was kept silently"
    cat "$SCRATCH/prune.log" >&2
  fi

  # 18. The standing decision holds in the deleting direction too, and quietly.
  if [ -f "$QMU/$OWNED_REL" ] && ! grep -q "owned.ja.md" "$SCRATCH/prune.log"; then
    pass "a downstream-owned orphan is kept, and not reported as a divergence"
  else
    fail "a downstream-owned orphan was deleted or reported as unresolved"
    cat "$SCRATCH/prune.log" >&2
  fi

  # 19. A destination the plan still names is not an orphan.
  if [ -f "$QMU/$PLANNED_REL" ]; then
    pass "a destination still in the plan is untouched"
  else
    fail "prune deleted a destination the plan still names"
  fi

  # 20. A row whose file is already gone is an observation of nothing.
  if ! grep -q "^$ABSENT_REL	" "$PUBLISH_LEDGER"; then
    pass "a stale row for an absent file is dropped"
  else
    fail "a stale ledger row survived"
  fi
else
  fail "prune failed (exit $?)"
  cat "$SCRATCH/prune.log" >&2
fi

# 21. Without --all the plan is partial, so almost everything would look like an
#     orphan. Refuse before building it, and delete nothing.
seed_prune_fixture
if ( cd "$ROOT" && ./scripts/publish-research.sh prune --qmu-dir "$QMU" ) \
  > "$SCRATCH/prune-partial.log" 2>&1; then
  fail "prune without --all was accepted"
else
  if [ -f "$QMU/$ORPHAN_REL" ]; then
    pass "prune without --all refuses and deletes nothing"
  else
    fail "prune without --all deleted an orphan before refusing"
  fi
fi

if [ "$failures" -ne 0 ]; then
  echo "check-publish-guard: $failures assertion(s) failed -- the exporter can clobber downstream prose." >&2
  exit 1
fi

echo "check-publish-guard: downstream-authored prose is never silently replaced, and never deleted."

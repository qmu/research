#!/bin/sh -eu
# Guard the .workaholic/ ledger indexes, which merge by union (see .gitattributes).
#
# The union driver resolves every index merge silently. That is what we want for an
# append-only list, and it is exactly why the result needs checking: union cannot
# tell "both desks appended a line" from "both desks rewrote the same line", and it
# reports neither. This script is the loud half of that trade.
#
# It checks IDENTITY, not prose: every index entry must point at a file that exists,
# every file must be listed exactly once. That is the property a bad merge breaks —
# an entry lost to a resolution, or duplicated by one — and it is checkable without
# the workaholic plugin, so CI enforces the same rule a developer sees locally. The
# per-entry descriptions belong to whoever writes them (`refresh-index.sh` for the
# generated regions, /report for stories) and are not this script's business.
#
# Two families of index are covered:
#
#   * MARKED areas (`<!-- okf:generated:begin -->`): the entries inside the region
#     are generated from the directory's own `*.md` files, so region and directory
#     must agree exactly.
#   * `stories/index.md`: report-maintained rather than generated (its per-entry
#     description exists nowhere else), so NOTHING regenerates it and a bad union
#     would otherwise survive unseen. This is the case that matters most.
#
# Indexes over subdirectories (`missions/`, `trips/`) are out of scope: their entries
# point into `<dir>/<name>/<file>.md`, a different shape, and neither has shown the
# append-collision this guard exists for.
#
# Usage: check-workaholic-indexes.sh
# Exit:  0 when every covered index matches its directory; 1 otherwise, naming each
#        offending file on stderr.

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if [ ! -d .workaholic ]; then
  echo "check-workaholic-indexes: no .workaholic/ directory, nothing to check"
  exit 0
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
rc=0

# Compare one index's link targets against the `*.md` files beside it.
# $1 = index path, $2 = "marked" to read only the okf-generated region.
check_index() {
  index="$1"
  scope="${2:-whole}"
  dir=$(dirname "$index")

  if [ "$scope" = marked ]; then
    sed -n '/okf:generated:begin/,/okf:generated:end/p' "$index" > "$tmp/body"
  else
    cat "$index" > "$tmp/body"
  fi

  # Entries are `* [<label>](<target>)`; the target is the identity, so an edited
  # label never registers as a different entry. The label is matched greedily
  # (`.*`, not `[^]]*`) because a label may itself contain brackets — the feedback
  # record "Cloud [Implement] cannot claim personally-assigned tickets" is the case
  # that proves it, and a non-greedy match read its target as the wrong string and
  # reported a present file as missing.
  sed -n 's/^\* \[.*\](\([^)]*\)).*/\1/p' "$tmp/body" | sort > "$tmp/listed"
  (cd "$dir" && ls -1 *.md 2>/dev/null || true) | grep -v '^index\.md$' | sort > "$tmp/disk"
  sort -u "$tmp/listed" > "$tmp/listed.u"

  if [ -n "$(uniq -d "$tmp/listed")" ]; then
    echo "check-workaholic-indexes: $index lists these entries more than once:" >&2
    uniq -d "$tmp/listed" | sed 's/^/  /' >&2
    rc=1
  fi

  if [ -n "$(comm -23 "$tmp/disk" "$tmp/listed.u")" ]; then
    echo "check-workaholic-indexes: files in $dir/ are absent from $index:" >&2
    comm -23 "$tmp/disk" "$tmp/listed.u" | sed 's/^/  /' >&2
    rc=1
  fi

  if [ -n "$(comm -13 "$tmp/disk" "$tmp/listed.u")" ]; then
    echo "check-workaholic-indexes: $index points at files that do not exist:" >&2
    comm -13 "$tmp/disk" "$tmp/listed.u" | sed 's/^/  /' >&2
    rc=1
  fi
}

checked=0
for index in .workaholic/*/index.md; do
  [ -f "$index" ] || continue
  case "$index" in
    .workaholic/missions/index.md|.workaholic/trips/index.md) continue ;;
  esac
  if grep -q 'okf:generated:begin' "$index"; then
    check_index "$index" marked
  elif [ "$index" = .workaholic/stories/index.md ]; then
    check_index "$index" whole
  else
    continue
  fi
  checked=$((checked + 1))
done

if [ "$checked" -eq 0 ]; then
  # No covered index is itself a failure: this guard is wired into CI precisely so
  # the ledger cannot stop being checked without someone noticing.
  echo "check-workaholic-indexes: no covered index found under .workaholic/" >&2
  exit 1
fi

if [ "$rc" -eq 0 ]; then
  echo "check-workaholic-indexes: $checked ledger indexes match their directories"
fi
exit "$rc"

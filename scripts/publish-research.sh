#!/bin/sh
# Generate research data-skeleton drafts or copy per-topic reports to qmu-co-jp.
#
# Usage:
#   publish-research.sh generate
#   publish-research.sh copy [--all | <slug>...] [options]
#
# Stages:
#   generate          Read committed/local artifacts and write regenerable drafts
#                     under docs/llm-foundation/_generated/.
#   copy              Copy the published Japanese reports to qmu-co-jp as plain
#                     Markdown. The --all set is generated from the shared
#                     research site metadata so the publish order matches the
#                     VitePress sidebar order.
#
# Options:
#   --all             With copy, copy every per-topic published report (the set
#                     above).
#   --qmu-dir DIR     Path to the qmu-co-jp checkout (default: ../qmu-co-jp,
#                     overridable with the QMU_DIR environment variable).
#   --dry-run         With copy, print what would be copied without writing.
#   --force           Overwrite destinations that diverged from this exporter's
#                     last emit. Destroys downstream-authored prose -- pass it
#                     only when you have decided the generated text wins. It does
#                     NOT touch destinations marked downstream-owned.
#   --force-downstream-owned
#                     Additionally overwrite destinations marked downstream-owned.
#                     Separate from --force on purpose: a mark is a standing
#                     decision, so overriding it is its own deliberate act. The
#                     mark survives the write; remove it to hand the file back.
#   -h, --help        Show this help.
#
# Also:
#   publish-research.sh mark-downstream <dest-path>...
#                     Record destinations as downstream-owned (qmu-co-jp is
#                     authoritative; never write them). Paths are the
#                     qmu-co-jp-relative form, e.g.
#                     docs/llm-foundation-research/image-generation.md.
#
# A <slug> is a path relative to the repo's docs/ (e.g.
# research-reports/llm-speed-comparison.insights.ja). Bare names are resolved
# against docs/research-reports/ then docs/llm-foundation/.
#
# ---------------------------------------------------------------------------
# OWNERSHIP BOUNDARY -- which side is authoritative
# ---------------------------------------------------------------------------
# This exporter shares its destination directory with HAND-AUTHORED content.
# At least one exported article (the vector-store comparison) was given an
# intentionally authored descriptive body on the qmu-co-jp side, and that text
# is now the authoritative one. A deterministic generator that shares a
# destination with hand-authored content needs its ownership boundary stated in
# the tool, not remembered:
#
#   * Never authored downstream  -> THIS REPO is authoritative. The copy wins.
#   * Authored downstream        -> QMU-CO-JP is authoritative. The copy must
#                                   not silently replace it.
#
# Enforcement is a ledger committed at scripts/publish-ledger.tsv, one row per
# destination: <dest-relative-path>\t<sha256 | downstream>. The hash column
# carries two DIFFERENT KINDS of fact, and the distinction is the whole point:
#
#   a sha256            an OBSERVATION -- "this is the text we last emitted".
#   the word downstream a DECISION     -- "qmu-co-jp owns this; never write it".
#
# On each copy:
#
#   marked `downstream`                      -> EXCLUDE, quietly (a standing decision)
#   destination missing                      -> copy (nothing to lose)
#   hash matches the ledger                  -> copy (untouched since our emit)
#   hash differs from the ledger             -> SKIP, loudly (authored downstream)
#   no ledger entry, but dest == source      -> record and continue (bootstrap)
#   no ledger entry, and dest != source      -> SKIP, loudly
#
# The second-to-last row is the conservative bootstrap case: with no record, a
# differing destination is indistinguishable from downstream-authored prose, so
# it is treated as authored.
#
# RESOLVING A LOUD SKIP. Review the file, then pick the side that wins:
#
#   the generated text wins  -> re-run with --force.
#   the downstream text wins -> mark it downstream-owned:
#                               publish-research.sh mark-downstream <dest-path>
#
# DO NOT resolve it by recording the destination's current hash. That writes an
# observation where a decision belongs: the next run reads "hash matches the
# ledger", takes the copy branch, and silently overwrites the very prose the
# operator was protecting. This script told operators to do exactly that until
# 2026-08-03. The `downstream` mark exists because the decision could not be
# stated at all -- "no ledger entry", the only state that preserved the text,
# re-reported itself as an unresolved divergence on every single run, so
# permanent protection and a permanent warning were the same state.
#
# The ledger is committed so the decision is reproducible on any clone: without
# it a fresh checkout has no record and would report every destination diverged.

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPORTS_DIR="$REPO_ROOT/docs/research-reports"
FOUNDATION_DIR="$REPO_ROOT/docs/llm-foundation"
QMU_DIR="${QMU_DIR:-$REPO_ROOT/../qmu-co-jp}"
LEDGER="${PUBLISH_LEDGER:-$REPO_ROOT/scripts/publish-ledger.tsv}"

COMMAND=""
ALL=0
DRY=0
FORCE=0
FORCE_OWNED=0
SLUGS=""
# The same positional arguments verbatim. `SLUGS` strips `.md` because a copy
# slug names a document; a ledger key is a literal path and must not be rewritten.
RAW_ARGS=""

# The sentinel occupying the hash column when the row states a DECISION rather
# than an observation. Not a valid sha256, so it cannot collide with a hash.
DOWNSTREAM_MARK="downstream"

published_report_plan() {
  (cd "$REPO_ROOT/packages/tech" && npm run -s research:site -- copy-plan)
}

usage() {
  # Through the "Also:" block (mark-downstream), which is part of the interface.
  sed -n '2,42p' "$0" | sed 's/^# \{0,1\}//'
}

# sha256 of a file, bare hex. Both tools ship on this platform; prefer coreutils.
file_hash() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# The hash this exporter last emitted for a destination, or "" if unrecorded.
ledger_hash() {
  [ -f "$LEDGER" ] || return 0
  awk -F'\t' -v key="$1" '$1 == key { print $2; exit }' "$LEDGER"
}

# Record (insert or replace) a destination's hash. Kept sorted so the committed
# ledger has a stable diff rather than reordering on every run.
ledger_record() {
  _lr_key="$1"
  _lr_hash="$2"
  _lr_tmp="${LEDGER}.tmp.$$"
  mkdir -p "$(dirname "$LEDGER")"
  {
    [ -f "$LEDGER" ] && awk -F'\t' -v key="$_lr_key" '$1 != key' "$LEDGER"
    printf '%s\t%s\n' "$_lr_key" "$_lr_hash"
  } | LC_ALL=C sort >"$_lr_tmp"
  mv "$_lr_tmp" "$LEDGER"
}

# True when the ledger states that qmu-co-jp owns this destination.
ledger_is_downstream_owned() {
  [ "$(ledger_hash "$1")" = "$DOWNSTREAM_MARK" ]
}

if [ $# -gt 0 ]; then
  case "$1" in
    generate | copy | mark-downstream) COMMAND="$1"; shift ;;
    --generate) COMMAND="generate"; shift ;;
    --copy) COMMAND="copy"; shift ;;
  esac
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --all)
      ALL=1
      [ -n "$COMMAND" ] || COMMAND="copy"
      ;;
    --qmu-dir)
      shift
      [ $# -gt 0 ] || {
        echo "Error: --qmu-dir requires a directory." >&2
        exit 1
      }
      QMU_DIR="$1"
      ;;
    --dry-run)
      DRY=1
      ;;
    --force)
      FORCE=1
      ;;
    --force-downstream-owned)
      FORCE_OWNED=1
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      [ -n "$COMMAND" ] || COMMAND="copy"
      SLUGS="$SLUGS ${1%.md}"
      RAW_ARGS="$RAW_ARGS $1"
      ;;
  esac
  shift
done

case "$COMMAND" in
  generate)
    node "$REPO_ROOT/scripts/export-corporate-research.mjs"
    echo "Done. Drafts are under docs/llm-foundation/_generated/."
    exit 0
    ;;
  mark-downstream)
    # State the decision "qmu-co-jp owns this destination" in committed data.
    # This is the remedy the skip message points at; it exists as a command so
    # the instruction is executable rather than a hand-edit of a TSV, which is
    # the shape of the instruction that got followed wrongly in the first place.
    [ -n "${RAW_ARGS# }" ] || {
      echo "Error: mark-downstream needs at least one destination path." >&2
      echo "  e.g. docs/llm-foundation-research/image-generation.md" >&2
      exit 1
    }
    for dest_path in $RAW_ARGS; do
      ledger_record "$dest_path" "$DOWNSTREAM_MARK"
      echo "marked downstream-owned: $dest_path"
    done
    echo "Commit ${LEDGER#"$REPO_ROOT"/} -- the decision belongs in the repository."
    exit 0
    ;;
  copy) ;;
  "")
    usage >&2
    exit 1
    ;;
  *)
    echo "Unknown command: $COMMAND" >&2
    exit 1
    ;;
esac

PLAN_FILE=$(mktemp)
trap 'rm -f "$PLAN_FILE"' EXIT

if [ "$ALL" -eq 1 ]; then
  published_report_plan >>"$PLAN_FILE"
fi

for slug in $SLUGS; do
  printf '%s\t%s\n' "$slug" "$(basename "$slug")" >>"$PLAN_FILE"
done

if [ ! -s "$PLAN_FILE" ]; then
  echo "No reports to copy. Pass a slug or --all." >&2
  exit 0
fi

QMU_DIR=$(cd "$QMU_DIR" 2>/dev/null && pwd || true)
if [ -z "$QMU_DIR" ] || [ ! -d "$QMU_DIR/docs" ]; then
  echo "Error: qmu-co-jp checkout not found (looked for <dir>/docs)." >&2
  echo "Pass --qmu-dir DIR or set QMU_DIR." >&2
  exit 1
fi

DEST_DIR="$QMU_DIR/docs/llm-foundation-research"
copied=0
skipped=0
excluded=0
while read -r slug dest_slug; do
  # A slug is either a docs-relative path (research-reports/... or
  # llm-foundation/...) or a bare name resolved against research-reports first,
  # then llm-foundation. The destination keeps the basename.
  case "$slug" in
    */*) SRC="$REPO_ROOT/docs/$slug.md" ;;
    *)
      if [ -f "$REPORTS_DIR/$slug.md" ]; then
        SRC="$REPORTS_DIR/$slug.md"
      else
        SRC="$FOUNDATION_DIR/$slug.md"
      fi
      ;;
  esac
  REL=${SRC#"$REPO_ROOT"/}
  DEST="$DEST_DIR/${dest_slug:-$(basename "$slug")}.md"

  if [ ! -f "$SRC" ]; then
    echo "Error: report not found: $REL" >&2
    exit 1
  fi

  DEST_REL="docs/llm-foundation-research/${dest_slug:-$(basename "$slug")}.md"

  # OWNERSHIP CHECK (see the header). Decide BEFORE writing whether this
  # destination still belongs to the exporter, so downstream-authored prose can
  # never be replaced by a copy nobody asked for.
  #
  # The standing decision is read FIRST and short-circuits the hash comparison:
  # a downstream-owned destination is not a divergence to resolve, so it must
  # not be reported as one, and its content is irrelevant -- the mark holds
  # whether the file matches the source, differs from it, or is absent.
  if ledger_is_downstream_owned "$DEST_REL"; then
    if [ "$FORCE_OWNED" -eq 0 ]; then
      echo "downstream-owned (excluded): $DEST_REL"
      excluded=$((excluded + 1))
      continue
    fi
    if [ "$DRY" -eq 1 ]; then
      echo "would OVERWRITE downstream-owned (--force-downstream-owned): $REL -> $DEST_REL"
      continue
    fi
    mkdir -p "$(dirname "$DEST")"
    cp "$SRC" "$DEST"
    # Deliberately NOT ledger_record: the mark is a decision, and one override
    # does not revoke it. Recording the emitted hash here would hand ownership
    # back to the exporter silently -- the exact inversion this design removes.
    echo "OVERWROTE downstream-owned (--force-downstream-owned, mark kept): $REL -> $DEST_REL" >&2
    copied=$((copied + 1))
    continue
  fi

  DIVERGED=0
  DIVERGED_WHY=""
  if [ -f "$DEST" ]; then
    DEST_HASH=$(file_hash "$DEST")
    RECORDED=$(ledger_hash "$DEST_REL")
    if [ -n "$RECORDED" ]; then
      [ "$DEST_HASH" = "$RECORDED" ] || {
        DIVERGED=1
        DIVERGED_WHY="edited downstream since this exporter last wrote it"
      }
    elif [ "$DEST_HASH" != "$(file_hash "$SRC")" ]; then
      # Bootstrap: no record, and the destination is not our source. We cannot
      # tell downstream-authored prose from a stale export, so assume authored.
      DIVERGED=1
      DIVERGED_WHY="no ledger entry and it differs from the source (never recorded)"
    fi
  fi

  if [ "$DIVERGED" -eq 1 ] && [ "$FORCE" -eq 0 ]; then
    echo "SKIPPED (authored downstream): $DEST_REL" >&2
    echo "  reason: $DIVERGED_WHY" >&2
    echo "  qmu-co-jp is authoritative for this article. Review it, then decide:" >&2
    echo "    the generated text wins  -> re-run with --force" >&2
    echo "    the downstream text wins -> $0 mark-downstream $DEST_REL" >&2
    echo "  Do NOT record the destination's hash in ${LEDGER#"$REPO_ROOT"/}: that says" >&2
    echo "  \"the exporter emitted this\", so the next run would overwrite it." >&2
    skipped=$((skipped + 1))
    continue
  fi

  if [ "$DRY" -eq 1 ]; then
    if [ "$DIVERGED" -eq 1 ]; then
      echo "would OVERWRITE diverged (--force): $REL -> $DEST"
    else
      echo "would copy: $REL -> $DEST"
    fi
    continue
  fi

  # Destinations may be nested (D1 mirrors past surveys under history/<topic>/<ts>/),
  # so create the destination's own directory, not just the top-level one.
  mkdir -p "$(dirname "$DEST")"
  cp "$SRC" "$DEST"
  # Record what we just emitted, so the NEXT run can tell our own output from a
  # downstream edit. Recording after the write is what makes the check meaningful.
  ledger_record "$DEST_REL" "$(file_hash "$DEST")"
  if [ "$DIVERGED" -eq 1 ]; then
    echo "OVERWROTE diverged (--force): $REL -> $DEST_REL"
  else
    echo "copied: $REL -> $DEST_REL"
  fi
  copied=$((copied + 1))
done <"$PLAN_FILE"

# Carry the current pages' shared image assets (manifest-v2 image-generation
# embeds generated images by the relative path images/<file>). Copied whole so
# the pictures resolve beside the Japanese reports on qmu-co-jp. A text-only
# publish set has no such directory and this is skipped.
IMAGES_SRC="$REPORTS_DIR/images"
if [ -d "$IMAGES_SRC" ]; then
  IMAGES_DEST="$DEST_DIR/images"
  if [ "$DRY" -eq 1 ]; then
    echo "would copy image assets: docs/research-reports/images/ -> docs/llm-foundation-research/images/"
  else
    mkdir -p "$IMAGES_DEST"
    cp -R "$IMAGES_SRC/." "$IMAGES_DEST/"
    echo "copied image assets: docs/research-reports/images/ -> docs/llm-foundation-research/images/"
  fi
fi

if [ "$DRY" -eq 0 ]; then
  echo "Done. $copied per-topic report(s) copied to $QMU_DIR/docs/llm-foundation-research/."
  if [ "$excluded" -gt 0 ]; then
    # Not a warning: these are settled decisions, and reporting them as
    # unresolved is what made a clean publish run look permanently unclean.
    echo "$excluded report(s) excluded as downstream-owned (qmu-co-jp writes them)."
  fi
  if [ "$skipped" -gt 0 ]; then
    echo "$skipped report(s) SKIPPED because qmu-co-jp is authoritative for them (see above)." >&2
  fi
  echo "Review and commit the changes in the qmu-co-jp repository to deploy."
  echo "Commit ${LEDGER#"$REPO_ROOT"/} in this repository too -- it records what was emitted."
fi

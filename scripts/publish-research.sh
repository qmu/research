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
#   copy              Copy the published reports to qmu-co-jp as plain Markdown.
#                     The published set is the generated structured Japanese
#                     reports under docs/llm-foundation/ (foundation-model,
#                     vector-db, availability, ocr — data tables + LLM 考察),
#                     the design article agent-sdk-comparison, and the Japanese
#                     model catalog. The keyless fixture data reports are NOT
#                     published — they are the reproducible source.
#
# Options:
#   --all             With copy, copy every per-topic published report (the set
#                     above).
#   --qmu-dir DIR     Path to the qmu-co-jp checkout (default: ../qmu-co-jp,
#                     overridable with the QMU_DIR environment variable).
#   --dry-run         With copy, print what would be copied without writing.
#   -h, --help        Show this help.
#
# A <slug> is a path relative to the repo's docs/ (e.g.
# research-reports/llm-speed-comparison.insights.ja). Bare names are resolved
# against docs/research-reports/ then docs/llm-foundation/.

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPORTS_DIR="$REPO_ROOT/docs/research-reports"
FOUNDATION_DIR="$REPO_ROOT/docs/llm-foundation"
QMU_DIR="${QMU_DIR:-$REPO_ROOT/../qmu-co-jp}"

# The published set, as repo-docs-relative paths (no .md extension): the four
# generated structured Japanese reports, the design article, and the JP catalog.
PUBLISHED_REPORTS="llm-foundation/foundation-model-comparison llm-foundation/vector-db-comparison llm-foundation/availability-comparison llm-foundation/ocr-comparison llm-foundation/agent-sdk-comparison research-reports/foundation-models.insights.ja"
COMMAND=""
ALL=0
DRY=0
SLUGS=""

usage() {
  sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//'
}

if [ $# -gt 0 ]; then
  case "$1" in
    generate | copy) COMMAND="$1"; shift ;;
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

if [ "$ALL" -eq 1 ]; then
  SLUGS="$SLUGS $PUBLISHED_REPORTS"
fi

if [ -z "$(echo "$SLUGS" | tr -d ' ')" ]; then
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
for slug in $SLUGS; do
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
  DEST="$DEST_DIR/$(basename "$slug").md"

  if [ ! -f "$SRC" ]; then
    echo "Error: report not found: $REL" >&2
    exit 1
  fi

  if [ "$DRY" -eq 1 ]; then
    echo "would copy: $REL -> $DEST"
    continue
  fi

  mkdir -p "$DEST_DIR"
  cp "$SRC" "$DEST"
  echo "copied: $REL -> docs/llm-foundation-research/$(basename "$slug").md"
  copied=$((copied + 1))
done

if [ "$DRY" -eq 0 ]; then
  echo "Done. $copied per-topic report(s) copied to $QMU_DIR/docs/llm-foundation-research/."
  echo "Review and commit the changes in the qmu-co-jp repository to deploy."
fi

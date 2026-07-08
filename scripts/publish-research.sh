#!/bin/sh
# Generate research data-skeleton drafts or copy canonical articles to qmu-co-jp.
#
# Usage:
#   publish-research.sh generate
#   publish-research.sh copy [--all | <slug>...] [options]
#
# Stages:
#   generate          Read committed/local artifacts and write regenerable drafts
#                     under docs/llm-foundation/_generated/.
#   copy              Copy canonical docs/llm-foundation/*.md files, never
#                     _generated drafts, to qmu-co-jp as plain Markdown.
#
# Options:
#   --all             With copy, copy every top-level docs/llm-foundation/*.md.
#   --qmu-dir DIR     Path to the qmu-co-jp checkout (default: ../qmu-co-jp,
#                     overridable with the QMU_DIR environment variable).
#   --dry-run         With copy, print what would be copied without writing.
#   -h, --help        Show this help.

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC_DIR="$REPO_ROOT/docs/llm-foundation"
QMU_DIR="${QMU_DIR:-$REPO_ROOT/../qmu-co-jp}"
COMMAND=""
ALL=0
DRY=0
SLUGS=""

usage() {
  sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'
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
  for f in "$SRC_DIR"/*.md; do
    [ -f "$f" ] || continue
    SLUGS="$SLUGS $(basename "$f" .md)"
  done
fi

if [ -z "$(echo "$SLUGS" | tr -d ' ')" ]; then
  echo "No canonical articles to copy. Pass a slug or --all." >&2
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
  SRC="$SRC_DIR/$slug.md"
  DEST="$DEST_DIR/$slug.md"

  if [ ! -f "$SRC" ]; then
    echo "Error: canonical article not found: docs/llm-foundation/$slug.md" >&2
    exit 1
  fi

  if [ "$DRY" -eq 1 ]; then
    echo "would copy: docs/llm-foundation/$slug.md -> $DEST"
    continue
  fi

  mkdir -p "$DEST_DIR"
  cp "$SRC" "$DEST"
  echo "copied: docs/llm-foundation/$slug.md -> docs/llm-foundation-research/$slug.md"
  copied=$((copied + 1))
done

if [ "$DRY" -eq 0 ]; then
  echo "Done. $copied canonical article(s) copied to $QMU_DIR/docs/llm-foundation-research/."
  echo "Review and commit the changes in the qmu-co-jp repository to deploy."
fi

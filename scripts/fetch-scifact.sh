#!/bin/sh
# Fetch the BEIR SciFact dataset into the local, gitignored cache.
#
# SciFact (allenai/scifact, redistributed via BEIR) is CC BY-NC 2.0. Its corpus
# text is NEVER committed to this repository; only a manifest of selected query
# and document ids + qrels (facts) is committed under
# packages/tech/src/rag-benchmark/domain/data/scifact-subset.manifest.json.
# The real rag-benchmark run reads this cache and filters it to that manifest.
#
# Usage: scripts/fetch-scifact.sh
set -eu

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
CACHE="$REPO_ROOT/packages/tech/.cache/scifact"
URL="https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip"

mkdir -p "$CACHE"
if [ -f "$CACHE/corpus.jsonl" ] && [ -f "$CACHE/queries.jsonl" ] && [ -f "$CACHE/qrels-test.tsv" ]; then
  echo "SciFact cache already present at $CACHE"
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
echo "Downloading SciFact from $URL ..."
curl -sSL -o "$TMP/scifact.zip" "$URL"
unzip -q -o "$TMP/scifact.zip" -d "$TMP"
cp "$TMP/scifact/corpus.jsonl" "$CACHE/corpus.jsonl"
cp "$TMP/scifact/queries.jsonl" "$CACHE/queries.jsonl"
cp "$TMP/scifact/qrels/test.tsv" "$CACHE/qrels-test.tsv"
echo "SciFact cached at $CACHE"

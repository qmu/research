#!/usr/bin/env bash
# Keyless-fixture drift gate: regenerate every topic's keyless fixture and fail
# when the regeneration does not byte-match the committed artifacts under
# docs/research-reports/. Byte-stability of the keyless path is the pipeline
# mission's load-bearing constraint; this gate catches a model-registry edit
# (packages/tech/src/llm-model-comparison/models.ts and friends) whose derived
# committed pages were not regenerated, and any renderer change that silently
# alters committed output.
#
# The topic list comes from the topic registry itself (topicIds()), never from
# a hand-maintained parallel list.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! git diff --quiet -- docs/research-reports; then
  echo "check-fixture-drift: docs/research-reports has uncommitted changes; commit or stash them first" >&2
  exit 1
fi

topics=$(cd packages/tech && node --import tsx/esm --input-type=module -e \
  "const { topicIds } = await import('./src/research/domain/topic.ts'); process.stdout.write(topicIds().join('\n') + '\n');")

for topic in $topics; do
  echo "==> research ${topic} --fixture"
  (cd packages/tech && npm run --silent research -- "$topic" --fixture)
done

if ! git diff --exit-code -- docs/research-reports; then
  echo "check-fixture-drift: keyless fixture regeneration drifted from the committed artifacts (diff above)." >&2
  echo "Regenerate and commit: for each changed topic, 'npm run research -- <topic> --fixture' in packages/tech." >&2
  exit 1
fi
echo "check-fixture-drift: keyless fixtures are byte-stable against the committed artifacts."

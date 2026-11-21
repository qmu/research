# Local inference reproduction id

`reproductionId(conditions)` (`domain/identity.ts`) generates a versioned
SHA-256 id from `engine`, `model`, `fixture`, `runnerVersion`, and
`targetCommit`. The id is independent of property order and of
`targetCommit` letter case; `targetCommit` must be a full 40-character Git
SHA-1. No timestamp, host, measured result, or credential ever enters it.

That same id is how the public adoption (採否) page and the reproduction
command refer to a configuration:

- `renderAdoptionPage(rows)` (`domain/adoption-page.ts`) renders one table
  row per saved configuration with its reproduction id, linking to a
  `## Reproduction commands` section keyed by that id.
- `reproductionCommand(conditions)` (`domain/reproduction-command.ts`) builds
  `npm run local-inference -- --engine <v> --model <v> --fixture <v>
--runner-version <v> --target-commit <v> --reproduction-id <id>`, so running
  the printed command and reading the page both name the same id.

`saveReproductionId(directory, conditions)` (`store.ts`) saves the five
conditions and the id to `<directory>/<reproductionId>.json` by atomic
rename. Concurrent or repeated saves of identical conditions publish
identical bytes and the same filename.

This module only generates and displays the id — it does not decide
whether a row is a duplicate before it is saved; that is
`local-inference-save-guard`'s job.

From `packages/tech`:

```sh
# Save one configuration's reproduction id
node --import tsx/esm src/entrypoints/save-local-inference-reproduction-id.ts conditions.json /tmp/reproduction-ids

# Render the adoption page from a saved rows file
node --import tsx/esm src/entrypoints/render-local-inference-reproduction-page.ts \
  src/local-inference-reproduction-id/fixtures/adoption-rows.json /tmp/local-inference-adoption.md
```

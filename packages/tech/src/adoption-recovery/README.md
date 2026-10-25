# Adoption-page recovery

The VitePress component `docs/.vitepress/theme/AdoptionRecovery.vue` consumes a
publisher-supplied `{ binding, result }` using the actual `local-inference/6`
artifact contract. Each missing TTFT/peak RSS reason opens the same batch-bound
request panel. `createAdoptionIntent` and `recreateAdoptionIntent` generate JSON;
the browser never writes a measurement artifact or executes inference.
The public page uses synthetic data. To publish a measured context, pin the
binding independently of uploads and provide the original validated result as
component props. Do not derive expected identity from a downloaded intent.

## Save boundary

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/save-adoption-recovery.ts \
  /trusted/result.json /trusted/comparison-context.json \
  adoption-recovery-intent.json > saved-request.json
```

`comparison-context.json` contains the trusted `binding` object; the page also
needs `result`. The output path belongs to the operator and is not read from the
intent. The source artifact and its `.execution.json` reservation must already
exist. The CLI emits only the saved request on stdout, or fixed
`ADOPTION-RECOVERY-SAVE-FAILED` on stderr with exit 1. No raw file contents,
exception text or paths appear in errors.

`saveAdoptionRecoveryIntent(output, binding, intent, timing?)` validates the actual
artifact with the runner's `remeasurementRequest` function, under the same
`updateCompletedExecution` lock used for measurement publication. It compares
execution ID/version, target commit, runner version, fixture SHA-256, fixed-tier
label AND capacity, affected row IDs, missing metric names, and fixed missing
reasons. Unknown reasons, changed page evidence, extra intent fields, inconsistent
existing requests and superseded executions fail closed. JSON property order is
irrelevant. Mixed tiers are rejected against the expected binding even when
both tier capacities are valid.

One atomic replacement updates only `remeasurementRequest`, preserving the
original measurements and execution identity. All missing rows/metrics remain
one request. The existing writer's lock recovery and power-loss limitations
apply; no second store, queue, or cross-artifact deduplication is introduced.

## Lifetime and retries

A newly created request has `lifecycle.generation: 1`, `createdAt` and `expiresAt`
in Unix milliseconds. The default TTL is 24 hours. API timing overrides belong
to the trusted operator/test harness; intent JSON cannot supply the clock or TTL.
Exact create retries preserve ID and deadline; expired retries fail with
`RECOVERY-TTL-EXPIRED`. Requests created by the original runner without lifecycle
metadata are `RECOVERY-EXPIRY-UNKNOWN`, never silently renewed.

Load the standalone request returned by the CLI into the same page row. Only an
expired/legacy request enables recreation. The intent pins its predecessor ID
and next generation. Saving checks the actual current request and expiry under
lock before replacing it with a fresh ID, deadline and `previousRequestId`.
Concurrent identical recreations return the same successor, and retries do not
extend TTL. Reusing a replaced predecessor fails `RECOVERY-REQUEST-STALE`.
The original `saveRemeasurementRequest` API also validates managed requests and
returns an active one without rewriting it; it rejects expired managed requests.

Browser inspection is advisory. It cannot know whether a loaded file is the
latest generation, and its clock is not authoritative. The locked save is the
final gate. No request is dispatched here; an eventual executor must revalidate
current execution/request eligibility, use a new run ID and output path, and
provide its own claim/dispatch protocol. Do not reuse the source execution for
measurement or assume inspection reserves a request until a worker completes.

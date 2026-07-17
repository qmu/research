# trend-recency ground-truth history

The committed, auditable ground-truth DB for the `trend-recency` topic —
the same accumulate-and-summarize convention as `availability-history/`.

Each **real** trial draws a fresh probe set from real-world events in the
trailing window (`windowDays`, currently 30) before the trial, and commits that
dated set here **before** the run, so every trial is reproducible and its ground
truth stays auditable rather than regenerated and lost. The keyless fixture
path uses the illustrative seed manifest committed in code
(`packages/tech/src/trend-recency/domain/manifest.ts`, version
`trend-recency-v1-seed`) and never writes here.

## Shape

One JSON file per trial probe set, named `<generated-at date>-<manifest
version>.json`:

```jsonc
{
  "version": "trend-recency-v2-20260801", // instrument version of this set
  "windowDays": 30, // recency horizon the probes were drawn from
  "generatedAt": "2026-08-01T00:00:00.000Z",
  "probes": [
    {
      "id": "20260801-example-event",
      "topic": "ai-models", // event category
      "question": "…?", // the recent-event question asked verbatim
      "eventDateIso": "2026-07-20", // when the event happened
      "expectedAnswer": "…", // curated ground-truth answer
      "expectedKeywords": ["…"], // normalized tokens a correct answer must contain
      "sources": [
        // citations backing the ground truth, so it is auditable
        { "url": "https://…", "publishedDateIso": "2026-07-20", "title": "…" }
      ]
    }
  ]
}
```

`probes[*]` extends the runtime `RecencyProbe` shape
(`packages/tech/src/trend-recency/domain/types.ts`) with the `sources` audit
field. Changing a committed probe set is an instrument-version bump, never a
silent edit; history/trend series connect same-instrument-version points only.

The first real validation trial
(ticket `20260714010001-trend-recency-first-validation-trial.md`) commits the
first dated probe set.

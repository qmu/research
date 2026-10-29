# Initial-delay × peak-RSS scatter (verified runs only)

This renders the 初回遅延×ピークRSS (initial delay × peak RSS) relationship for
local-inference engines as a scatter plot, built only from runs whose reading
is `verified`. It does not compute, render, or alter any adoption verdict.

## Why this, and not a duplicate of the open adoption-table work

The local-inference area already has a large amount of open, unmerged work on
`main` building a **speed/quality/memory-margin adoption table** — a per
(use case, engine) pass/fail verdict against a threshold (e.g.
qmu/research#205's `ttft`/`tps`/`quality`/`peakRss` use-case thresholds,
qmu/research#211/#215/#219's peak-memory-ceiling comparison table, and
qmu/research#271/#275/#276's fixed-tier memory-margin work). None of that is
merged to `main` as of this change, and this module does not import, extend,
or depend on any of it:

- An adoption table answers **"does this engine clear a threshold for this use
  case"** — a verdict. This scatter answers a different question —
  **"across the runs we trust, where does each engine actually land on delay
  vs. memory"** — with no threshold, ceiling, ranking, or verdict drawn on it.
  A reader can see the two side by side without the chart ever contradicting
  the table, because it makes no adoption claim at all.
- It defines its own `LatencyMemoryRun`/`VerifiedReading` shape
  (`domain/types.ts`) rather than reusing any of the open PRs' in-flight
  types, so it stays mergeable to `main` on its own, independently of which
  of those lands first or in what shape.
- "Verified" here means the run's reading is present and trustworthy enough
  to plot (`domain/types.ts`'s `VerifiedReading` vs. `UnverifiedReading`),
  echoing this area's existing provenance-gating vocabulary (run id / target
  commit / runner version matching, "検証済み") without reusing any specific
  identity validator from an unmerged branch.

## What this module is (and is not)

- **Is**: a pure filter (`domain/verified-runs.ts`'s `onlyVerifiedRuns`), a
  pure parser for an untrusted readings document
  (`domain/parse-runs.ts`'s `parseLatencyMemoryRuns`), and a pure Markdown+SVG
  section renderer (`domain/scatter-section.ts`'s
  `renderLatencyMemoryScatterSection`) built on a new, reusable, general
  two-metric SVG scatter primitive (`../research-report/domain/scatter-chart.js`'s
  `renderScatterChart`, sibling to the existing `renderTimeSeriesChart`).
- An unverified run is **dropped**, never plotted at `0`, `null`, or any
  other placeholder a scatter chart would render as a real point. The
  rendered section always discloses how many runs were excluded and why
  the chart is empty when every run is unverified — silently narrowing the
  denominator would misrepresent what was actually measured.
- **Is not**: a measurement harness, a provenance/identity validator, or a
  replacement for the speed/quality/memory adoption table. No CLI,
  docs-report wiring, or live local-inference data source is included —
  `fixtures/example-runs.json` is explicitly synthetic, used only by the
  worked-example test below, and must not be read as a measured result.

## Files

- `domain/types.ts` — `LatencyMemoryReading` (`VerifiedReading` /
  `UnverifiedReading`), `LatencyMemoryRun`.
- `domain/verified-runs.ts` — `onlyVerifiedRuns`: drops unverified runs.
- `domain/parse-runs.ts` — `parseLatencyMemoryRuns`: validates an untrusted
  `{ runs: [...] }` document into typed `LatencyMemoryRun[]`, throwing on any
  entry that does not match the discriminated reading shape.
- `domain/scatter-section.ts` — `renderLatencyMemoryScatterSection`: groups
  verified runs by engine, renders the scatter, and returns the Markdown
  section alongside `verifiedCount`/`excludedCount`.
- `../research-report/domain/scatter-chart.js` — `renderScatterChart`: the
  general-purpose SVG scatter primitive this section is built on.
- `fixtures/example-runs.json` — five synthetic runs (two verified engines,
  two unverified) used by `fixtures/scatter-section.fixture.test.ts` as a
  worked example — not a measurement of any installed engine.

## Worked example (fixture data, not a measurement)

```ts
import exampleRuns from "./fixtures/example-runs.json";
import { parseLatencyMemoryRuns } from "./domain/parse-runs";
import { renderLatencyMemoryScatterSection } from "./domain/scatter-section";

const runs = parseLatencyMemoryRuns(exampleRuns);
console.log(renderLatencyMemoryScatterSection(runs).markdown);
```

Over the committed fixture, `llama.cpp` (2 verified trials) and `mlx` (1
verified trial) are plotted; `ollama` and `strata` are excluded because their
readings are `unverified` (`runner-version-mismatch`, `NO-FIELD`), and the
rendered caption states the excluded count (2) explicitly. Run
`npm test -- src/local-inference-latency-memory-scatter` to reproduce this.

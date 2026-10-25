# Local-inference next-action display

`safeNextAction` and `renderMissingMetricNextActions` are a side-effect-free
display layer for the **speed / quality / memory** missing-data reasons a
local-inference adoption page shows for a saved comparison row. Each missing
reason maps to exactly **one** safe next action: a read-only pointer (label +
explanation) to where a reader resolves that specific absence, never a
trigger that re-runs or reproduces a measurement.

```ts
import { renderMissingMetricNextActions } from "./index.js";

renderMissingMetricNextActions([
  { metric: "speed", reason: "failed" },
  { metric: "quality", reason: "unsupported" },
]);
```

renders a fixed-order (`speed` → `quality` → `memory`) Markdown table with one
row per missing metric, each linking to a fixed anchor (`#failed`,
`#unsupported`, `#not-recorded`) that a hosting page defines once.

## Relationship to other open PRs on this topic

This package mirrors, but does not import, the `ComparisonMetric` /
`MissingReason` shape that
[qmu/research#253](https://github.com/qmu/research/pull/253)'s
`comparisonMissingReasons` boundary returns — that PR computes *which*
metrics are missing and why; this one only decides what safe action to show
once a reason is already known, so the two have no code dependency on each
other's unmerged branch.

It is deliberately **not** a reproduction/remeasurement entry point.
[#264](https://github.com/qmu/research/pull/264),
[#218](https://github.com/qmu/research/pull/218) and
[#216](https://github.com/qmu/research/pull/216) already cover rendering a
safe reproduction command from a saved snapshot's own version fields; this
package never renders a command, never reads a snapshot, and never computes
eligibility or an adopt/reject verdict ([#239](https://github.com/qmu/research/pull/239),
[#242](https://github.com/qmu/research/pull/242) own that).

## Guarantees

- `safeNextAction` is a pure function from `{ metric, reason }` to a fresh
  `{ label, detail, anchor }` object; repeated calls never share or expose a
  mutable reference to the lookup table.
- `renderMissingMetricNextActions` orders its output by metric
  (`speed` → `quality` → `memory`) independent of input order, rejects an
  unknown metric or reason with a `TypeError` naming the metric, and rejects a
  duplicated metric rather than silently keeping one.
- An empty input list renders an empty string; this module records no
  adoption verdict and reads no saved report.

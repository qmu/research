# Local-inference memory margin

Turns a whole-machine peak-memory reading and the host's own fixed memory
capacity into one headroom number — "how much of this host's memory tier is
left after the peak" — formatted for the same row as a speed cell and a
quality cell, per qmu/research#256 (ADR 0013, proposed, not yet merged to
`main`)'s instruction that the Memory axis "must be read together with the
memory regime" rather than as a bare, incomparable peak-RSS number.

## Scope

- **Input shapes only, not measurement.** This module does not run an
  engine, does not collect a host fingerprint, and does not judge quality.
  It takes an already-normalized peak-memory reading (the shape
  qmu/research#211 produces: a value + `"MiB"` unit, or a missing value with
  `NO-FIELD` / `MEASURE-FAILED` / `NOT-RUN`) and an already-collected raw
  total-memory figure (the shape qmu/research#197's `os.totalmem()`
  fingerprint produces, in MiB), and a caller-supplied, already-formatted
  speed cell and quality cell it does not interpret.
- **A margin, not a verdict.** qmu/research#205 and #215 answer "does this
  engine clear a use case's ceiling" (adopt/reject/undetermined).
  This module answers a different question — "how much headroom is left,
  as a number" — which is what lets a reader judge a use case #205/#215
  never proposed a ceiling for, without this module needing to know what
  "adopt" means for any use case.
- **Buckets a raw capacity onto a fixed tier first.** `os.totalmem()`
  under-reports a vendor's nameplate capacity by whatever the firmware/OS
  reserves, so two hosts "the same" machine class report slightly different
  raw bytes. `nearestFixedCapacityTier` (`domain/tiers.ts`) buckets a raw
  figure onto the nearest tier in `tiers.json` (status: `"illustrative"` —
  a catalog of the discrete sizes vendors actually sell in this class of
  machine, not a specific device's spec sheet) within a tolerance, and
  returns `null` — never a guessed tier — when nothing is close enough. A
  caller measuring a real host can pass its own tier list if the default
  catalog doesn't fit.

## Why this is not a duplicate of an open PR

Checked immediately before writing this module (2026-10-25):

- **qmu/research#197** collects the non-secret host fingerprint
  (`os.totalmem()` among four fields) but does not compute anything from
  it — it only attaches the fingerprint to the common JSON.
- **qmu/research#211** normalizes Strata's community peak-memory readings
  into `host_ram_peak` / `gpu_vram_peak`, and **qmu/research#215** joins
  that reading to a per-use-case adoption ceiling. Neither turns the
  reading into a headroom number against the host's own total capacity —
  #215's ceilings are fixed use-case policy values, not a specific host's
  measured capacity, and #211 doesn't touch capacity at all.
- **qmu/research#205** proposes per-use-case `peakRss` thresholds (a
  per-process metric, explicitly stated as distinct from the whole-machine
  readings #211/#215 use) — again a threshold, not a margin, and again not
  connected to a host's total memory.
- **qmu/research#256 (ADR 0013)** states that the Memory axis needs its
  regime (unified vs. discrete) stated alongside the number, but is docs
  only — no code computes anything — and its "Correspondence to existing
  implementation" table lists no PR for a capacity-vs-peak margin.

None of the above compute `capacity - peak`, bucket a raw capacity onto a
fixed tier, or render a margin next to a speed/quality cell. This module
fills exactly that gap, independently — it imports nothing from any of the
unmerged PRs above, following the same reasoning #197 and #215 state for
their own independence from other open branches.

## Modules

- `domain/types.ts` — `MemoryReading`, `FixedCapacityTier`, `MemoryMargin`,
  `EngineMemoryMarginRow`.
- `domain/tiers.ts` — loads and validates `tiers.json`;
  `nearestFixedCapacityTier`.
- `domain/margin.ts` — `computeMemoryMargin`,
  `computeMemoryMarginFromRawCapacity`.
- `domain/table.ts` — `renderMemoryMarginTable`: one deterministic Markdown
  table, escaped cells, row order preserved; exports `formatMemoryMarginCell`
  so the margin cell's text has one source.
- `domain/adoption.ts` — `decideAdoption`, `renderAdoptionTable`: see below.

## Connecting the margin to the 採否 (adopt/reject) page

The scope note above says this module "decides nothing about adoption" and
is "the pure calculation and rendering layer a future measurement PR can
call" — `domain/adoption.ts` is that call. `EngineAdoptionRow` extends
`EngineMemoryMarginRow` with a `runId` per cell (speed, quality, memory —
the shape qmu/research#269's `reproductionIdentity` produces: a stable ID
from `engine`/`model`/`fixture`/`runnerVersion`/`targetCommit`, so two
measurements share a `runId` only when all five conditions match).

`decideAdoption` adopts a row only when its three `runId`s are present and
equal — i.e. the speed, quality and memory-margin figures were all produced
under the same run, not assembled from whichever rows happened to be on
hand for each metric. It rejects with:

- `ORIGIN-MISSING` — any cell carries no `runId` (an absent origin is never
  treated as agreement).
- `ORIGIN-MISMATCH` — the `runId`s are present but not all equal.

`renderAdoptionTable` renders the same Markdown shape as
`renderMemoryMarginTable` plus a `採否` column (`採用` / `不採用 (<reason>)`).
A rejected row still shows its computed margin cell: rejection says these
three figures should not be read as describing one run, not that the
numbers should be hidden.

This module still does not run an engine, collect a host fingerprint, judge
quality, or compute `runId` — it only takes the already-produced `runId`
per cell, the same way it already took an already-normalized `peak`
reading. It imports nothing from qmu/research#269 (the identity generator)
or any other unmerged PR; a caller wires the two together.

No CLI, model registry, or web page changes are included — this is the pure
calculation and rendering layer a future measurement PR can call once a real
peak-memory reading and host fingerprint both exist on the same branch.

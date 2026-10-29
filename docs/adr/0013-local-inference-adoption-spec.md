# 0013 — Adoption spec for local inference engines: speed, quality, memory, failure reasons, reproduction conditions

- **Status**: proposed (2026-10-25). The spec below is a contract for what any
  future measurement of Ollama, llama.cpp server, MLX, or Strata must report;
  it is not itself a measurement, and no per-engine adopt/reject verdict is
  decided here.
- **Related**: [0007](0007-aggregator-gateway-subset.md) (the "does it serve a
  model we already track" test, which does **not** apply to this topic — see
  Scope); [0009](0009-end-to-end-throughput.md) (the end-to-end throughput
  definition reused below).
- **Built on, and deliberately not duplicating**: the local-inference
  comparison conditions proposed in
  [#179](https://github.com/qmu/research/pull/179) (same prompt, same model
  condition, same metrics, the missing-data reason codes), the official-source
  engine comparison in [#177](https://github.com/qmu/research/pull/177), the
  general-purpose bench-spec schema in
  [#171](https://github.com/qmu/research/pull/171) /
  [#174](https://github.com/qmu/research/pull/174) /
  [#175](https://github.com/qmu/research/pull/175), and the local-LLM bench
  conditions in [#176](https://github.com/qmu/research/pull/176). Those
  records define *how a single comparison run must be conducted*; this one
  states *which five facts the public adoption decision needs out of that run*
  and *where each is implemented*, which none of them states as a single page.
  As of this writing none of the PRs cited anywhere in this record are merged
  to `main` — every reference is to an open pull request, not to code present
  on this branch's base.

## Scope

This is **not** a backend for the models `llm-model-comparison` already
tracks (Claude, GPT, Gemini, Grok have no distributable weights, so the
ADR 0007 test — "does it serve a tracked model" — does not apply). It is a
**separate comparison topic**: four engines that serve open-weight models
locally, compared against each other. "採否" (adopt/reject) here means
*per engine, as a subject of that topic* — whether its numbers are trustworthy
enough to publish and, downstream, whether a given use case should run on it
— not whether to replace any hosted provider.

## Why five axes, and why they must live on one page

`#171`–`#176` and `#179` each fix one piece of *how* a run is conducted. None
of them states, in one place, which five categories of fact an adoption
decision actually consumes, or which file is supposed to produce each one —
so a reader (or the next implementing PR) has to reconstruct that mapping from
eight-plus separate records. That mapping is this document's only job.

| Axis | Unit / shape | Better | Why it's load-bearing |
| --- | --- | --- | --- |
| **Speed** | time-to-first-token (ms); output tok/s, end-to-end (`outputTokens / totalMs`, the [ADR 0009](0009-end-to-end-throughput.md) definition — never a post-first-token window, for the same reason 0009 gives: it rewards shifting work into pre-emission reasoning) | lower TTFT; higher tok/s | the one axis every candidate engine's own marketing already claims; also the one most sensitive to measurement method (client clock vs. self-reported runtime `timings`) |
| **Quality** | per-fixture pass / fail / undetermined against a stated judge and judge version | higher pass rate; `undetermined` must shrink as fixtures are added, not get silently counted as pass | the four engines do **not** necessarily serve the same weight file (below), so quality is a property of *(engine, model-as-served)*, not of the engine in isolation |
| **Memory** | peak RSS during generation, MB/GB, at a stated context length and batch size | lower, read together with the memory regime (below) | a bare peak-RSS number is incomparable across a unified-memory host (MLX, and Ollama/llama.cpp on Apple Silicon) and a discrete-VRAM host; the regime must be stated, not just the number |
| **Failure reasons** | a fixed, enumerable code — never a fabricated `0` or a silently-passing default | fewer categories observed in practice | distinguishes "the engine is slow/wrong" from "the measurement didn't run" — the two have opposite implications for an adoption verdict and must never collapse into the same empty cell |
| **Reproduction conditions** | a fixed record, not a number | — | every number above is meaningless without it: which engine build, which model bytes, which host, which flags produced it |

## The five axes, in detail

### Speed

Per [#179](https://github.com/qmu/research/pull/179): one OpenAI-compatible
`/v1/chat/completions` request per item, streaming on, batch size 1,
speculative decoding off, identical `messages` across engines. The client
clock is the primary source for TTFT and total time for **all four** engines;
each engine's own self-reported `timings`/`eval_duration` fields are a
cross-check only, never the recorded value — the same distinction ADR 0009
exists to enforce for the hosted-provider registry (a model that moves work
into a window the metric excludes should not measure as faster for it). A
single request is noise, not a reading: per [ADR 0008](0008-generational-verdict-sampling.md)'s
precedent for the hosted registry, a published speed figure needs multiple
trials with a stated spread, not one sample.

### Quality

Per [#189](https://github.com/qmu/research/pull/189): judged per fixed
fixture against a recorded judge identity and version (e.g. `exact-text/v1`),
stored as `pass` / `fail` / `undetermined` — `undetermined` is not a silent
pass. [#179](https://github.com/qmu/research/pull/179) states the weight-identity
fact that makes this axis harder than it looks: Ollama and llama.cpp server
can load the **same GGUF bytes**, so a quality delta between them isolates the
serving layer; MLX and (per the still-open identification question below)
Strata do not load that same file, so a quality delta against them is
`NOT-COMPARABLE` at the weight level and must be labelled as such rather than
read as a serving-layer finding.

### Memory

Peak RSS at a stated context length and batch size — not yet measured by any
open PR as of this writing ([#183](https://github.com/qmu/research/pull/183)
and [#205](https://github.com/qmu/research/pull/205) both record this field as
unmeasured — `NOT-RUN` — for all four engines). The regime distinction that
must accompany the number: MLX and Apple-Silicon Ollama/llama.cpp run on
**unified memory** (model weights and working set share the same pool as the
OS); a CUDA/ROCm host keeps a separate VRAM pool. The same peak-RSS figure
means a different thing on each, and a comparison table that drops the regime
column invites a reader to rank them on a number that isn't measuring the
same resource.

### Failure reasons

The vocabulary already in use across the in-flight PRs, collected here so a
future implementer has one citable list instead of eight PR bodies: `NO-FIELD`
/ `NOT-STATED` / `NOT-EXPOSED` (the field doesn't exist, isn't documented, or
isn't returned by this engine — [#179](https://github.com/qmu/research/pull/179)),
`NOT-LOADABLE` / `NOT-COMPARABLE` (weight-identity mismatches, same source),
`NOT-RUN` (measured field, not yet executed —
[#183](https://github.com/qmu/research/pull/183)), `MEASURE-FAILED` (HTTP,
stream, or timeout failure mid-request — [#183](https://github.com/qmu/research/pull/183),
[#202](https://github.com/qmu/research/pull/202)), and `INPUT-MISMATCH` /
`NO-OUTPUT` (the judged output didn't match the recorded input, or there was
none to judge — [#189](https://github.com/qmu/research/pull/189)). The
binding rule, consistent across every one of those records and with this
registry's existing convention of rendering an honest `error`/`fixtured` row
rather than a fabricated number: **a failure is a code, never a zero, and
never a default that reads as a passing measurement.**

### Reproduction conditions

Before any number above is citable, the record must carry: engine
version/commit and runtime version; model file identity (GGUF digest for
Ollama/llama.cpp, or the explicit `NOT-LOADABLE`/`NOT-COMPARABLE` statement
for MLX/Strata); a non-secret host fingerprint — platform, arch, total memory,
runtime version, per [#197](https://github.com/qmu/research/pull/197), which
deliberately excludes hostname/user/network/env values; sampling parameters;
thread/GPU/context flags; and the target commit and runner version the
measurement ran against (the identity a stale or replayed result must be
rejected against, per the commit/runner-provenance work in
[#237](https://github.com/qmu/research/pull/237),
[#238](https://github.com/qmu/research/pull/238),
[#240](https://github.com/qmu/research/pull/240)). A number without this
record is **要確認** (needs confirmation), not measured — the same provenance
discipline `docs/oss-foundation-proposal.md` §3 states for its own metrics.

## Per-engine survey (summary — see #177 for sourced detail)

| Engine | What it is | Serves the same weight file as | Open identification question |
| --- | --- | --- | --- |
| **Ollama** | daemon wrapping `llama.cpp` (plus its own engine for some architectures); OpenAI-compatible `/v1/chat/completions` and a native `/api/generate` | llama.cpp (same GGUF bytes) | none |
| **llama.cpp server** | the engine underneath Ollama, run directly; same OpenAI-compatible surface | Ollama | none |
| **MLX (mlx-lm)** | Apple's array framework + `mlx-lm`; Metal + unified memory, Apple Silicon only | none of the other three (its own quantized format) | none, beyond platform exclusivity |
| **Strata** | provisionally resolved to `Niko1221/Strata` by [#177](https://github.com/qmu/research/pull/177) | none of the other three | **open** — #177 and #179 both flag this identification as unconfirmed; every Strata row in this registry inherits that uncertainty until an owner confirms it |

Full sourcing (pinned commits per project) lives in #177 and is not repeated
here; this table exists only to carry each engine's bearing on the Quality and
Reproduction-conditions axes above.

## Correspondence to existing implementation

None of the rows below are merged to `main` as of this ADR. The table records
which open PR is responsible for which axis, so a future measurement PR knows
which record to extend rather than re-deriving the shape, and so this ADR's
own status can move from *proposed* to *accepted* once the pieces it
describes actually land.

| Axis | Responsible PR(s) | What it adds |
| --- | --- | --- |
| Common measurement record (schema the other rows write into) | [#183](https://github.com/qmu/research/pull/183) | `packages/tech/src/local-inference/` — one request per engine, versioned JSON, client-clock TTFT/TPS |
| Speed / comparison conditions | [#179](https://github.com/qmu/research/pull/179) | the shared-prompt / shared-model-condition / shared-metrics contract this spec's Speed section restates |
| Quality | [#189](https://github.com/qmu/research/pull/189) | per-fixture pass/fail/undetermined + judge version, layered on #183's record without modifying it |
| Memory | [#183](https://github.com/qmu/research/pull/183), [#205](https://github.com/qmu/research/pull/205) | `peakRss` field (currently `NOT-RUN` for all four); use-case-specific memory thresholds |
| Failure reasons | [#202](https://github.com/qmu/research/pull/202), [#204](https://github.com/qmu/research/pull/204) | the fixed-code failure normalizer and reproduction-condition retention on a failed row |
| Reproduction conditions | [#197](https://github.com/qmu/research/pull/197), [#237](https://github.com/qmu/research/pull/237), [#238](https://github.com/qmu/research/pull/238) | host fingerprint; target-commit and runner-version provenance |
| Vendor adapters (per engine, behind the existing `CompletionClient` port) | Ollama [#186](https://github.com/qmu/research/pull/186); MLX [#190](https://github.com/qmu/research/pull/190)/[#191](https://github.com/qmu/research/pull/191); Strata [#208](https://github.com/qmu/research/pull/208) | `vendors/llm/*.ts`, each with its own `docs/dependency-decisions.md` entry — not duplicated here |
| Engine survey (sourced facts) | [#177](https://github.com/qmu/research/pull/177) | the per-engine table this record's survey section summarizes |
| Use-case adoption thresholds | [#205](https://github.com/qmu/research/pull/205) | pass/fail/undetermined gates over the four axes, per use case (interactive coding / batch summarization / edge-offline) |

## Decision

**Adopt the spec, not yet a verdict.** The five axes, their codes, and the
reproduction-conditions requirement above are the contract every
local-inference measurement PR should write into and every comparison page
should read from. No per-engine adopt/reject conclusion is recorded here,
because — per #183's and #205's own stated caveats — no real measurement
exists yet for any of the four engines on any axis; publishing a verdict
ahead of that would be exactly the fabricated-number failure this spec's
Failure-reasons section rules out.

## Consequences

- A future PR that runs a real measurement cites this ADR for which fields
  and codes to populate, rather than inventing its own.
- This ADR's status moves to *accepted* once the implementation table above
  is substantially merged; until then, treat every cell in it as a pointer to
  an open PR, not to code on `main`.
- Strata's identification (`Niko1221/Strata`, per #177) stays an open
  question this record inherits rather than resolves; every Strata-labelled
  measurement is provisional until an owner confirms it.
- This is a point-in-time index over a fast-moving set of open PRs. Re-check
  PR state before citing a "responsible PR" above as current.

---
created_at: 2026-07-14T01:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-computer-use-via-playwright
depends_on: [20260714005201-kickoff-propose-periodic-research.md]
gate: awaiting-owner-approval-of-design-proposal
---

# Build the Computer Use via Playwright research topic (fixture-first, keyless CI)

> **GATED — do not promote to `todo/` until the owner approves the design
> proposal below.** Per `docs/research-development-guideline.md` and `CLAUDE.md`,
> no scaffolding and no paid run happens before approval. This ticket carries the
> proposal drafted by the kickoff (`20260714005201-kickoff-propose-periodic-research.md`)
> so that, on approval, a `/drive` can build the whole fixture path in one pass —
> exactly as the image-generation-benchmark mission did.

## Approved design (pending owner approval)

The proposal-first protocol requires exactly five elements. Numbers below are
the drafted estimates; the `--estimate` path decides the real cost figure at
build time and an estimate outside the agreed ceiling stops for re-approval.

### 1. Cadence

**Quarterly** (every 3 months), with an **off-cadence trigger on any new
computer-use model/tool release** (a new Anthropic computer tool version, a new
OpenAI computer-use model, a new Gemini computer-use model). Rationale: unlike
the text-side speed/accuracy topics (monthly), a computer-use trial is an
order of magnitude more expensive **per task** — each task is a multi-turn
observe→think→act loop where every turn is a model call carrying a screenshot —
so a quarterly base cadence bounds cost while the release-triggered off-cadence
run keeps the current article fresh when the landscape actually moves. Cadence
is confirmed only after the step-3 validation trial (guideline §Step 3).

### 2. Comparison subjects

The **API-native computer-use tools**, driven through **one fixed Playwright
harness** so the only variable is the model/tool (the survey found harness
choice alone swings scores by 5–6 points, so the harness must be pinned):

| Subject | Model + tool (mid-2026, verified) | API surface | Key gate |
| --- | --- | --- | --- |
| Anthropic Computer Use | `computer_20251124` tool on **Claude Sonnet 5** (`claude-sonnet-5`); Opus 4.8 as an optional second config | Messages API (beta header `computer-use-2025-11-24`) | `ANTHROPIC_API_KEY` |
| OpenAI computer use | built-in `computer` tool on **`computer-use-preview`** (GPT-5.6 "Sol" as an optional second config) | Responses API | `OPENAI_API_KEY` |
| Google Gemini computer use | `computer_use` tool on **Gemini 3.5 Flash** (`gemini-2.5-computer-use-preview-10-2025` legacy) | Gemini API / Vertex | `GOOGLE_API_KEY` |

**Fixed harness:** Playwright, via the repo's existing Playwright MCP plugin
(`mcp__plugin_playwright_playwright__browser_*`), as the actuation + observation
layer for every subject. **Out of scope for v1:** `browser-use` as a second,
DOM-first harness (a candidate second-harness trial once the fixed-harness
baseline is validated); mobile/`AndroidWorld`; desktop-OS (`OSWorld`) tasks —
v1 is browser-only.

### 3. Metrics

Each with unit and the direction that reads as better:

- **Task success rate** — % of suite tasks whose deterministic success predicate
  passes (higher better). *Primary.*
- **Steps to complete** — mean actions per solved task (lower better).
- **Latency per action** — ms from action request to next observation (lower better).
- **Wall-clock per task** — seconds end-to-end for a solved task (lower better).
- **Cost per task** — USD from token usage of all turns (lower better).
- **Recovery rate** — share of solved tasks that required ≥1 recovery from a
  failed/rejected action (secondary; robustness signal).

### 4. Cost and trial count (range, with premises)

Premises: **8–12 fixed tasks × 1–3 repetitions × 3–4 subject configs**; one task
≈ 10–30 model turns; each turn's input is dominated by a screenshot (~1–2k image
tokens). Screenshots are the cost driver. Tension: more repetitions narrow the
run-to-run variance the artifact records as standard deviation, but each
repetition re-pays the full multi-turn screenshot cost — the steepest
cost/variance trade of any topic so far.

- Drafted range: **≈ $5–$60 per trial** (3–4 subjects, 1–3 reps).
- **Proposed cost ceiling for approval: $40 / trial.**
- The topic's `npm run research -- computer-use --estimate` path produces the
  binding figure before any real run; an estimate above the ceiling stops for
  re-approval. Precedent: llm-model-comparison 3 reps ≈ $46; image-generation
  ≈ $0.95/trial.

### 5. Accumulated history

Per-subject `HistoryPoint` series for **success rate**, **cost per task**, and
**wall-clock per task**, one point per quarterly survey. After three or more
surveys the current article's 推移 (trend) block shows each subject's
success-rate and cost movement across the tendency window (3–5 surveys).

### Task suite (reproducibility decision)

Rather than adopt a public suite directly — the survey flagged that OSWorld has
fragmented into OSWorld / OSWorld-Verified / OSWorld 2.0 (non-comparable), and
that live-site suites (WebVoyager, Online-Mind2Web) drift as their target sites
change — v1 pins a **small, self-contained, deterministic browser-task suite**
served from a committed/vendored static site, each task with a mechanically
checkable success predicate (final URL / DOM state / field value), in the spirit
of WebArena's functional checks. The suite snapshot is versioned in-repo so a
trial is reproducible byte-for-byte. Public suites (OSWorld 2.0, WebArena,
WebVoyager) are cited in the report as the standard references our metric
definitions follow.

## Key Files (build)

- `packages/tech/src/llm-model-comparison/` — reference instrument (registry,
  matrix, run, estimate, history, domain graders, report §4 policy, snapshots).
- `packages/tech/src/vendors/llm/types.ts` — the port style to mirror; add a
  `ComputerUseClient` port (observe/act loop) here, provider-neutral.
- `packages/tech/src/research/domain/site.ts` — `publishedResearchTopics`;
  the topic's EN/JP titles and sidebar order live here (title == sidebar label).
- `packages/tech/TEMPLATE.md` — topic subfolder shape (domain / entrypoints / vendors).
- `packages/tech/src/image-generation/` (once built) — closest precedent for a
  non-text topic with fixture/estimate/real modes and a rubric manifest.

## Implementation Steps (on approval)

1. `src/computer-use/domain/` — pure logic: task-suite model, success-predicate
   evaluation, per-task metric aggregation, run shaping, report §4-policy render.
2. Add a provider-neutral `ComputerUseClient` port under `src/vendors/llm/` and
   anti-corruption adapters for Anthropic / OpenAI / Google computer-use tools,
   plus a **keyless deterministic fixture adapter** (records a canned action
   trajectory + screenshots so CI is byte-stable and offline).
3. A registry (`models.ts`-style) of the subject configs (ids/tool versions/
   prices web-verified, isolated for one-line correction), key-gated, fixture
   fallback when a key is absent.
4. Fixed Playwright harness wiring behind `vendors/`; the committed task-suite
   snapshot under `src/computer-use/domain/data/`.
5. Unit tests per public domain function incl. the disk-reading published-page
   guards; keyless fixture path green in CI.
6. Thin CLI runner wired into the unified `research` CLI with fixture / estimate
   / real modes; `--estimate` prints the cost figure.
7. Published EN page + JP translation through `site.ts` shared metadata; run the
   guards (title==sidebar-label, no-mermaid, §4 budget, 7-section outline).
8. Record the dependency in `docs/dependency-decisions.md`.
9. **Owner-triggered** first real trial within the $40 ceiling (guideline §Step 3),
   committed as a dated history frame with the design-validation review; then
   confirm or revise the quarterly cadence.

## Considerations

Reuse the existing instrument patterns; do not fork a parallel design. Keep the
three vendor computer-use SDKs behind `vendors/` anti-corruption adapters. The
keyless fixture path must keep CI green and deterministic (no network, no
browser launch in CI — record trajectories). Honour the proposal-first gate: the
real (paid) trial is owner-triggered only.

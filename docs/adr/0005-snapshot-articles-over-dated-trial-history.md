# 0005 — Snapshot articles over dated uniform trial history

## Context

The repository exists for living research: recurring measurements that answer
"how much better is the new option than what we use now" as the AI/IT landscape
moves. Two pressures shaped this decision. First, research articles are read by
AI agents as context, so the page a reader (human or agent) reaches first must
stay small; today's sidebar pages are full reports whose size grows with every
detail added. Second, recurring runs already accumulate dated frames under
`docs/research-reports/history/<topic-id>/<timestamp>/` (ticket `20260709190517`,
commits `0a7c5f8`/`c7072d1`), and the availability topic keeps an accumulating
committed status-history database with 30/90-day trends — but no surface
summarizes several months of frames into tendencies. The initiation side had the
same gap: `packages/tech/TEMPLATE.md` starts at scaffolding, assuming someone
already decided cadence, subjects, metrics, and cost, and no document said who
decides them or how.

## Decision

Each published topic has two article surfaces with distinct jobs:

- **Snapshot** — the sidebar page. Renderer-produced from shared metadata
  (`publishedResearchTopics` in
  `packages/tech/src/research/domain/site.ts`) and the dated frames within a
  3–5-month tendency window. It describes tendencies and links to each dated
  frame; it is capped at 1,500 tokens (6,000 characters at the
  4-characters-per-token approximation, SVG markup excluded).
- **Uniform trial reports** — the dated frames. Full detail, each keeping the
  standard 7-section outline enforced by
  `packages/tech/src/research/domain/article-outline.ts`. Frames accumulate
  and are never overwritten or rewritten.

Topic initiation follows the proposal-first protocol in
`docs/research-development-guideline.md`: an agent turns a terse developer idea
into a proposed cadence, subject set, metric set, cost/trial-count range with
premises, and accumulated-history plan; the developer approves before any paid
run; the first trial validates the design before a cadence is committed.

## Alternatives considered

- **Keep the full report as the sidebar page** (status quo): rejected — the
  first-reached page grows unboundedly and costs agents context on every
  consultation, and no page states multi-month tendencies.
- **Snapshot as a hand-written summary**: rejected — hand-written parallel
  content drifts from the frames and violates the single-source rule
  (order, labels, and content derive from `site.ts` metadata and generated
  artifacts).
- **A fixed trial count instead of a proposed range**: rejected — statistical
  reliability versus cost is a per-topic tradeoff; a hard-coded N hides the
  premises the developer is agreeing to (cost-estimation policy).

## Consequences

- The sidebar stays cheap to load for agents; detail remains one link away in
  dated frames whose format is uniform across topics and dates.
- Recurring runs become append-only history: run → archive frame → regenerate
  snapshot and indexes, all through the existing `npm run research*` scripts.
- Site tooling must carry per-topic research-design metadata (cadence,
  subjects, metrics, trial-count range, cost budget) and a snapshot renderer
  with a machine-checked compactness budget; ADR 0004's topic anatomy and the
  7-section outline are unchanged for the trial reports themselves.
- New topics gain a step 0 before `TEMPLATE.md`'s recipe: the proposal-first
  protocol.

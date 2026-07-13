---
title: Research development guideline
description: How a terse research idea becomes a recurring topic with a compact snapshot article over dated uniform trial reports.
---

# Research development guideline

This guideline defines how a research topic is initiated and how its published
article is structured. It is written for the AI agents that do the initiation
work and for the developers who approve it. The structural decision it applies
is recorded in [ADR 0005](./adr/0005-snapshot-articles-over-dated-trial-history);
the per-topic build recipe remains `packages/tech/TEMPLATE.md`.

## Vocabulary

One concept, one word (see the [Glossary](./glossary)):

| Term                 | Meaning                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trial                | One full execution of a topic's measurement (`npm run research -- <topic> --real`), producing a data artifact and a report at a point in time.                       |
| uniform trial report | The dated frame a trial leaves under `docs/research-reports/history/<topic-id>/<timestamp>/`: the full English report, the `data.json` artifact, and the Japanese translation, in the same format every time. |
| cadence              | The agreed interval between recurring trials of a topic (for example, monthly).                                                                                      |
| tendency window      | The span of recent trials a snapshot summarizes: the last 3 to 5 months.                                                                                             |
| snapshot             | A topic's sidebar page: the latest, compact view describing tendencies over the tendency window and linking to each uniform trial report. Subject to the compactness budget below. |

## Proposal-first protocol

A developer offers only a terse idea — something to prove, or a solution to
compare against what is in use. The developer does not write the research
design. The agent derives it and proposes it for approval before building
anything.

### Step 1 — investigate

Read the existing topic set (`publishedResearchTopics` in
`packages/tech/src/research/domain/site.ts`) and the relevant result pages to
determine whether the idea extends an existing topic or starts a new one.
Extending an existing topic is a change to that topic's subjects or metrics;
starting a new one follows `packages/tech/TEMPLATE.md` after this protocol.

### Step 2 — propose

Present a proposal containing exactly these five elements:

1. **Cadence** — how frequently the trial recurs, with the reason (how fast the
   measured landscape changes). State what event, if any, triggers an
   off-cadence trial (for example, a new model release).
2. **Comparison subjects** — what is compared, enumerated. For model topics,
   the subject set derives from the foundation-models catalog topic.
3. **Metrics** — the indicators the comparison is decided by, each with its
   unit and the direction that reads as better.
4. **Cost and trial count** — the estimated cost per trial and the number of
   in-trial repetitions, expressed as a range with stated premises, never a
   single figure. Name the tension explicitly: more repetitions narrow the
   variance (the artifact records the standard deviation) but raise cost.
   Run the topic's `--estimate` path for the cost figure. Precedent: the
   llm-model-comparison real sweep measured 3 repetitions for about $46.
5. **Accumulated history** — the time series the recurring trials build: which
   metric per subject becomes a `HistoryPoint` series, and what the snapshot's
   trend chart will show after several trials.

The developer approves or adjusts the proposal. No paid run and no scaffolding
happens before approval.

### Step 3 — first trial as validation

The first trial is a disposable proof of the design, not a commitment to the
cadence. After it runs, review whether the metrics discriminate between
subjects and whether the cost matched the estimate; then confirm or revise the
cadence. Only from the second trial on is the topic recurring.

### Step 4 — recur

Each cadence tick repeats the same loop, unattended in execution but
human-approved in initiation:

```sh
# from packages/tech
npm run research -- <topic> --real
npm run research:archive -- <topic> --generated-at <iso>
npm run research:site -- write-indexes
```

The archive step appends a new dated frame; existing frames are never modified
(see ADR 0005). The snapshot regenerates from the frames in the tendency
window.

## Article structure

Each published topic has two surfaces:

- **The snapshot** is the page reached from the sidebar. It is
  renderer-produced from the topic's shared metadata and its dated frames —
  never hand-edited — and describes the tendencies over the tendency window:
  what moved, what held, which subject leads on which metric. It embeds the
  trend chart (`renderTimeSeriesChart` in
  `packages/tech/src/research-report/domain/chart.js`) and links to every
  uniform trial report it summarizes. It does not carry exhaustive
  per-trial numbers.
- **The uniform trial reports** carry the detail. Each keeps the standard
  7-section outline enforced by
  `packages/tech/src/research/domain/article-outline.ts` (Research Purpose,
  Measurement Targets, Scope and Constraints, Verification Results, Analysis,
  Reproduction, Verification Data), so every dated report of every topic reads
  the same way. They live under
  `docs/research-reports/history/<topic-id>/<timestamp>/` and accumulate;
  a past frame is never overwritten. The availability topic's committed
  status-history database (`docs/research-reports/availability-history/`)
  is the same accumulate-and-summarize pattern applied to externally observed
  data.

Sidebar order and labels come from `publishedResearchTopics` in `site.ts` and
the generated indexes (`npm run research:site -- write-indexes`); no surface
carries a hand-written topic list. Japanese pages follow through
`npm run research:translate-report -- <topic>`.

## Snapshot compactness budget

Snapshots are loaded into LLM context windows when agents consult this
research, so their size is capped:

- **Budget: 1,500 tokens** under the 4-characters-per-token approximation the
  insights cost estimate already uses — that is, **6,000 characters** of
  Markdown, frontmatter included, SVG chart markup excluded.
- Check: `wc -c` on the snapshot file with embedded `<svg>` elements stripped;
  the result must be at most 6,000.
- The budget is roughly double `INSIGHTS_OUTPUT_TOKENS` (700, in
  `packages/tech/src/research/domain/insights.ts`), which bounds one trial's
  analytical prose; a snapshot spans a whole tendency window and gets twice
  that room, no more. Detail beyond the budget belongs in the trial reports.

## Worked example — llm-speed

**Terse idea:** "I want to keep knowing which model answers fastest."

**Step 1 — investigate.** The `speed` topic exists in
`publishedResearchTopics` (result page
`docs/research-reports/llm-speed-comparison.md`, runner
`npm run research -- speed --real`), with dated frames already under
`docs/research-reports/history/speed/`. The idea maps to the existing topic;
the protocol produces its recurrence design rather than a new topic.

**Step 2 — propose.**

1. *Cadence:* monthly. Providers ship new model versions on a weeks-to-months
   rhythm; a monthly trial bounds how stale the snapshot can be. A major model
   release triggers an off-cadence trial.
2. *Subjects:* the models enumerated in the foundation-models catalog topic
   (`docs/research-reports/foundation-models.md`) — the same registry the
   speed topic already measures.
3. *Metrics:* time-to-first-token (ms, lower is better), sustained throughput
   (tokens/s, higher is better), total latency (ms, lower is better) — the
   metrics the topic's artifact already records.
4. *Cost and trial count:* run `npm run research -- speed --estimate` before
   each real run. Premises: one trial exercises every catalog model; 1–3
   in-trial repetitions per model. One repetition detects only large
   movements; three bound the run-to-run variance the artifact reports as
   standard deviation. Expected range for three repetitions is in the tens of
   dollars (the llm-model-comparison precedent measured ~$46); the estimate
   decides, and an estimate outside the agreed range stops for re-approval.
5. *Accumulated history:* per-model `HistoryPoint` series for each metric,
   one point per monthly frame. After three or more frames, the snapshot's
   trend chart shows per-model latency and throughput movement across the
   tendency window.

**Steps 3–4.** The next real run validates the design; each later cadence tick
appends a frame under `docs/research-reports/history/speed/<timestamp>/` and
regenerates the snapshot at `docs/research-reports/llm-speed-comparison.md`:
a tendency narrative and trend chart within the compactness budget, linking to
every dated frame in the window.

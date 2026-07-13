---
title: Research development guideline
description: How a terse research idea becomes a recurring topic published as a dated series of survey articles.
---

# Research development guideline

This guideline defines how a research topic is initiated and how its published
article is structured. It is written for the AI agents that do the initiation
work and for the developers who approve it. The structural decision it applies
is recorded in [ADR 0006](./adr/0006-dated-survey-article-series) (which
supersedes ADR 0005's "snapshot" split); the per-topic build recipe remains
`packages/tech/TEMPLATE.md`.

Each published topic is a **dated series of survey articles**: the stable
per-topic slug always holds the latest survey's article, and every article
embeds its trend through that survey (§4) and links to all past surveys (§7).
When a new survey runs, a new article is created and becomes the current page;
the previous articles stay reachable at their dated slugs.

## Vocabulary

One concept, one word (see the [Glossary](./glossary)):

| Term                 | Meaning                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trial                | One full execution of a topic's measurement (`npm run research -- <topic> --real`), producing a data artifact and a report at a point in time.                       |
| uniform trial report | The dated frame a trial leaves under `docs/research-reports/history/<topic-id>/<timestamp>/`: the full English report, the `data.json` artifact, and the Japanese translation, in the same format every time. |
| cadence              | The agreed interval between recurring trials of a topic (for example, monthly).                                                                                      |
| tendency window      | The span of recent trials the current article's trend chart covers: the last 3 to 5 months.                                                                          |
| current article      | A topic's page at its stable slug: the latest survey's 7-section article plus a 推移 (trend) block over the tendency window and a 過去の調査 (past surveys) links block. Replaced by the next survey's article; the old one stays at its dated slug. |

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

The archive step appends a new dated survey; existing surveys are never
modified (see ADR 0006). The current article is regenerated from the latest
survey, and its trend + past-survey blocks pick up the newly archived survey.

## Article structure

Each published topic is a dated series of survey articles with one shape:

- **The current article** is the page at the topic's stable slug. It is the
  latest survey's standard 7-section article (Research Purpose, Measurement
  Targets, Scope and Constraints, Verification Results, Analysis, Reproduction,
  Verification Data — enforced by
  `packages/tech/src/research/domain/article-outline.ts`), composed with two
  cross-survey blocks by
  `packages/tech/src/research/domain/current-article.ts`:
  - a **推移 / Trend** block in §4 that embeds the trend chart
    (`renderTimeSeriesChart` in
    `packages/tech/src/research-report/domain/chart.js`) over the tendency
    window (a plain note until two same-instrument surveys exist), and
  - a **過去の調査 / Past surveys** block in §7 linking every earlier dated
    survey, newest first.
- **The past surveys** are the earlier dated articles under
  `docs/research-reports/history/<topic-id>/<timestamp>/`. Each is a complete
  7-section article for its run; they accumulate and a past article is never
  overwritten. The availability topic's committed status-history database
  (`docs/research-reports/availability-history/`) is the same
  accumulate-and-summarize pattern applied to externally observed data.

The current article is generated in English and the Japanese current page is a
translation of it, so the two never fork. Sidebar order and labels come from
`publishedResearchTopics` in `site.ts` and the generated indexes
(`npm run research:site -- write-indexes`); the trend + past-survey blocks are
composed by `npm run research:site -- compose-current-articles`, which the
`research -- <topic> --real` pipeline also runs before translating. No surface
carries a hand-written topic list.

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
   rhythm; a monthly trial bounds how stale the current article can be. A major
   model release triggers an off-cadence trial.
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
   one point per monthly survey. After three or more surveys, the current
   article's 推移 (trend) block shows per-model latency and throughput movement
   across the tendency window.

**Steps 3–4.** The next real run validates the design; each later cadence tick
appends a dated survey under `docs/research-reports/history/speed/<timestamp>/`
and regenerates the current article at
`docs/research-reports/llm-speed-comparison.md`: the latest survey's 7-section
report plus the 推移 (trend) block and the 過去の調査 links to every earlier
dated survey in the window.

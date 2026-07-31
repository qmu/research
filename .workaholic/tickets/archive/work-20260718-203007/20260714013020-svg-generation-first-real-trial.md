---
created_at: 2026-07-14T01:30:20+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash: d2324fd
category: Added
mission: periodic-research-target-svg-generation-and-animation
depends_on: [20260714013000-svg-generation-build-runner-cli-and-pages.md]
---

# Run the owner-approved first real SVG-generation trial (guideline step 3)

## Overview

The proposal-first guideline's step 3: the first real trial is a disposable
validation of the design, not a commitment to the cadence. This ticket runs it
once — **owner-gated: requires explicit approval and API keys, and spends money**
— then reviews whether the metrics discriminate between subjects and whether the
cost matched the estimate, and archives the result as a dated survey frame.

## Key Files

- `packages/tech/src/svg-generation/run.ts` — `estimateSvgGeneration` / `runSvgGeneration`.
- `docs/research-development-guideline.md` — step 3 (design validation) and step 4 (recur).

## Implementation Steps

1. **Gate:** confirm owner approval and that the estimate is within the $5/trial ceiling (`npm run research -- svg-generation --estimate`). Stop for re-approval if above.
2. Run `npm run research -- svg-generation --real` with keys present.
3. Archive: `npm run research:archive -- svg-generation --generated-at <iso>`; regenerate indexes (`npm run research:site -- write-indexes`).
4. Write the design-validation review: do render-validity / animation-presence / fidelity / cost separate the four subjects? Confirm or revise the monthly cadence.
5. On the next `/ship`, reflect the new dated article to qmu-co-jp via the publish-ticket flow.

## Considerations

Do NOT run this unattended in a night batch — it is the one step the guideline
reserves for explicit human initiation. No persistent provider resources are
created; SVG is generated in memory and scored, so there is nothing to tear down.

## Policies

- 運用 (operation): the published EN/JP pages must render from the committed
  measured dated frame (the real-data source of truth), never from the keyless
  fixture placeholder; the frame's artifacts re-render the report later without
  re-spending.
- 実装 (implementation): honest per-cell provenance — a failing model is an
  `error` row with provenance, never a faked number; the keyless fixture path
  stays deterministic and byte-stable (`make drift`).
- 企画 (planning): proposal-first guideline step 3 — the first real trial is a
  disposable design validation held to the agreed $5/trial cost gate, gated on
  explicit owner initiation (the 2026-07-18 pre-flight approval).

## Quality Gate

- Estimate run first and total expected spend within the $5/trial ceiling.
- All four subjects `measured` (or honest `error` rows), committed as a dated
  frame with the design-validation review.
- Canonical EN/JP pages + data artifact composed from the measured frame
  (provenance guard green); `npm test` / `npm run build` / `npm run lint`
  exit 0 in `packages/tech`; `check-fixture-drift.sh` exit 0 post-commit.

## Final Report

Ran the owner-approved first real SVG-generation trial on the `svg` desk.

- **Money gate:** `--estimate` first = ~$0.4593 trial (all four subjects +
  fidelity-judge reads); full expected spend incl. insights + JP full-report
  translation ≈ $2.5, inside the $5/trial ceiling. Actual benchmark spend came
  in lower (~$0.25: generation-only $0.1137 + ~$0.13 for 20 judge reads); the
  whole trial stayed well under $1.
- **Trial:** `npm run research -- svg-generation --real` → 4/4 rows `measured`,
  zero `error` rows, instrument `svg-v2` (resvg-js@2 rasterizer, claude-sonnet-5
  vision judge). No instrument fixes were needed.
- **Frame:** archived at `docs/research-reports/history/svg-generation/2026-07-18T11-29-34-171Z/`
  (measured EN report, data artifact `fixture:false` / 4 measured rows, raw JP
  translation of the measured report, and `design-validation-review.md`). The
  JP frame page is a translation of the real EN report (staged canonical EN from
  `.real.md` before `research:translate-report`, so the frame carries a raw real
  JP with no series blocks — drift-stable).
- **Publish:** canonical EN/JP pages + data artifact recomposed from the
  measured frame via keyless `research -- svg-generation --fixture`
  ($0.0000); indexes regenerated. Provenance guard, all tech gates, and the
  fixture-drift check green.
- **Design validation:** four of five metrics discriminate (render validity,
  prompt fidelity, latency, path complexity); animation presence saturates at
  1.00 across all four subjects over only two animated prompts — flagged for a
  harder animated-prompt manifest bump. Monthly cadence confirmed. Details in
  the frame's `design-validation-review.md`.

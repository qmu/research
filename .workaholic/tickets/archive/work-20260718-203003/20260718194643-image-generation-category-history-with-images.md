---
created_at: 2026-07-18T19:46:43+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX, Infrastructure]
effort: 4h
commit_hash: cd2094a
category: Added
depends_on:
mission: image-generation-benchmark
---

# Image generation: category-based prompt manifest + persisted images, published with pictures

Owner request (2026-07-18): for the image-generation topic, accumulate
**historical prompt→image records across practical categories** — e.g.
presentation slide, photograph, character illustration, infographic, dense
meeting document — and make both `research.qmu.dev` (EN report) and
`qmu.co.jp` (JP article) able to explain the results **with the generated
images shown inline**.

## Current state (verified 2026-07-18)

- `packages/tech/src/image-generation/` scores mechanically checkable prompts
  (manifest v1: circles / stars / one cat / diamonds —
  `domain/manifest.ts`) and records only metrics; the generated image bytes
  are judged in memory (`run.ts` `byteLengthOfBase64`, judge vision read) and
  **discarded — no image is persisted anywhere**.
- One real dated frame exists:
  `docs/research-reports/history/image-generation/2026-07-17T00-53-39-901Z/`
  (data.json + EN/JP md + design-validation review, no images).
- Manifest v2 is already flagged in the mission changelog: adherence and
  text-accuracy saturated at 100%, so harder prompts are wanted anyway.
- The mission's remaining criterion (qmu-co-jp reflection via `/ship`
  publish ticket) currently ships **text-only** Markdown through
  `scripts/publish-research.sh copy --all` + `research:site -- qmu-ticket`;
  neither carries image assets.

## Goal

1. **Manifest v2 — practical categories.** Extend `ImagePrompt` with a
   `category` field and add one prompt per category: presentation slide,
   photorealistic photo, character illustration, infographic, dense meeting
   document (categories per owner request; keep the existing v1 prompts as a
   `mechanical` category so history stays comparable). Each new prompt keeps
   machine-checkable constraints (rubric questions) so scoring stays
   objective per the repo's evidence standard — the images themselves become
   the qualitative exhibit.
2. **Persist the generated images.** During a real run, write each generated
   image into the dated history frame, e.g.
   `history/image-generation/<ts>/images/<model>--<promptId>.<ext>`, and
   record the relative path + byte length + sha256 in the `.data.json` call
   record (full-record principle: the frame must be renderable at any detail
   level later). Fixture mode writes nothing new — it stays keyless and
   byte-stable.
3. **Render pages with images.** The EN report and JP translation embed the
   persisted images (relative Markdown image refs that resolve both in
   VitePress history frames and the current published page rendered FROM the
   measured frame). Respect the section-4 budget / 7-section outline guards;
   add a guard that every referenced image file exists on disk.
4. **Carry images to qmu-co-jp.** Extend the copy plan
   (`research:site -- copy-plan` / `qmu-ticket`) and
   `scripts/publish-research.sh` so image assets are copied next to the JP
   Markdown into `../qmu-co-jp` in whatever asset location its Astro build
   serves (the publish ticket tells qmu-co-jp where; that repo's `/drive`
   applies it).
5. **Repo-size discipline.** Committed images are part of the history DB —
   cap resolution/count (e.g. request the provider's smallest size, and/or
   re-encode to webp/jpeg under a per-image byte budget) and note the cap in
   the report's method section so growth per monthly frame stays bounded.

## Key files

- `packages/tech/src/image-generation/domain/manifest.ts` — prompt manifest (v2 here)
- `packages/tech/src/image-generation/domain/types.ts` — `ImagePrompt`, call records (add category, image path/hash)
- `packages/tech/src/image-generation/run.ts` — runner; image persistence hook
- `packages/tech/src/image-generation/domain/report.ts` — EN report rendering (embed images)
- `packages/tech/src/research/domain/site.ts` — shared metadata; copy-plan/qmu-ticket payloads
- `scripts/publish-research.sh` — corporate copy (extend for assets)
- `docs/research-reports/history/image-generation/` — dated frames

## Implementation steps

1. Types + manifest v2 (category field, five practical prompts with rubric
   constraints; keep v1 prompts under `mechanical`).
2. Runner: persist image bytes per call into the frame's `images/` dir; add
   path/sha256/byte length to the call record; fixture path unchanged
   (deterministic placeholder references only, no binary churn).
3. Report/JP rendering with inline images + existence guard; regenerate
   current published pages from the measured frame once a v2 real run lands.
4. Extend copy-plan/qmu-ticket/publish script for image assets.
5. Unit tests: manifest v2 shape, image-record fields, report embeds, guard.
6. Estimate (`--estimate`) for the v2 manifest (5 new prompts × 3 models ×
   trials + judge reads) — expect it to stay well under the $20 ceiling; get
   owner approval before the real run (proposal-first: build keyless first,
   gate only the paid run).

## Policies

- **proposal-first / owner-gated real run** — the keyless manifest-v2 build,
  image-persistence plumbing, and page rendering happen before approval; the
  paid v2 real run waits for an `--estimate` inside the $20 ceiling and the
  owner's explicit go (workaholic:development — overnight/quota rules).
- **workaholic:implementation** (anti-corruption-structure, domain-layer-
  separation, objective-documentation, test) — provider dialects stay inside
  `vendors/llm/*`; category scoring stays pure domain logic re-scorable from
  recorded data; reports state only mechanically verified facts, with the
  images shown as evidence, not opinion-scored.
- **workaholic:design** (history-structures, vendor-neutrality) — the dated
  frame is the accumulating history structure; the image record (path, sha256,
  bytes) keeps every frame renderable later without re-spending; all subject
  providers are treated symmetrically.
- **workaholic:operation** (ci-cd) — CI keeps running the keyless fixture path
  only; committed image assets are size-capped so the repo and the Astro copy
  stay deployable.

## Quality Gate

Acceptance criteria and how each is verified (all bare exit codes, per
package — never through `make test`):

- **Manifest v2 shape** — `cd packages/tech && npm test` passes new unit
  tests asserting: every prompt carries a `category`; the five practical
  categories (presentation-slide, photo, character, infographic,
  meeting-document) each have ≥1 prompt with ≥1 machine-checkable
  constraint; v1 prompts remain under `mechanical`.
- **Image persistence contract** — unit test over a recorded (fixture or
  replayed) run asserts each real-mode call record gains `imagePath`,
  `imageSha256`, `imageByteLength`, and that `research:archive` moves the
  frame's `images/` directory with the frame.
- **Fixture stability** — running the fixture path twice yields byte-identical
  report output (existing byte-stable guard extended to cover v2), with no
  binary files written.
- **Report embeds resolve** — a disk-reading guard test walks every image
  reference in the current EN/JP published pages and the newest history
  frame and asserts the file exists; existing title==sidebar-label,
  no-mermaid, section-4 budget, and 7-section outline guards stay green.
- **Type-check + lint** — `cd packages/tech && npm run build && npm run lint`
  exit 0.
- **Paid-run gate** — `npm run research -- image-generation --estimate`
  printed and confirmed under the $20 ceiling with owner approval recorded in
  the mission changelog before any `--real` v2 run; the run lands as a dated
  frame with images committed.

## Considerations

- Judge rubric for practical categories must stay mechanically answerable
  ("does the slide contain exactly 3 bullet points?", "is there a headline
  bar chart?") — no aesthetic opinion scoring (mission out-of-scope stands).
- Image persistence changes the archive contract — update
  `research:archive` so `images/` travels with the frame.
- qmu-co-jp side work happens only via the publish ticket, never by editing
  that repo directly.
- Verify per package (`cd packages/tech && npm test`), never through
  `make test` (masked exit codes).

## Final Report

Implemented the full keyless build; the one owner-gated item (the paid v2 real
run) is handed off to a minted follow-up. Commit `cd2094a`.

**Delivered**

1. **Manifest v2 — categories.** `ImagePrompt` gains a `category`
   (`domain/types.ts`); `PROMPT_MANIFEST` is version `2`, the eight v1 prompts
   stay `mechanical`, and one rubric-constrained prompt was added per practical
   category (presentation-slide, photo, character, infographic,
   meeting-document). Guarded by `domain/manifest.test.ts`.
2. **Image persistence (real runs only).** New `domain/image-store.ts` writes
   each practical-category image and records `imagePath` + `imageSha256` +
   `imageByteLength` in the call record (`domain/types.ts`
   `ImageGenCallRecord`). The runner persists only when handed a
   `persistImagesDir` (`run.ts`), which the entrypoint sets for `--real` only —
   so the fixture path writes no binaries and stays byte-stable. Mechanical
   probes are judged and discarded (bounded frame growth); a per-image size
   budget is documented in the report method section. Covered by
   `image-store.test.ts` and `run.test.ts`.
3. **Report renders images + existence guard.** `domain/report.ts` renders an
   inline gallery in §7 (bold labels only — the 7-section H2/H3 outline stays
   intact) embedding only persisted images. `markdownImageRefs` +
   `research/published-images.test.ts` walk every embedded ref on the current
   pages and history frames and assert it resolves on disk (vacuously green
   until a v2 real run lands). `report.test.ts` covers the gallery and the
   fixture no-refs byte-stability.
4. **Archive + publish carry images.** `archive-runner.ts` moves a real run's
   `*.real.images/` into the dated frame's `images/`;
   `current-article-runner.ts` mirrors a frame's `images/` beside the current
   pages during measured-frame composition; `site.ts` `imageAssetPublishPlan`,
   the qmu ticket payload, and `scripts/publish-research.sh` carry the image
   directories to qmu-co-jp for both language sections. Covered by
   `archive-images.test.ts` and `domain/site-images.test.ts`.

**Quality Gate status** — all keyless items green, verified per package with
bare exit codes: `npm run build` (0), `npm run lint` (0), `npm test` (0, 84
files / 593 tests). Fixture path byte-identical across two runs with no binaries
written; `make drift` byte-stable. §4 budget, title==sidebar, no-mermaid,
7-section outline guards stay green. The **Paid-run gate** item is owner-gated
and NOT executed here: `--estimate` prints ~$1.47 generation (3 models × 13
prompts × 1) well under the $20 ceiling — the real run is minted as
`20260718205443-image-generation-v2-real-trial.md`.

**Not done here (by design)** — the paid v2 real trial (owner-gated) and the
qmu-co-jp reflection (next `/ship`). The two mission v2 Acceptance items stay
unticked because they complete only when a real run persists images and the
pages actually render them; the plumbing is built and green.

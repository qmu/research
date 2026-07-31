---
created_at: 2026-07-21T12:00:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category: Changed
depends_on:
mission:
---

# Make the OCR comparison actually discriminate model capability, using GENERATED hard inputs

## Overview

**Problem (owner):** the OCR comparison "insights" do not meaningfully examine
model capability. On standard/easy images and PDFs today's OCR-capable models all
score near-perfect, so the comparison does not separate them — "no actual model is
examined." A periodic comparison whose subjects all read ~100% tells the reader
nothing about which is better.

**Fix:** run the comparison on a corpus of **hard, hard-to-machine-read inputs**
that genuinely spread the models. Real hard documents cannot be used (licensing,
privacy, and reproducibility), so the corpus is **generated** — and because we
generate it, the **ground-truth text/structure is known exactly**, enabling strict
scoring.

**Hard-input classes to generate (owner-named):**
- **Low-quality / "jaggy"** — low-resolution PDF/DOCX rasterizations, compression
  and scan-like degradation artifacts.
- **High character density** — dense, small-type text pages.
- **Complex structure** — tables containing nested data structures.

The result: a discriminating, periodic OCR result that says which model is actually
better, per hard class.

**Cross-topic link:** the "best OCR model" this identifies becomes the **judge for
the image-generation `readability` metric** (OCR read-back) — see
`20260721120005-image-generation-readability-ocr-readback.md`. Generation makes the
hard test corpus here; there, the image models under test generate and this OCR
winner reads them back. Keep the two coherent.

**Scope decisions (developer, at ticket time):**
- Reach = the `ocr` topic (domain generator + scoring + report + site metadata).
  A **generated hard-input corpus** with committed ground truth is the new core.
- Because periodic comparison needs a **stable** corpus, generation is
  deterministic and the corpus (or its seed + generator) is committed and
  **versioned** (a manifest version, like the image-generation prompt manifest) —
  a moving corpus would break cross-run history.
- **Proposal-first gate** (`CLAUDE.md`, `docs/research-development-guideline.md`):
  real OCR runs are billable, so the paid run is proposal-gated and priced with
  `--estimate`; the **keyless scaffold** (generator + fixture readers + report) is
  built pre-approval. See [[proposal-first-gate-blocks-spend-not-scaffold]].

## Policies

- `workaholic:implementation` / `objective-documentation` — the inputs must be
  **provably hard**: the report states, per class, how far the models actually
  spread (a class where every model still scores ~100% is not discriminating and is
  flagged, not published as a result). Ground truth is exact because the corpus is
  generated.
- **No fabrication — provenance load-bearing.** Every score is a real read against a
  known ground truth (or an honest `fixtured` placeholder on the keyless path);
  never a synthesized number.
- `workaholic:design` / history-structures — the hard corpus is **versioned and
  committed** so a dated frame is reproducible and history only connects
  same-corpus-version points.

## Implementation Steps

1. **Proposal-first design.** Define the hard-input classes (jaggy/low-res,
   high-density, nested-table), how many variations each, how ground truth is
   produced, the scoring metrics (character/word accuracy; structure/table fidelity
   for the nested-table class), cadence, and a cost/`--estimate` range. Owner
   approval before any billable run.
2. **Deterministic hard-input generator.** Build a reproducible generator with
   known ground truth: low-res/jaggy via controlled downscale + compression/scan-
   like degradation; high-density via dense text layout; nested tables via
   structured rendering to an image/PDF. Commit the generator + a versioned corpus
   manifest; keyless fixtures are byte-stable.
3. **Score against ground truth.** Run the OCR subjects on the hard corpus and score
   text accuracy and (for the structured class) structure fidelity against the
   known ground truth. Keyless path uses fixture readers.
4. **Report the discrimination.** Render which model wins per hard class and by how
   much; surface the spread explicitly (the point is separation, not a leaderboard
   of ~100%s). Honest provenance per cell.
5. **Expose the winner for cross-topic use.** Make "the best OCR model" a defined,
   machine-readable output of the latest OCR frame, so the image-generation
   readability metric can consume it (not a hardcoded name).
6. **Real trial (proposal-gated).** After approval, `--estimate` then the real run
   within the ceiling; archive a dated frame; regenerate EN/JP pages.

## Quality Gate

- The published result **discriminates**: the hard classes produce a real spread
  across models (not all ~100%); any non-discriminating class is flagged as such,
  not dressed up as a finding.
- Ground truth is exact (generated corpus); every real score is a genuine read, no
  fabricated cells; keyless path renders deterministically (re-run → byte-identical).
- The hard corpus is **versioned + committed**; history connects only same-version
  frames.
- "Best OCR model" is emitted as a defined output of the latest frame for the
  image-generation readability metric to consume.
- Per-package bare exit codes green, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )` — never `make test`/`make lint`.

## Considerations

- **Don't conflate with image-generation readability.** Here, generation produces
  the TEST CORPUS (inputs to OCR). There, the image models under test generate and
  the OCR winner judges them. Same "hard document" theme, opposite roles.
- **Reproducibility over novelty.** A periodic comparison needs a stable corpus;
  regenerating different hard images every run would make history meaningless.
  Version the corpus; only bump the version deliberately.
- **Degradation realism.** Jaggy/low-res should mimic real scan/compression
  artifacts (not just Gaussian noise) so the difficulty is representative.
- **Plain language.** Follow the terminology standard from the plain-language sweep
  ticket in the article prose.

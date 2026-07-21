---
created_at: 2026-07-21T12:00:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category: Added
depends_on:
mission:
---

# Add a qualitative "readability" metric to image-generation — text-document output judged by OCR read-back

## Overview

The `image-generation` topic today measures generation latency, prompt adherence
(rubric), and text-rendering accuracy (short exact-text via a fixed vision judge).
The owner wants a new, more **qualitative** metric — **readability** (a.k.a. how
"real"/usable the output is): can a model generate a **usable text-heavy document
image — a pitch-deck slide or an infographic — where the embedded text is
legible?**

**Scoring (owner-chosen: OCR read-back).** Generate a text-heavy document image
with **known intended text**, then run the **best OCR model** — the winner from the
OCR comparison — to read the text back; **readability = how much of the intended
text is correctly/legibly recovered.** The judge is therefore not hardcoded: it is
whatever the OCR comparison currently ranks best (cross-topic link to
`20260721120004-ocr-discriminate-with-generated-hard-inputs.md`).

This is **distinct from the existing text-rendering-accuracy metric** (short exact
strings): readability is the holistic legibility of a **dense** text document, which
is where image models actually struggle and separate.

**Scope decisions (developer, at ticket time):**
- Reach = the `image-generation` topic (prompt manifest + domain + report + site
  metadata). A new **text-document prompt class** (pitch-deck slide / infographic
  with known intended text) and the **readability** metric (OCR read-back score).
- The readability judge = **the OCR comparison's current best model**, read from the
  latest OCR frame's emitted "best OCR model" output — never a hardcoded name; record
  which OCR model/version judged each frame.
- Owner chose **OCR read-back** as the scoring method; a separate vision-rubric
  "reality/layout" dimension is explicitly out of scope for now (possible later
  addition).
- **Proposal-first gate**: real runs (image generation + the OCR judge) are billable
  → proposal-gated and priced with `--estimate`; the **keyless scaffold** (new prompt
  class + fixture OCR reader + report wiring) is built pre-approval.

## Policies

- `workaholic:implementation` / `objective-documentation` — readability is a real,
  reproducible number: intended text is known (we author the prompt), and the score
  is the OCR-recovered fraction against that known text. No subjective hand-scoring.
- **No fabrication — provenance load-bearing.** A row is `measured` only when a real
  image was generated AND really read back by the OCR judge; otherwise `fixtured`/
  `error`, labelled, never synthesized.
- `workaholic:design` — the judge tracks the OCR comparison winner (one source of
  truth for "best OCR model"), so the two topics stay coherent and the readability
  metric improves automatically as OCR models improve.

## Implementation Steps

1. **Proposal-first design.** Define the text-document prompt class (pitch-deck /
   infographic prompts with authored intended text), the readability scoring (OCR
   read-back recovery fraction), the judge-selection rule (consume the OCR frame's
   "best OCR model"), cadence, and a cost/`--estimate` range. Owner approval before
   any billable run.
2. **New prompt class + manifest bump.** Add the text-document prompts (with known
   intended text as ground truth) to the image-generation prompt manifest; bump the
   manifest version so history only connects same-version frames.
3. **Readability metric via OCR read-back.** For each generated image, run the OCR
   winner and score recovered-vs-intended text. Keyless path uses a fixture OCR
   reader (byte-stable, no key, no spend); the judge identity/version is recorded.
4. **Consume the OCR winner, don't hardcode.** Read "best OCR model" from the latest
   OCR frame's emitted output (the OCR ticket exposes it). Record it per frame.
5. **Fold into the report + site.** Add readability to §4/§7, the site metrics, the
   image-generation snapshot extractor, and history — distinct from the existing
   text-rendering-accuracy metric, not a rename of it.
6. **Real trial (proposal-gated).** After approval, `--estimate` then the real run
   within the owner-approved ceiling; archive a dated frame; regenerate EN/JP pages.

## Quality Gate

- Readability is scored by **OCR read-back** using the OCR comparison's current best
  model (read dynamically, not hardcoded); the judge model/version is recorded per
  frame.
- The metric is **distinct** from text-rendering-accuracy (dense document legibility,
  not short exact-string match) and both remain present.
- Keyless path renders deterministically (re-run → byte-identical); every `measured`
  readability row is a real generate + real OCR read; no fabricated cells.
- Real trial priced with `--estimate` and run only within the owner-approved ceiling
  (proposal-first honored).
- Per-package bare exit codes green, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )` — never `make test`/`make lint`.

## Considerations

- **Cross-topic coupling is the point.** The readability judge = the OCR winner from
  the hard-input OCR comparison, so image-generation readability rides on genuinely
  discriminating OCR. Record the coupling (which OCR model/version judged) in each
  frame so a later reader can trace it.
- **Opposite generation role vs the OCR ticket.** Here the image models under test
  produce the document; the OCR winner judges. In the OCR ticket, generation makes
  the test corpus that ranks OCR models. Keep them separate but linked.
- **"reality" beyond text.** The owner framed this as readability *or* reality;
  OCR read-back covers text legibility. A vision-rubric layout/"looks-real"
  dimension can be added later if OCR-recovery alone under-captures usability.
- **Plain language.** Follow the terminology standard from the plain-language sweep
  ticket in the article prose.

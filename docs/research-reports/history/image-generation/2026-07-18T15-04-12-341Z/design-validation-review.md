# Design-validation review — manifest v2 first real trial (guideline step 3)

Trial: `2026-07-18T15:04:12.341Z`, 1 repetition, prompt manifest **v2** (13
prompts: 8 `mechanical` shape/text probes + 5 practical categories —
presentation-slide, photo, character, infographic, meeting-document), judge
`claude-sonnet-5`. **2/3 subject rows `measured`, 1 `error`** (honest, not
faked). 10 practical-category images persisted (5 GPT Image 1.5 + 5 Grok
Imagine); mechanical probes judged and discarded per `shouldPersistImage`.

## Did the measurement work as designed?

Mostly. The manifest-v2 plumbing behaved exactly as built: practical-category
images were generated, persisted into the frame's `images/` directory with
`imagePath` + `imageSha256` + `imageByteLength` recorded per call, and the EN/JP
pages now render them inline. The mechanical probes recorded scores without
persisting bytes, as designed.

One subject failed as an honest error row rather than being faked:

- **Gemini 2.5 Flash Image returned no image** — `Error: image generation
  returned no image (gemini-2.5-flash-image)`. The same model id measured
  cleanly in the v1 trial on 2026-07-17, so this is a regression in the
  provider's response (empty candidate / changed response shape) rather than a
  bad model id caught pre-run. Per the owner-gated cost policy the real run was
  not repeated to chase it; the row is recorded as `error` with the message
  preserved, and the fix (harden the Google image ACL against an empty/blocked
  response, then re-verify the id) is left to a follow-up ticket. This is the
  registered `model-ids-require-periodic-live-verification` concern recurring on
  the response side.

Registry ids/prices were re-checked before the run and left unchanged from the
2026-07-17 verification (gpt-image-1.5 $0.034, gemini-2.5-flash-image $0.039,
grok-imagine-image $0.020), consistent with the two providers that measured.

## Did the metrics discriminate between subjects?

Yes — better than v1, which was the whole point of the manifest bump. v1
saturated adherence and text accuracy at 100% for every model; v2's practical
categories separate the models:

- **Prompt adherence now discriminates:** GPT Image 1.5 95.5% ± 10.1% (n=11)
  versus Grok Imagine 100.0% ± 0.0% (n=11). The non-100% GPT score localizes
  which practical constraints a flagship model still misses (e.g. exact bullet
  counts / bar counts), which v1 never surfaced.
- **Generation latency discriminates clearly:** Grok Imagine 5346 ± 876 ms
  versus GPT Image 1.5 18085 ± 6170 ms (n=13 each). GPT's latency rose sharply
  from v1 (11689 ms) because the practical prompts render far denser images.
- **Text render accuracy still saturates** at 100% for both measured models
  (n=2), so the exact-text probes remain easy for 2026 flagships; that is a
  known ceiling, not a v2 defect.

## Did the cost match the estimate?

Yes, and it came in under estimate because one subject errored. Estimate was
~$1.47 generation (3 models × 13 prompts) plus insights and the full-report JP
translation (~$3.5 all-in against the $20/trial ceiling). Actual:

- Generation (billed per returned image at catalog price): GPT 13 × $0.034 +
  Grok 13 × $0.020 = **$0.70**; Gemini returned no image and was not billed for
  a delivered image.
- Judge reads: 26 delivered images × ~$0.0066 ≈ **$0.17**.
- Insights (1 call) ≈ **$0.02**; the full-report JP translation ran twice — once
  inline on the real pipeline (against the pre-existing page) and once against
  the measured v2 report to produce the frame's Japanese page — together ≈
  **$0.2–0.4** at the reports' actual output length.

Full trial ≈ **$1.1–1.3**, well inside the $20/trial ceiling.

## Per-image byte budget

The documented per-image target is 512 KiB (`IMAGE_BYTE_BUDGET`). Grok's five
JPEGs all sit under it (73–311 KiB). GPT Image 1.5 returned two PNGs **over**
budget — photo-red-apple 1.40 MB and infographic-growth-bars 1.47 MB — with the
other three between 210–387 KiB. Per the store's "never silently drop evidence"
rule the oversized images are persisted as returned (their SHA-256 is the
evidence); the total committed frame `images/` directory is ~4.6 MB for this
monthly frame. The budget remains a target, not a hard cap; if PNG size becomes
a repository-growth problem a follow-up can request a smaller GPT size tier or
add a lossless-recompress step that preserves the recorded bytes' provenance.

## Cadence

Monthly cadence confirmed (no revision). The v2 adherence/latency spread
justifies the recurring series; the off-cadence trigger (a model release or
retirement at a covered provider) stands, and the Gemini regression is exactly
the kind of change the series is meant to catch.

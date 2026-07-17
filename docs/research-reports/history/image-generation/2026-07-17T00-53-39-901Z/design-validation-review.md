# Design-validation review — first real trial (guideline step 3)

Trial: `2026-07-17T00:53:39.901Z`, 1 repetition, prompt manifest v1 (8 prompts:
6 rubric, 2 exact-text), judge `claude-sonnet-5`. 3/3 subject rows `measured`.

## Did the measurement work as designed?

Yes, after two instrument fixes made during the trial (both committed):

- **Registry drift (pre-run check):** OpenAI's listed per-image price for
  `gpt-image-1.5` at 1024x1024 medium is $0.034, not the $0.04 recorded on
  2026-07-13 (source: the official model page). Fixed in the registry before
  the run; Google $0.039 and xAI $0.02 re-verified unchanged
  (concern: model-ids-require-periodic-live-verification — confirmed useful).
- **xAI dialect (found by the run):** the OpenAI-compatible Images adapter
  failed against xAI twice — `400 "Argument not supported: size"`, then the
  vision judge rejected the image because Grok returns JPEG while the adapter
  hardcoded `image/png`. Fixed in the ACL (`vendors/llm/openai.ts` dialect
  switches + magic-byte MIME sniffing, `vendors/llm/xai.ts`); only the errored
  subject was re-run, so the two measured rows were not re-billed.

## Did the metrics discriminate between subjects?

Partially.

- **Generation latency discriminated clearly:** Grok Imagine 4976±535 ms,
  Gemini 2.5 Flash Image 6526±1717 ms, GPT Image 1.5 11689±885 ms (n=8 each).
- **Prompt adherence and text render accuracy did NOT discriminate:** every
  model scored 100.0% on all 6 rubric prompts and both exact-text prompts.
  Manifest v1 is too easy for the 2026 flagship image models. A manifest v2
  with harder mechanically checkable constraints (larger object counts,
  compound spatial relations, longer/punctuated exact strings) is the natural
  next instrument bump; per policy that starts a new comparability series.

## Did the cost match the estimate?

Yes. Estimate ~$0.90 for the benchmark; actual ≈ $0.93 including one wasted
Grok image ($0.02) from the dialect failure (generation ≈ $0.76: 8×$0.034 +
8×$0.039 + 9×$0.02; 24 judge reads ≈ $0.16). With the insights call and the
Japanese translations of the current page and this frame, the full trial spent
≈ $1.10 — well inside the $20/trial ceiling.

## Cadence

Monthly cadence confirmed (no revision). The latency spread and the manifest-v2
need both justify a recurring series; the off-cadence trigger (model release or
retirement at a covered provider) stands.

## Tooling gap noted for follow-up

`research:archive` copies the canonical (fixture-rendered) page and data
artifact into the dated frame, so a real trial's frame would carry fixture
numbers. This first frame was instead assembled from the `.real` outputs (the
frame's `.md`/`.data.json` are the measured report, and the frame's `.ja.md` is
a translation of that measured report). A follow-up should teach the archive
step to prefer the `.real` artifacts for this topic pattern.

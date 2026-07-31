---
created_at: 2026-07-21T11:54:26+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category: Added
depends_on:
mission:
---

# Expand token-metering with a usage-field survey (actual consumed input+output from API responses)

## Overview

The `token-metering` topic today answers one question: **predict the INPUT tokens a
prompt will bill for, without the provider's tokenizer library, and validate that
count against the number the provider's API reports** (`packages/tech/src/token-metering/domain/types.ts`).
This is a **pre-flight prediction** capability. It is input-only *by necessity* —
output tokens cannot be counted before the response is generated.

The owner identified a distinct, missing axis: the API response's **`usage` field**
reports the **actual consumed input AND output tokens**, post-hoc. The research
question: **does every provider / model / SDK expose such a field, and how** —
including agent-SDK-layer libraries and domain-specific LLMs like Perplexity?

These are two different capabilities that the current article conflates under
"input only":
- **Pre-flight prediction** (existing): predict input tokens before sending,
  tokenizer-independent.
- **Post-hoc actual usage** (this ticket): read consumed input + output from the
  response after the call.

**Option A (owner-chosen): expand the existing `token-metering` topic** with a
"usage-field survey" axis, rather than spinning up a separate topic. The article's
framing is corrected to make the two capabilities explicit.

**Known starting evidence:** the LLM comparison instrument already reads
`outputTokens` from every integrated provider's `CompletionResult`, so at least
output usage is demonstrably available across the integrated direct APIs. The
survey turns this into an explicit, per-subject, evidence-based result.

**Scope decisions (developer, at ticket time):**
- Reach = the `token-metering` topic (domain + report + site metadata) plus the
  article framing. The survey is a new **axis** within the topic, not a new topic.
- Subjects = the direct provider APIs (OpenAI, Anthropic, Google Gemini, xAI,
  Perplexity), at least one **agent-SDK layer** (e.g. the Agents SDK / whatever
  wrapper is integrated), and the domain-specific case (Perplexity, which bills
  search separately from tokens). Enumerate the exact subject list in the proposal.
- Metrics per subject: does the response report consumed **input** tokens? consumed
  **output** tokens? under **non-streaming** and under **streaming** (does streaming
  require an opt-in, e.g. OpenAI `stream_options: { include_usage: true }`)? does
  the **agent-SDK layer** preserve/aggregate it? which **extra fields** exist
  (cached-input tokens, reasoning tokens, Perplexity search units)?
- **Proposal-first gate applies** (`CLAUDE.md`, `docs/research-development-guideline.md`):
  a real survey makes billable API calls, so the paid run is proposal-gated and
  priced with `--estimate` first. The **keyless scaffold** (skeleton, fixture
  subjects, report renderer, article-framing fix) can be built pre-approval — see
  [[proposal-first-gate-blocks-spend-not-scaffold]].

## Policies

- `workaholic:implementation` / `objective-documentation` — the survey states, per
  subject, exactly which usage fields are reported, verified against a real
  response (or an honest fixture on the keyless path). No "generally supported"
  hand-waving; a cell is `reported` / `not-reported` / `opt-in-required` with the
  evidence.
- **No fabrication — provenance load-bearing.** A subject whose usage cannot be
  observed keylessly renders as a `fixtured` placeholder, never a synthesized
  "yes". Real cells come only from a real response.
- `workaholic:design` — the usage axis lives inside `token-metering` (Option A);
  the article makes the **pre-flight vs post-hoc** distinction explicit so the two
  are never conflated again.

## Implementation Steps

1. **Proposal-first design.** Draft the axis proposal per the guideline: the exact
   subject list (providers + agent-SDK layer + Perplexity), the per-subject usage
   dimensions above, cadence, and a cost/`--estimate` range for the real survey.
   Get owner approval before any billable run.
2. **Article framing fix.** Rewrite the topic's opening so it names two
   capabilities: pre-flight input prediction (existing) and post-hoc actual usage
   (new). The current "input only" wording is corrected to describe only the
   pre-flight axis.
3. **Keyless scaffold.** Add the usage-survey axis to the domain + report with a
   fixture subject set (byte-stable, no key, honest provenance). Extend the
   response-usage extraction so both consumed input and output are captured per
   subject (the comparison instrument already captures `outputTokens`; generalize
   to a usage record: input, output, and known extra fields).
4. **Streaming + agent-SDK variants.** Model the non-streaming vs streaming
   distinction (and any opt-in flag) and whether the agent-SDK layer preserves
   usage, as explicit survey dimensions.
5. **Report renderer.** Render the survey as a per-subject table (input / output /
   streaming / SDK-preserved / extra fields), with provenance per cell, alongside
   the existing counting-validation content.
6. **Real survey (proposal-gated).** After approval, run `--estimate`, then the
   real survey within the approved ceiling; archive a dated frame; regenerate the
   published EN/JP pages.

## Quality Gate

- The article explicitly distinguishes **pre-flight input prediction** from
  **post-hoc actual usage**; a reader is never left thinking output is simply
  "out of scope".
- The keyless path renders the survey deterministically (re-run → byte-identical),
  no API key required; every real cell carries honest provenance and no fabricated
  "reported" value.
- The survey covers direct APIs + at least one agent-SDK layer + Perplexity, with
  the non-streaming/streaming and SDK-preservation dimensions present.
- Real survey priced with `--estimate` and run only within the owner-approved
  ceiling (proposal-first gate honored).
- Per-package bare exit codes green, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )` — never `make test`/`make lint`.

## Considerations

- **Tie back to the counting validation.** Reported usage is also the ground truth
  the existing counting axis validates against — the two axes reinforce each other;
  keep them coherent in one article rather than duplicating the provider list.
- **Streaming is the subtle case.** Several providers omit `usage` from streamed
  responses unless explicitly requested; record the opt-in as a first-class result,
  not a footnote.
- **Agent-SDK layers vary.** A wrapper may drop, rename, or aggregate usage; the
  survey should say what the *reachable* layer actually exposes, which is what a
  builder on that SDK would get.
- **Plain language.** Follow the terminology standard from
  the plain-language sweep ticket — no coined/mixed-script terms in the new prose.

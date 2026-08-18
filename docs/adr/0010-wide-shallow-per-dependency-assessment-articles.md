# 0010 — OSS foundational research is a wide-shallow assessment with a capped article

- **Status**: proposed (2026-08-13) — pending developer approval of the
  Step-2 proposal in
  [OSS foundational research — proposal](../oss-foundation-proposal.md).
  Nothing is scaffolded until that approval lands
  (`docs/research-development-guideline.md` Step 2, `packages/tech/TEMPLATE.md`
  Step 0).
- **Related**: [0004](0004-research-topic-anatomy.md) (what a research topic is
  made of), [0006](0006-dated-survey-article-series.md) (the dated survey series
  this type reuses unchanged).

## Context

Every published topic today is **comparison research**: a small enumerated
subject set (Agent SDKs, OCR engines, vector DBs, models) read across many axes
and published as the standard 7-section article
(`packages/tech/src/research/domain/article-outline.ts`), one article per topic,
composed into a dated survey series by ADR 0006.

That shape is tuned for a subject count in the single digits. The article earns
its seven sections because each subject is measured deeply and the reader is
choosing between a handful of options.

The organization also needs a second kind of standing knowledge about software
it has **already chosen**: for each open-source component it depends on, is that
component still maintained, and what is its vulnerability history? This is
per-dependency due diligence — license compliance and security — not a choice
between candidates.

The subject count is the difference, and it is not a small one. This repository's
own three manifests alone resolve to **666 distinct npm packages** across their
lockfiles (19 direct), before container base images, middleware, and server/OS
tooling are counted, and before the other repositories in the organization's
dependency surface are added:

The count is reproducible from the committed lockfiles alone — the exact command
is in [the proposal](../oss-foundation-proposal.md) §2.

A 7-section article per subject does not scale to that catalog. Neither does the
alternative of dropping coverage to keep the article: a due-diligence surface
that covers 20 of 666 dependencies answers no question anyone actually asks of
it.

## Decision

**OSS foundational research is a distinct research type, published under a
separate section, with a section-capped article.** It is not a topic under the
comparison model.

1. **Coverage beats depth, and the article is where that is paid for.** The
   per-software article has a **fixed four-section outline and a hard cap**:

   | # | Section (JA) | Contents |
   | - | ------------ | -------- |
   | 1 | 概要 | what the component is, where the organization uses it, the pinned version |
   | 2 | 持続可能性 | maintenance status, release cadence, maintainer count / bus factor, license, governance and funding signals |
   | 3 | セキュリティ | known-vulnerability (CVE/advisory) history, disclosure responsiveness, supply-chain posture |
   | 4 | 判定と推移 | the assessment, its trend across surveys, and the 過去の調査 links block |

   The cap is enforced in code the way the 7-section outline is
   (`article-outline.ts`), not by convention — an outline check that fails the
   build is what keeps 666 articles uniform. **Richness belongs in catalog
   breadth and in the trend series, never in per-item section sprawl.**

2. **It lives in its own section**, `docs/oss-foundation/` (JA) with its
   handwritten English counterpart, as a sibling of `docs/llm-foundation/` — not
   as further entries inside it. The two sections answer different questions and
   a reader arriving at one is not shopping in the other.

3. **The dated survey series of ADR 0006 is reused unchanged.** Each survey
   writes a uniform trial report under
   `docs/research-reports/history/<topic-id>/<timestamp>/`; the stable slug holds
   the latest survey; §4 carries the 推移 block and the 過去の調査 links. Nothing
   about the recurrence model is new here — only the article outline and the
   subject cardinality are.

4. **The data pull is machine-fetchable; the 判定 is not.** Sustainability and
   security signals come from public, reproducible sources behind
   anti-corruption layers in `vendors/` (OpenSSF Scorecard, OSV / GitHub Security
   Advisories, deps.dev, registry license and release metadata,
   endoflife.date). Every published value carries a provenance label the way the
   LLM-foundation pages do — measured, 未測定, or 要確認 — and a value that could
   not be fetched reads 未測定 rather than a guessed number.

5. **The catalog's provenance stays generic.** The subject list is derived from
   the organization's dependency surface, and the published research names only
   the public OSS components. How and where the catalog was gathered is not
   published.

## Consequences

- **A second outline enters the codebase.** `article-outline.ts` becomes
  outline-per-type rather than one global outline. This is the cost of the
  decision and is accepted; the alternative — one outline stretched to serve
  both shapes — is how the cap gets lost.
- **Article uniformity is now load-bearing.** With hundreds of articles, an
  inconsistency is not a blemish but a navigation failure. The cap check is a
  test, not a review note.
- **Two half-cadences are possible.** Security advisories move faster than
  maintenance signals, so the sustainability half and the security half may
  warrant different refresh intervals. The proposal (§1) states which is chosen
  and why; this ADR does not fix it.
- **Coverage will be partial for a long time.** Catalog breadth grows survey by
  survey. An article that does not exist yet is preferable to one that guesses,
  and the index must make the covered/uncovered boundary visible rather than
  implying whole-catalog coverage.

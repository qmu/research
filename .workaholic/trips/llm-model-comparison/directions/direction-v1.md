# Direction v1

**Author**: Planner
**Status**: draft
**Reviewed-by**: (pending)

## Content

### 1. Value Proposition

We are publishing the second piece of public, reproducible foundational research
under the qmu.co.jp banner: a **fundamental comparison of frontier LLMs** from the
three providers our work most often touches — Anthropic, OpenAI, and Google. For a
minimal but representative slice of each provider's lineup, the research scores
eight aspects: Provider, Model Name, Released, Cost, and Effort Level (curated,
cited reference data) alongside Speed, nested-JSON structural depth, and
length-specification accuracy (measured live against the real provider APIs).

The value is threefold and deliberately layered:

1. **A decision aid for model selection.** Teams choosing a model for a given task
   rarely have a single, honest, side-by-side surface that mixes the *catalog
   facts* (who, what, when, how much) with *behavioral evidence* (how fast, how
   well it holds structure, how precisely it follows a length instruction). This
   research produces exactly that surface, and refreshes it from code rather than
   from a stale hand-written table.

2. **A credibility artifact for qmu.co.jp.** A reproducible, cited, openly
   published comparison demonstrates the firm's competence in the AI-engineering
   space more convincingly than a marketing claim can. The reader can re-run it
   and get the same shape of answer; that re-runnability *is* the credibility.

3. **The second proof of a repeatable research practice.** This is not a one-off.
   It is the deliberate next step after the seed benchmark toward a *practice* —
   a known anatomy for turning a research question into runnable code plus a
   published report. Each topic that lands this way lowers the marginal cost of
   the next one and compounds the firm's public research presence.

The proposition is intentionally honest about its own limits: the live numbers are
a *probe*, not an exhaustive evaluation suite, and the curated columns are clearly
labeled as catalog data, not measurements. The credibility comes from that
honesty, not from overclaiming breadth.

### 2. Business Risk Assessment

This work is best understood through the firm's **Proactive PoC** and **Upfront IT
Investment Evaluation** planning lenses: it is a small, mostly-disposable build
that reduces uncertainty about a larger ambition (a standing public-research
practice) before that ambition is invested in at scale. The risks below are framed
against business outcome, and each carries a proposed mitigation.

- **Reputational risk — stale or wrong reference data.** Model IDs, prices, and
  release dates move quickly and some sit on the far side of any model's knowledge
  cutoff. A published comparison that asserts an outdated price or a wrong model
  name damages the very credibility the artifact exists to build.
  *Mitigation:* every curated cell carries a citation to its provider source, the
  report visibly labels curated-vs-measured, and the reference data is isolated so
  a correction is a one-line edit. The report's worth is its method and
  reproducibility, not the permanence of any single number — we frame it that way
  explicitly.

- **Honesty risk — presenting non-measurements as measurements.** A real run where
  one provider's credential is absent must never silently show a fabricated or
  fixture row as if it were a live measurement. Doing so would be a quiet
  dishonesty that, once noticed, discredits the whole research line.
  *Mitigation:* a keyless row is always flagged as such in the report; "measured"
  and "not measured" are distinguishable to the reader at a glance. This is a
  non-negotiable acceptance criterion, not a nicety.

- **Cost / operational risk — paid third-party API calls.** The live probes spend
  real money against three vendors and depend on their availability.
  *Mitigation:* the public, automated path (CI) runs **keyless against a fixture**
  and spends nothing; live runs against paid APIs are an explicit, developer-
  initiated act gated on credentials the developer supplies. Investment in the
  paid path is opt-in and bounded, matching the "phase investment to reduce
  uncertainty" practice.

- **Vendor-dependence risk.** Binding the research to three external SDKs raises
  switching cost and exposes us to each vendor's API churn.
  *Mitigation (business framing):* the research treats providers as
  interchangeable behind one comparison contract, so adding, dropping, or swapping
  a provider is a contained change rather than a rewrite. The cost of exit is kept
  small by design; we record why each external dependency was accepted.

- **Legal / compliance risk.** Publishing comparative claims about named
  commercial products, and calling their APIs, sits under each provider's terms of
  service and naming/trademark expectations, and any benchmark-publication clauses.
  *Mitigation:* claims are factual, verifiable, and sourced; we use official model
  and product names accurately; we publish method and results, not disparagement.
  A pre-publication check that our presentation respects each provider's terms is
  part of getting this to "publishable", consistent with the firm's
  legal-compliance planning policy.

- **Scope-creep risk.** "Compare LLMs" invites unbounded expansion (every model,
  every probe, every effort setting).
  *Mitigation:* the minimum is fixed deliberately — three providers, one model
  each, three live probes, effort as curated metadata. Everything beyond is named
  as an explicit follow-up, not smuggled into this PoC.

### 3. User Personas

- **The qmu engineer / technical decision-maker (primary).** Choosing a model for
  a concrete build and wanting an honest, current, side-by-side view that blends
  catalog facts with behavioral evidence — and the ability to re-run it for their
  own model set. They value reproducibility over a glossy verdict.

- **The prospective client / partner evaluating qmu.co.jp (primary).** Reading the
  published report as evidence that the firm understands the AI landscape
  rigorously and works in the open. Their trust is won by the report being
  checkable, sourced, and honest about what it did and did not measure.

- **The future research author inside the firm (primary, and the strategic one).**
  The next person who turns a research question into a published topic. For them
  the value is that this topic, together with the seed, establishes a *known
  anatomy* so their work is mechanical rather than improvised. This persona is why
  the work doubles as the first deliberate step toward a repeatable practice.

- **The AI agent as reader and operator (cross-cutting).** Consistent with the
  firm's AI-native and accessibility planning stance, the published report and the
  runnable research must be reachable and legible to AI agents as well as humans —
  stable structure, machine-readable tables, an automated path an agent can drive
  without human-only steps. Accessibility (WCAG 2.2 AA as the floor, open to AI)
  is a planning premise here, not a late polish.

### 4. System Positioning

This research sits inside the firm's public, reproducible foundational-research
line for qmu.co.jp. Its position has three defining edges:

- **It is a sibling, not a successor, to the seed benchmark.** The seed proved the
  anatomy on an exact-match task; this topic proves the same anatomy generalizes to
  a *comparison* shape across multiple providers. Together they are the evidence
  that the practice repeats. The seed is not replaced or absorbed; both stand,
  both are listed, both are published.

- **It introduces the curated-registry-plus-live-probe pattern.** The split between
  cited catalog data and measured behavior is the conceptual contribution of this
  topic to the practice. It is a reusable shape: future comparisons inherit "some
  columns are sourced facts, some are measured live, and the reader can always tell
  which is which."

- **It is two-surfaced, matching the repository's delivery model.** A preview
  surface (the research site) and a publication surface (the corporate site) carry
  the same Markdown report one-directionally. The research is "done" only when it
  is both reproducible in code and presentable, accessible, and publishable as a
  report — code without a publishable report is an unfinished research artifact.

The boundary is held firmly: this is *foundational research published in the
open*, not an internal benchmarking tool and not a product. That positioning is
what justifies the honesty, sourcing, and reproducibility requirements above —
they are the cost of publishing under the firm's name.

### 5. Business Rationale

Why build this now, and why in this shape:

- **It reduces a real uncertainty at low cost.** The larger bet — that qmu can run
  a standing public-research practice that compounds credibility — is only
  partially verified by one topic. A second topic of a *different* shape
  (comparison, multi-provider, mixed curated/measured) is the cheapest decisive
  test of "does the anatomy generalize?" before any heavier investment in the
  practice. This is the Proactive-PoC logic applied to the firm's own research
  program: verify small before building big.

- **The return is explainable and phased.** The immediate return is a useful,
  publishable artifact and a recorded, reusable pattern; the compounding return is
  a lower marginal cost for every future topic. The investment is phased: the
  keyless, zero-spend path delivers the artifact and the practice-proof on its own,
  and the paid live-run path is an opt-in increment the developer authorizes when
  the credentials are in place. Nothing here pushes spend ahead of the value it
  buys.

- **It is grounded in how the firm actually works.** Anthropic, OpenAI, and Google
  are the providers our engineering most often reaches for; comparing exactly those
  three answers a question the firm and its clients genuinely have, rather than a
  hypothetical one. The market relevance is concrete, not decorative.

- **It strengthens trust by being honest about its own limits.** A modest,
  clearly-scoped, reproducible comparison that says plainly what it measured and
  what it merely cited earns more durable trust than a sweeping claim. For a firm
  whose differentiator is rigorous, open AI engineering, that honesty *is* the
  business case.

In one line: this is a small, mostly-disposable, openly-published comparison that
buys a useful artifact today and a proven, repeatable research practice for
tomorrow — at a cost phased so the firm never invests ahead of the value it can
see.

## Review Notes

(pending review)

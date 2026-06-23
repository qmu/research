# Round 1 Review — Architect

**Reviewer:** Architect (Neutral / structural bridge)
**Phase/Step:** planning / one-turn review
**Lens:** translation fidelity (does the structure faithfully carry business
intent?) + boundary integrity, bridging `workaholic:design` ↔
`workaholic:implementation`.
**Artifacts reviewed:** `directions/direction-v1.md` (Planner),
`designs/design-v1.md` (Constructor).
**Carried-in flags from my `models/model-v1.md`:** R1 (honesty must be *rendered*,
not just typed), R2 (three SDKs name output-token counts differently; all must
normalize to a single `Completion.outputTokens`), R3 (`models.ts` values are
volatile across the cutoff and must be build-time-verified).

---

## Decision 1 — `directions/direction-v1.md` (Planner): **APPROVE**

The direction carries the business intent into the structure faithfully. The
three-layer value proposition (decision aid → credibility artifact → second proof
of a repeatable practice) maps cleanly onto the structural intents my model
identified: the *comparison* intent and the *pattern* intent. The risk register is
the strongest part for my lens — every business risk has a structural counterpart
that the design must hold, and the direction names them precisely: stale reference
data → curated cells carry citations and are isolated for one-line correction;
non-measurements-as-measurements → keyless rows flagged at a glance; vendor churn →
providers interchangeable behind one comparison contract. These are exactly the
boundaries my model defined (curated/measured seam; the `CompletionClient` ACL),
expressed in business terms. The "sibling, not successor" positioning and the
"curated-registry-plus-live-probe pattern" framing also correctly set up ADR 0004
as a *generalization* of two topics rather than a restatement of one.

### Concern 1 (translation-fidelity, with proposal)

The direction introduces a **legal / compliance risk** — provider terms of service,
naming/trademark accuracy, and benchmark-publication clauses — and calls a
"pre-publication check that our presentation respects each provider's terms" part
of reaching "publishable." This is a genuine business obligation, but it has **no
structural carrier** anywhere in design-v1: there is no step, no artifact, and no
acceptance criterion that discharges it. As written, the obligation would silently
fall through the design→implementation seam — precisely the translation gap my role
exists to catch.

**Proposal:** Either (a) explicitly scope the ToS/trademark check *out* of this PoC
in the direction (e.g., "claims are factual and sourced; a formal ToS review is a
follow-up before any wider promotion"), or (b) give it a concrete structural home —
a short "Publication constraints" note in the report's Method/Reproduce section
stating that columns are factual, sourced, and use official product names, plus a
delivery-plan checkpoint at the "paused real run" boundary. (b) is cheaper and
keeps honesty visible to the reader; either resolves the dangling obligation. This
is a coherence fix, not a blocker — hence APPROVE.

---

## Decision 2 — `designs/design-v1.md` (Constructor): **APPROVE WITH CHANGES**

The design is a faithful, high-resolution translation of both the direction and my
structural model. It preserves every boundary I defined (verified below), keeps the
curated/measured seam as the spine (the `measured: boolean` flag on `Measurement`,
set by the runner from key presence, asserted visible by `report.test.ts`), and its
ordered delivery plan with commit points is exactly the decomposition the pattern
wants. The quality strategy operationalizes my R1 directly: `report.test.ts` asserts
a `measured: false` row is *visibly flagged*, which is the one place honesty is
earned at render time rather than guaranteed by the type. Two changes are needed
before it is fully sound — one substantive (my R2), one a smaller seam-fit.

### Boundary-integrity verification (my model's four boundaries)

| Boundary from model-v1 | Held in design-v1? | Evidence |
|---|---|---|
| Untouched `LlmClient` | **Yes** | §2 `types.ts (edit)`: "existing `LlmClient.generateAnswer` contract is left untouched"; §6 risk 1 + §4 seed regression. |
| Additive `CompletionClient` ACL | **Yes** | §3 step 6 "widen the vendor ACL **additively**"; new contract *alongside* `LlmClient`; existing `createAnthropicClient`/`createFixtureClient` retained. |
| Acyclic domain / vendors / entrypoints | **Yes** | §1 + §2: domain pure, "no SDK imports"; SDK types "never leave `vendors/llm/`"; §3 step 7 runner "no comparison logic." |
| Curated / measured seam | **Yes** | Two-struct `ModelCard` ∧ `Measurement`; `ComparisonRow` join; `measured` flag required; report legend. Matches model-v1 §5 B3. |

### My R3 (build-time-verified registry data): **satisfied.**

§2 registry and §6 risk 4 both state OpenAI/Google IDs, pricing, and dates are
"verified live at implementation time (WebFetch …)," `apiModelId`s isolated, each
`source` cited. Faithful to the direction's reputational-risk mitigation. No change.

### My R1 (honesty rendered, not just typed): **satisfied.**

`report.test.ts` asserting a `measured: false` row "is visibly flagged," plus the
legend requirement, closes the one render-time gap. No change.

### Change A — my R2 (token-count normalization) is **under-specified** (substantive)

This is the one place the design does not yet fully carry my model's flag. §2
`anthropic.ts` correctly captures `usage.output_tokens`, but the `openai.ts` and
`google.ts` entries say only "via the official SDK; types confined to this file" —
they do **not** state the differing field the adapter reads, nor that all three
must normalize to a single `Completion.outputTokens`. This matters because
`tokensPerSecond` is derived from `outputTokens`: if one adapter populates the
wrong field (or leaves it zero), Speed silently corrupts for that provider while
the 8-column table still renders cleanly — a fidelity failure invisible to the type
checker and to a casual report read. It is exactly the kind of leak the ACL exists
to prevent, and right now the normalization contract lives only in my model, not in
the buildable design.

**Proposal:** Make the normalization explicit in §2 (and ideally §4): each adapter
maps its SDK's usage field to `Completion.outputTokens` —
Anthropic `usage.output_tokens`, OpenAI `usage.completion_tokens`, Google
`usageMetadata.candidatesTokenCount` (confirm exact paths against the SDK at
implementation time, since these names are themselves cutoff-volatile). Add a
quality check: either a per-adapter boundary test/assertion that a non-zero,
correctly-sourced `outputTokens` is returned, or — since adapters touch live SDKs —
a documented manual check in §4 that each provider's real run yields a plausible
non-zero token count before the numbers are published. A defensive
`outputTokens > 0` guard (or an explicit `measured` downgrade when usage is
missing) keeps a silent-zero from masquerading as a real measurement.

### Change B — `ComparisonResult` shape vs. the renderer's Method needs (seam-fit)

§2 says `ComparisonResult` carries "probe parameters echoed for the Method
section," and §4 requires the Method mermaid + the per-probe detail to be generated
**from code** (diagram-generation policy). But the probe *ladder* (depths swept) and
the length target/topic are, per my model-v1 §3, **orchestration policy owned by the
runner**, not domain truth — they are decided in the entrypoint. For the pure
`renderComparisonReport` to state "swept depths 3,5,8,12,16; length target N words
on topic T" without the runner passing those in, the design must say *how* they
reach the result. Left implicit, this invites the ladder constants to drift into
`domain/` (so the renderer can read them) — eroding the runner-owns-the-sweep
boundary.

**Proposal:** State explicitly in §2 that the runner passes its probe parameters
(depth ladder, length target, topic) **into** `ComparisonResult` (or into
`renderComparisonReport` as an argument), so the renderer stays pure and parameter-
free while the constants stay in the entrypoint. One sentence in the `types.ts` /
runner inventory resolves it and keeps `gradeNestedJson` single-target and pure
(my R5).

---

## Cross-artifact coherence

The two artifacts are mutually consistent and both trace to the ticket and my
model; the chain (business intent → direction → design → structure) holds with two
nameable seams:

1. **The legal/ToS obligation (Concern 1) exists in the direction but has no home
   in the design.** This is the one genuine business→implementation gap. Whichever
   resolution the Planner picks, the design should acknowledge it (a Method note or
   an explicit out-of-scope line) so the obligation does not evaporate at the seam.
   This is the highest-value cross-artifact fix.
2. **Node `--env-file-if-exists` framing is internally consistent but slightly
   over-cautious.** Both design (§2, §6 risk 5) and my model treat it as low-risk;
   note for the record that CI runs only the *keyless* `compare:fixture`, which
   needs no env file at all — so the flag's Node-version support never gates CI,
   only the local real run. The design's "confirm at implementation, fall back to
   `dotenv`" stance is correct; no change required.

Everything else lines up: the direction's six business risks each have a structural
mitigation in the design's §6; the "minimum for now / explicit follow-up" scope
discipline is identical on both sides; and the ADR-0004 "generalize from two
topics" intent is consistent across direction §4, design §2/§3, and my model §8.

---

## Summary of required vs. suggested

- **Required before Coding (design-v1):** Change A — make the three-SDK
  output-token normalization to a single `Completion.outputTokens` explicit, with a
  per-adapter check (R2).
- **Required for coherence:** Concern 1 — give the direction's legal/ToS obligation
  a structural home or an explicit out-of-scope line, acknowledged in the design.
- **Suggested (low-cost seam fixes):** Change B — pass runner probe parameters into
  the result/renderer so the ladder stays out of `domain/`.
- **Confirmed sound, no change:** untouched `LlmClient`; additive `CompletionClient`
  ACL; acyclic layering; curated/measured seam; R1 (honesty rendered); R3
  (build-time-verified registry).

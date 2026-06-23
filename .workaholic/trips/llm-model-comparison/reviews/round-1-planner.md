# Round 1 Review — Planner

**Reviewer**: Planner (Progressive / business-outcome lens)
**Artifacts reviewed**: `models/model-v1.md` (Architect), `designs/design-v1.md` (Constructor)
**Phase/Step**: planning / one-turn-review

## Decisions

- **Architecture Model v1 (Architect)** — **Approve with minor suggestions**
- **Design v1 (Constructor)** — **Approve with observations**

---

## Review of Architecture Model v1 (Architect)

From the business-outcome lens, this model is a faithful carrier of the direction.
The single most important business requirement in direction-v1 — that the
comparison is **honest**, with curated-vs-measured visible to the reader — is made
the **structural spine** here (§3 the curated/measured split; §5 B3; risk R1). The
`measured` flag as a required field means a row "cannot be assembled without
stating its provenance," which is exactly the honesty-by-construction the business
case rests on. The pattern-intent (ADR 0004, "future topics become mechanical")
is also explicitly carried, which is the strategic value-driver of the direction.
The model correctly stays out of the business sections — no value/persona claims
poach the Planner's lane — and that boundary discipline is itself a fidelity win.

**Concern 1 (business outcome, primary): R1 names the honesty risk but does not
fix the reader's experience of it.** The model rightly flags that honesty is
"earned at render time, not guaranteed by the type" — but from a reader's
standpoint, a per-row `measured: false` flag plus a legend is the *floor*, not the
target. The persona that most matters for credibility — the prospective client
reading the published report — must reach a correct conclusion in seconds without
mistaking a fixtured row for evidence. A flag in a wide 8-column table is easy to
miss.

  *Proposal (concrete, business-framed):* Specify, as a model-level fidelity
  requirement the renderer must meet, that a fixtured row is **unmistakable at a
  glance** — not merely flagged. Concretely: an explicit per-row provenance column
  or marker token (e.g. the three measured cells rendered as "n/a (fixtured)"
  rather than a plausible synthetic number), so a skim cannot read a fixtured row
  as a measurement. This is the difference between "technically disclosed" and
  "actually understood," and credibility lives in the latter. (It also strengthens
  the Architect's own R1 from a polish item into a testable acceptance criterion.)

**Concern 2 (trade-off worth surfacing): the model is silent on whether the
measured numbers carry their own honesty caveat.** The direction is explicit that
the live probes are "a *probe*, not an exhaustive evaluation suite," and that
"credibility comes from honesty about limits." The model guarantees the
curated/measured seam but not the *single-sample* caveat — one run, one prompt per
probe, no repetition. A reader could over-trust a tokens/sec figure as a stable
benchmark.

  *Proposal:* Add to the translation-fidelity table (or R1) a fidelity requirement
  that the report state its measurement is a single-sample probe (run count, one
  prompt per probe, point-in-time), so the artifact's published claims match the
  modest scope the business case deliberately chose. This protects credibility
  exactly where the direction said it would be won.

---

## Review of Design v1 (Constructor)

From the business-outcome lens this design delivers all three value strands of
direction-v1: the **decision aid** (the 8-column curated+measured table, generated
from code and re-runnable), the **credibility artifact** (cited sources, the
keyless reproducible path, the Astro `description` publish contract honored), and
the **repeatable-practice proof** (ADR 0004 + the memory). The phased-investment
business stance is honored precisely: the keyless `compare:fixture` path delivers
the artifact and the practice-proof at **zero spend**, and the paid live run is an
explicit, developer-gated increment (step 8, "Paused real run") — that is the
Proactive-PoC / phased-IT-investment logic from the direction, realized in the
delivery plan. The honesty requirement is rendered, not just typed: §4 and the §6
risk row commit `report.test.ts` to assert a `measured: false` row is *visibly
flagged*, which is the test that makes the business honesty-claim defensible.

**Concern 1 (business outcome, primary): the published report's self-description of
scope and limits is under-specified relative to the credibility claim.** The design
guarantees the curated-vs-measured legend and the fixtured-row flag, but does not
name a "Scope & limitations" section in the report (single-sample probes,
point-in-time pricing, which columns are cited vs observed in prose, the date of
the live run). For the prospective-client persona, the report *is* the product;
its trustworthiness is its business value, and trustworthiness is carried as much
by an honest limits statement as by a correct table.

  *Proposal:* Add to `report.ts` (and assert in `report.test.ts`) a short,
  required **"Scope & limitations"** prose block: states the probe is single-sample
  and point-in-time, restates curated-vs-measured in words, and dates the
  measurement run. Cheap to build, and it directly converts the direction's
  "honest about its own limits" into reader-visible text — the place credibility is
  actually earned.

**Concern 2 (trade-off / readiness, secondary): the "Paused real run" gate is in
the delivery plan but its acceptance evidence is not defined.** The business value
of the live run is *seeing the honesty mechanism work under real conditions* — a
one-key run producing a complete report with the keyless providers flagged
fixtured. The design says to "confirm" this but does not state what evidence
closes the gate, which risks the most business-load-bearing behavior being
spot-checked rather than demonstrated.

  *Proposal:* Define the real-run acceptance evidence explicitly: a one-key (or
  partial-key) run is part of the demonstration, and the closing evidence is the
  rendered report showing live numbers for the keyed provider(s) **and** an
  unmistakably-fixtured row for the unkeyed one(s). This makes the headline honesty
  behavior a demonstrated outcome, not an assertion — which is what the credibility
  case needs. (This is E2E territory I will own in the Coding Phase; flagging it
  now so the design names the evidence.)

---

## Cross-Artifact Coherence

The model and design are tightly aligned and both trace cleanly back to
direction-v1 — there is no drift between the structural intent and the buildable
plan. Specifically:

- **Honesty spine is consistent across all three artifacts.** Direction-v1 makes
  measurement-honesty a non-negotiable acceptance criterion; the model makes it the
  structural spine (§3, B3, R1); the design makes it a tested behavior (§4, §6).
  This is the cleanest line of fidelity in the set. My two concerns above push the
  *same* thread one step further — from "disclosed and tested" to "unmistakable to
  the reader and stated in prose" — because the business value (credibility) lives
  in reader comprehension, not just disclosure.

- **Phased-investment framing is honored.** The direction's "verify small, opt-in
  paid increment" maps exactly onto the design's keyless-CI-path + paused-real-run
  split and the model's fixture-honesty boundary. No artifact pushes spend ahead of
  value.

- **Repeatable-practice proof is carried end-to-end.** Direction's strategic
  persona (the future research author) → model's "pattern intent" / ADR 0004 →
  design's step 7 records + memory. The strategic value-driver survives the
  translation intact.

- **One coherence gap to watch (not a blocker):** all three artifacts treat the
  *measured* columns as self-evidently trustworthy once live, but none yet commits
  the report to stating the single-sample, point-in-time nature of those numbers in
  reader-facing prose. My Concern 2 on the model and Concern 1 on the design are the
  same gap seen from two sides; closing it in `report.ts` resolves both and fully
  lands the direction's "honest about its own limits" promise. Neither concern
  requires a revision round — both are minor, additive, and can be folded into the
  Coding Phase via the design's existing `report.ts` / `report.test.ts` scope.

**Net:** the model and design faithfully deliver the business outcomes in
direction-v1. Both approved; my observations strengthen the reader-facing honesty
that is the artifact's core credibility asset, and can be absorbed without a
re-plan.

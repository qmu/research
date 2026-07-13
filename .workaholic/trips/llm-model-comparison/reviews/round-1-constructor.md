# Review v1 (Constructor, Round 1)

- **Reviewer**: Constructor (Conservative / engineering quality, production readiness)
- **Artifacts reviewed**: `directions/direction-v1.md` (Planner), `models/model-v1.md` (Architect)
- **Lens**: Is this buildable as strict-TypeScript types with the quality bar held? Where does the business framing or the structural model imply a type/test/quality requirement my `designs/design-v1.md` should make explicit?

## Content

### Decisions

- **`models/model-v1.md` (Architect): Approve with minor suggestions.** The domain
  model is faithfully and cleanly buildable in strict TypeScript exactly as my
  design-v1 specs it. Two small build-side sharpenings below; none block.
- **`directions/direction-v1.md` (Planner): Approve with observations.** The
  business framing (zero-spend keyless path + opt-in paid live run, honesty as a
  non-negotiable acceptance criterion) maps cleanly onto my fixture-first delivery
  plan and the `.env` pause. It surfaces one quality requirement — a
  pre-publication terms/trademark check — that is currently outside my design-v1's
  inventory; observation R-D2 records it.

---

### Review of `model-v1.md` (Architect)

**Buildability of the domain model — confirmed.** I pressure-tested the model's
core types against strict-mode TS as my design-v1 will write them, and they hold:

- `Provider = "anthropic" | "openai" | "google"` — closed string-literal union,
  trivially `Readonly`. Matches design-v1 §2 verbatim.
- `ComparisonRow = ModelCard & Readonly<{ measurement: Measurement }>` — the
  intersection compiles and is the only type the report consumes. Because both
  halves are `Readonly<{…}>` object types with disjoint keys, the `&` is a clean
  structural join (no key collision, no `never` fields). This is identical to my
  design-v1's `ComparisonRow = ModelCard & { measurement: Measurement }`; I will
  adopt the Architect's explicit `Readonly<{ measurement }>` wrapper on the
  right-hand side so the joined `measurement` property is itself `readonly`, which
  my design-v1 left implicit. **Minor design-v1 amendment, accepted.**
- **Required `measured: boolean` on `Measurement` — fully buildable and is the
  right call.** Making it a non-optional field means a `Measurement` literal
  *cannot* be constructed without stating provenance — the compiler enforces the
  honesty seam at row-assembly. My design-v1 already carries `measured: boolean`;
  the Architect's framing ("honest by construction, set by the runner from *which
  client it used*, not inferred later") is a stronger statement of intent than my
  design-v1's prose and I will quote it into design-v1 §6's honesty risk.

**Concern C-A1 (trade-off, with proposal) — `outputTokens`/`elapsedMs`/`measured`
typing for a fixtured row.** The model keeps `outputTokens` and `elapsedMs` as
required `number`s "for transparency/reproduction," but a `measured: false`
(fixtured) row has no real elapsed time or token count. If the runner writes a
fabricated `elapsedMs`/`outputTokens` for fixtured rows, those raw fields silently
become synthetic numbers that *look* like measurements — exactly the honesty
failure mode the model's own B3/R1 warns against, just relocated from the headline
columns to the raw columns. The required-field shape is good (it forces a value);
the risk is the *value chosen*.
*Proposal (engineering):* keep the fields required (type stays simple), but make
the fixture client's deterministic numbers **plausibly synthetic and the report
renderer suppress or visibly mark the raw `elapsedMs`/`outputTokens` cells for
`measured: false` rows**, not just the headline three. I will add an explicit
`report.test.ts` assertion: a `measured: false` row shows no bare numeric raw-probe
cell that could be mistaken for a live figure (it shows a dash or a "fixture"
marker). This makes B3 enforced by a test, not only by discipline — closing the
exact gap the model flags as "earned at render time" (R1). **I will add this to
design-v1 §4 quality strategy and §6 risk.**

**Concern C-A2 (trade-off, with proposal) — token-count normalization (model R2)
needs a test obligation, not just a manual check.** The model correctly identifies
that the three SDKs name output tokens differently (`usage.output_tokens` /
`usage.completion_tokens` / `usageMetadata.candidatesTokenCount`) and that a wrong
field silently corrupts Speed for one provider while the table "looks fine." My
design-v1 confines SDK types to the adapter files but does not state how this
normalization is *verified* — and it cannot be unit-tested without a live key,
which is precisely why it is dangerous.
*Proposal (engineering):* extract each adapter's response→`Completion` mapping into
a tiny pure exported helper (e.g. `toCompletion(rawUsage, text, elapsedMs)` per
provider, or a shared `normalizeUsage`) so the field-name mapping is a pure
function I *can* unit-test against a captured/synthetic SDK response shape — no
network, no key. The adapter's `complete()` then just calls the SDK and delegates
to the tested mapper. This turns R2 from "documented manual check" into CI
regression while keeping all SDK types inside `vendors/llm/`. **I will add this as
a design-v1 §2 (vendor ACL) sub-point and a §4 test item.** This does not weaken
vendor-neutrality: the helper still lives in the adapter file and takes the SDK's
raw usage shape as input.

**Agreement, no change needed:** R5 (ladder belongs to the runner, grader stays
single-target/pure), R7 (two-contract coexistence — `LlmClient` untouched), and
the acyclic inward dependency graph (§2) all match design-v1's approach exactly.
The model's §6 taxonomy "get `types.ts` right first" is the same ordering as my
delivery plan step 1.

### Review of `direction-v1.md` (Planner)

**Mapping the business framing onto the build — confirmed clean.** The direction's
central business commitment — *"the public, automated path (CI) runs keyless
against a fixture and spends nothing; live runs against paid APIs are an explicit,
developer-initiated act gated on credentials"* — maps one-to-one onto my
fixture-first delivery plan: design-v1 step 5 regenerates the report via
`compare:fixture` with zero keys (and that same target is the only one CI runs,
step 6), and step 8 is the explicit `.env` pause before any paid `compare` run.
The direction's "honesty risk … non-negotiable acceptance criterion" is the same
requirement my design-v1 §6 makes load-bearing via the `measured` flag. No
divergence.

**Observation R-D1 (no change required) — "phased, opt-in spend" is satisfied by
the partial-key behavior.** The direction frames the paid path as bounded and
opt-in. My design-v1's runner already makes a one-key run produce a *complete*
report (keyless providers fixtured-and-flagged) rather than hard-failing — which is
a stronger realization of "phased investment" than all-or-nothing: a developer can
authorize spend for one provider at a time. Worth noting the direction and design
agree here; no action.

**Observation R-D2 (quality gap to flag) — the pre-publication terms/trademark
check has no home in my design-v1.** The direction names a real
legal/compliance acceptance gate: *"a pre-publication check that our presentation
respects each provider's terms … is part of getting this to 'publishable'"*, and
*"we use official model and product names accurately."* My design-v1's inventory
and delivery plan do not currently carry this step, and it is a genuine
production-readiness item for a report published under the firm's name.
*Proposal (engineering, in scope for design, not new code):* this is naturally
discharged by the same `models.ts` work that R3 already mandates — when the
Constructor WebFetches each provider's live model/pricing page to verify
`apiModelId`/cost/date, capturing the exact official product name and a `source`
citation **is** the terms/naming check, recorded as the cited `source` field. I
will add a one-line note to design-v1 §5 step 3 (registry) and §6 risk that
"verify IDs/pricing/dates" explicitly includes "use the provider's official
product name and cite the source page," so the Planner's compliance gate has a
concrete build owner rather than floating. This needs no policy addition — it is
covered by `objective-documentation` already in my Policies list.

**Concern C-D1 (trade-off, with proposal) — "frontier LLMs" / "representative
slice" framing vs. the fixed one-model-per-provider minimum.** The direction
opens with "frontier LLMs" and "a minimal but representative slice of each
provider's lineup," which a reader could take as multiple models per provider. The
build is deliberately *one* model per provider for the minimum (design-v1 §1,
ticket Considerations). This is a small expectation-management gap, not a conflict.
*Proposal (business-framed):* the direction already fixes the minimum explicitly in
§2 scope-creep mitigation ("three providers, one model each"); I propose the §1
value-proposition sentence echo that bound once ("one representative model per
provider for the minimum") so the headline and the scope mitigation cannot be read
as disagreeing. This is the Planner's artifact to amend if they agree; from the
build side I only need the one-model-per-provider minimum, which is unambiguous in
my design-v1.

---

### Cross-artifact coherence

The three artifacts are mutually consistent and converge on the same spine:

- **The honesty seam is the shared center.** Planner frames it as a non-negotiable
  business acceptance criterion; Architect makes it the type-system spine
  (required `measured` flag, B3); my design-v1 makes it a `report.test.ts`
  obligation. Three lenses, one requirement — strong coherence. My C-A1 tightens
  the one place all three agree is "earned at render" (raw fixtured cells), closing
  it with a test.
- **Curated-vs-measured split** is identical across all three: Planner's
  "curated-registry-plus-live-probe pattern," Architect's `ModelCard ∧ Measurement`
  intersection, my design-v1's two-struct inventory. No translation loss.
- **Zero-spend keyless CI + opt-in paid run** maps cleanly: Planner's business
  framing → Architect's `compare:fixture` keyless path / two contracts → my
  fixture-first delivery plan + `.env` pause. Architect's R4 and my design-v1 agree
  CI needs no env file (only the local real run loads `.env`), and CI Node 22
  supports `--env-file-if-exists` regardless.
- **Pattern → ADR 0004**: all three treat this topic as the second proof of the
  seed anatomy; Architect's "reinforces rather than perturbs the system's shape" is
  the structural precondition my design-v1 step 7 records as the ADR.

**One coherence note (R-D2 above):** the Planner's legal/terms gate is the single
business requirement that did not yet have an explicit structural carrier or build
owner; my proposal lands it on the existing `models.ts` citation work so it is
owned, not dropped. With that, business intent, structural model, and build plan
are fully aligned.

### Net design-v1 amendments I will carry (on revision, if this review is accepted)

1. Right-hand `Readonly<{ measurement: Measurement }>` wrapper on `ComparisonRow`
   (adopt Architect's explicit form). [C-A1 typing hygiene]
2. Fixture raw-cell honesty: report renderer marks/suppresses raw
   `elapsedMs`/`outputTokens` for `measured: false` rows; new `report.test.ts`
   assertion. [C-A1]
3. Pure, unit-tested per-provider `toCompletion`/usage-normalization helper inside
   each adapter; new test item. [C-A2 / model R2]
4. `models.ts` verification step explicitly includes official product name + cited
   source as the Planner's terms/naming compliance gate. [R-D2]

## Review Notes

Both artifacts are approved (model with minor suggestions, direction with
observations). No "Request revision" issued, so no escalation is required; the
amendments above are mine to fold into a design-v2 if the team adopts them, and the
two Planner-facing items (C-D1 wording, R-D2 ownership note) are offered for the
Planner's consideration, not demanded.

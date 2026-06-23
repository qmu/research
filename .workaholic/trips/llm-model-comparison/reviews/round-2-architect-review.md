# Round 2 Review — Architect (post-implementation gate)

**Reviewer:** Architect (Neutral / structural bridge)
**Phase/Step:** coding / post-implementation analytical review
**Subject:** Constructor implementation at commit `4be4412` (29 files, 47 tests
pass incl. seed, lint clean, `compare:fixture` report generated, `make build` ok,
real `compare` paused)
**Lens:** translation fidelity + boundary integrity, bridging
`workaholic:design` ↔ `workaholic:implementation`.
**Mode:** analysis only — no test execution, no edits.
**Carried-in:** model-v1 boundaries (untouched `LlmClient`; additive
`CompletionClient` ACL; acyclic domain/vendors/entrypoints; curated/measured seam)
and design-v2's six amendments (R2 `usage.ts`; rendered honesty; legal/ToS;
runner-owned constants; readonly types; one-key acceptance evidence).

---

## Decision: **APPROVE WITH OBSERVATIONS**

The implementation is a faithful, high-resolution realization of design-v2 and my
structural model. Every boundary I defined is preserved and verified below; the
required R2 amendment is implemented exactly as specified (pure, tested, delegated,
guarded); rendered honesty is enforced *and* asserted *and* visible in the
generated artifact. I found no must-fix structural defect. Two observations and two
minor suggestions follow — none blocks the gate. The verifications are evidence,
not ceremony: each is a concrete check against a named boundary.

---

## Six concentration points — verification

### 1. ACL additivity — **HELD (byte-for-byte additive)**

`git diff 4be4412^ 4be4412 -- vendors/llm/{types,anthropic,fixture}.ts` shows
additions only:
- `types.ts`: `LlmClient` block untouched; `Completion`/`CompletionClient`/
  `CompletionOptions` appended with a comment stating it is "added alongside
  `LlmClient` (not a widening of it)".
- `anthropic.ts`: `createAnthropicClient` + `DEFAULT_MODEL` unchanged; only a new
  import line and the appended `createAnthropicCompletionClient`.
- `fixture.ts`: `createFixtureClient` unchanged; only a new import and the appended
  fixture completion client + helpers.

The seed's three exports are intact; 47 tests including the seed's pass. This is
the additive coexistence my model-v1 §2 (R7) and ADR 0004's rejected-alternative
both call for.

### 2. R2 pure `usage.ts` normalizers — **HELD (the highest-value check)**

`vendors/llm/usage.ts` is pure and SDK-shape-typed: `anthropicOutputTokens`
(`output_tokens`), `openAiOutputTokens` (`completion_tokens`), `googleOutputTokens`
(`candidatesTokenCount`), all routed through a shared `toCount` that returns `0`
for missing, non-numeric, zero, **and negative** counts. `usage.test.ts` exercises
each field, the missing-object case, the zero/negative case, and the non-numeric
case — keyless CI regression for exactly the field that silently corrupts Speed.
All three adapters (`anthropic.ts`, `openai.ts`, `google.ts`) delegate token
extraction to the helper and measure `elapsedMs` inside the adapter around their
own SDK call, so timing semantics are uniform. This closes my Round-1 Change A
completely.

### 3. Acyclic layering / vendor neutrality — **HELD**

`grep -rE "openai|@google/genai|@anthropic-ai" llm-model-comparison/**` returns
**zero import statements** — the only matches are the `Provider` union's string
literals, `models.ts` registry data + source URLs, and test fixtures. The topic's
`domain/` imports nothing external; the runner imports the domain plus the vendor
*contracts/factories*, never an SDK. SDK usage *types* (`AnthropicUsageShape` etc.)
are declared in `vendors/llm/usage.ts` and do not escape. The runner
(`run-llm-model-comparison.ts`) is the sole site of `fs`, `process.env`,
`process.argv`, and `Date.now()`; it carries orchestration but no
comparison/correctness logic.

### 4. Curated/measured seam + rendered honesty — **HELD**

- `Measurement.measured: boolean` is required (a `Measurement` is unconstructable
  without stating provenance) — the seam is enforced in the type, per model-v1 §5
  B3.
- Runner zero-token guard: `measured = live && outputTokens > 0 && elapsedMs > 0`
  (`run-llm-model-comparison.ts:115`) — a live call returning an unusable token
  count is downgraded to `measured:false` rather than computing a corrupt rate.
  This is amendment 1's guard, present and correct.
- `report.ts` renders `n/a (fixtured)` for all three probe columns **and** masks
  the raw `elapsedMs`/`outputTokens` detail cells for `measured:false` rows
  (`measuredCell` applied in both `renderRow` and `renderDetailRow`).
- `report.test.ts` asserts the synthetic fixtured values never appear
  (`not.toContain("999.0 tok/s" | "| 99 |" | "1234 ms" | "| 555 |")`) and that
  `n/a (fixtured)`, the legend, Scope-&-limitations, Publication-constraints, and
  the conditional fixtured-run warning are present.
- **Verified in the generated artifact**: `docs/research-reports/llm-model-comparison.md`
  (the keyless `compare:fixture` output) shows all three rows masked to
  `n/a (fixtured)` across both tables, with the "This run includes fixtured rows"
  warning — honesty holds not just in the unit test but in the shipped page.

This is the one place model-v1 flagged as "earned at render time, not guaranteed by
the type" (R1); it is now earned, asserted, and observable.

### 5. Runner-owned constants, graders pure — **HELD (Architect B / R5)**

The depth ladder `[3,5,8,12,16]`, length target `100`, and topic live in the
runner's `PROBE` constant and are passed into `ComparisonResult.probe`, which the
renderer reads for the Method section — the constants never enter `domain/`.
`gradeNestedJson(target, text)` is single-target (one target in, one verdict out);
the runner's `probeJsonDepth` owns the sweep and folds per-depth results into
`maxNestedJsonDepth`. `ProbeParams` in `domain/types.ts` is a *type* the runner
populates, not a domain-decided value. This resolves my Round-1 Change B exactly.

### 6. Secondary checks — **HELD**

- Readonly: all domain types are `Readonly<{…}>` with `ReadonlyArray`;
  `ComparisonRow.measurement` is `Readonly`.
- `speed.ts` guards both `outputTokens <= 0` and `elapsedMs <= 0`.
- Report frontmatter carries a non-empty `description` (Astro publish contract);
  `report.test.ts` asserts it.
- `models.ts` isolates `apiModelId`, cites a `source` per model, and uses official
  product names.
- CI adds a keyless `Comparison pipeline self-test` running `compare:fixture` only;
  the real `compare` is never run in CI.
- ADR 0004 generalizes the anatomy correctly, including the additive-contract
  decision (rejecting "one wide contract") and structural honesty.
- `docs/dependency-decisions.md` records both `openai` and `@google/genai`.

---

## Requested assessments

### A. Additive pin `openai ^6.43.0` / `@google/genai ^2.8.0` — **structurally sound**

Both land as `dependencies` (runtime) alongside the untouched `@anthropic-ai/sdk`,
each recorded in `docs/dependency-decisions.md`, each isolated behind a single
`vendors/llm/{openai,google}.ts` adapter — so the exit cost the vendor-neutrality
policy cares about is contained to one file per provider. The caret ranges admit
compatible minor/patch updates within the pinned major, which is the right
posture for an SDK reached only through an ACL. The exact versions sit past the
training cutoff (an env-date artifact), but that is precisely why they are
isolated and Dependabot-monitored; a bump is a contained change. No structural
concern. (Minor note carried to suggestions below: the `package-lock.json`
resolved tree, +452 lines, is the transitive surface to watch in audit — not a
review blocker, an operational note.)

### B. `node --env-file-if-exists=.env --import tsx/esm` script wiring — **structurally sound**

The pattern is correct on both paths:
- `compare:fixture` (CI/keyless): `--env-file-if-exists` *no-ops* when `.env` is
  absent, so CI runs with zero credentials — confirmed by the generated all-
  fixtured report. The `--fixture` flag additionally forces the fixture client
  regardless of any env, so even a developer with `.env` present gets a keyless
  self-test from this target. Belt and suspenders, correctly.
- `compare` (local/real): loads `.env` if present; missing per-provider keys
  degrade that row to fixtured rather than hard-failing — the one-key acceptance
  path is reachable.

`--import tsx/esm` (rather than the seed's `tsx` shebang runner) is the right way
to keep Node as the process owner so `--env-file-if-exists` is honored; it is a
deliberate, sound divergence from the seed's `benchmark` script, not an
inconsistency. Local env is Node v24.13 and CI is Node 22 — both support the flag;
and CI needs no env file regardless. No concern.

---

## Observations (non-blocking)

### O1 — `released` is coarse (`"2026"`) for all three models — translation-fidelity gap (minor)

`domain/types.ts` documents `released` as "ISO date or YYYY-MM", and the seed's
intent for the "Released" aspect is a *date* a reader can compare across models.
The shipped registry records bare `"2026"` for all three, which collapses the
Released column to a non-discriminating value — the one curated aspect that
currently carries the least information. This is a registry-data quality point, not
a structural defect (the type accepts it, the column renders, isolation makes it a
one-line fix per the design's own promise), but it slightly under-delivers the
business intent of the aspect.

**Proposal (non-blocking):** before publication (at the paused-real-run / ToS
checkpoint, where the WebFetch verification already happens), tighten `released`
to `YYYY-MM` per model from the same cited source already in each card. No code
change — a registry-value refinement in the slot designed for exactly this.

### O2 — Honesty surface depends on the runner setting provenance; verified correct, worth a guard-rail note

Provenance is set by the runner from *which client it used* (`measure(client,
liveClient !== undefined)`), which is the correct seam (model-v1 §5 B3: provenance
"set by the runner at row-assembly … not inferred later"). It is correct here. The
structural note for the future: there is no type-level barrier preventing a later
contributor from constructing a `measured:true` row from the fixture client by
hand — the honesty invariant lives in the runner's discipline, not the type. Today
it is right and tested; ADR 0004 records the rule. No action needed now; flagging
so the invariant is maintained as the topic grows (e.g., a 4th provider).

---

## Minor suggestions (optional, no rework expected)

- **S1 — `extractJson` recovers the first balanced structure even from prose.** In
  `nested-json.ts`, `extractJson` scans for the first `{`/`[` and balances braces.
  This is appropriately lenient (matches the seed's "models wrap answers in prose"
  philosophy) and correctly returns `undefined` on a parse failure. One edge: a
  string value containing a literal `}` would mis-balance, but the probe prompt
  constrains responses to `{"child":...}`/`"leaf"`, so it cannot arise in practice.
  No change; noting that the lenient extractor's contract is "best-effort recovery,"
  which the tests reflect.
- **S2 — Operational, not structural:** the `package-lock.json` +452-line
  transitive expansion from two SDKs is the surface `npm audit` (already in CI)
  should watch; the dependency-decisions entries name Dependabot as the monitor.
  Consistent with policy; no action.

---

## Cross-artifact coherence

The implementation closes both of my Round-1 required/suggested changes (R2
normalization → §2 above; runner-owned constants → §5 above) and folds in all six
design-v2 amendments verifiably. The Round-1 legal/ToS seam (my prior Concern 1)
now has a structural home: the report's "Publication constraints" note (in Method)
and the design's developer ToS/naming checkpoint at the paused-real-run boundary —
present in `report.ts` and echoed in the generated page. The chain business intent
→ direction → design-v2 → code holds end to end, and ADR 0004 records the anatomy
as a generalization of two topics, matching model-v1 §8.

---

## Summary

- **Decision: Approve with observations.** No must-fix structural items; the gate
  is clear from my lens.
- **Held:** all four model-v1 boundaries; all six design-v2 amendments; both
  requested assessments (SDK pins, `--env-file-if-exists` wiring) structurally
  sound.
- **Before publication (non-blocking, at the existing ToS/real-run checkpoint):**
  O1 — tighten `released` from `"2026"` to `YYYY-MM` per model from the cited
  source.
- **Maintain as the topic grows:** O2 — the measured-provenance invariant lives in
  runner discipline (correct today, ADR-recorded); preserve it when adding
  providers.

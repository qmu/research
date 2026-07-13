# E2E Test Plan — Fundamental LLM model comparison

**Author**: Planner (E2E / external-interface QA)
**Phase/Step**: coding / concurrent-launch
**Status**: plan only — NOT executed. Execution is dispatched by the team lead at
the GATE, after the Constructor reports green and the Architect's review passes.
**Scope boundary**: this plan does not run or mutate `packages/tech`; the
Constructor owns env setup, installs, and the build. The keyed real run (Test
Group D) is **developer-gated** and is documented here, never executed by me.

---

## 0. Objective and lens

Validate, from the outside, that the shipped artifact delivers the three
business outcomes in `direction-v1.md` — a **decision aid**, a **credibility
artifact**, and the **repeatable-practice proof** — with the **honesty** property
the direction makes non-negotiable: a reader can never mistake a fixtured row for
a live measurement. The whole keyless path (Groups A–C) must pass with **zero
credentials and zero spend**, matching the phased-investment business stance.

Test surfaces:
- **CLI**: `npm run compare:fixture` (the keyless pipeline the developer and CI
  both run).
- **Generated artifact**: `docs/research-reports/llm-model-comparison.md`.
- **Built site**: `make build` then `make a11y` (VitePress preview +
  `pa11y-ci`, WCAG 2.2 AA).

Pass/fail is recorded per check below. A failed check is reported back to the
Constructor with the exact observed output; I do not fix code (Constructor's
domain) or perform code review (Architect's domain).

---

## Test Group A — Keyless CLI pipeline (`compare:fixture`)

Precondition: Constructor has run `npm install` in `packages/tech` and reported
the build green. No `.env`, no provider keys present in the environment.

| ID | Step | Expected outcome |
|----|------|------------------|
| A1 | From `packages/tech`, run `npm run compare:fixture` | Exit code 0; no network calls to provider APIs; no thrown error about missing keys. |
| A2 | Observe stdout | A summary table is printed (one row per model); the run completes without requiring any key. |
| A3 | Confirm the run is hermetic | The command succeeds with all three provider keys unset — the fixture path is the default-safe behavior, not an error path. |
| A4 | Re-run A1 a second time | The generated report is byte-stable (deterministic fixture) except for any timestamp field; no diff in the table content. |

**Why (business):** A1–A3 prove the zero-spend reproducible path the credibility
case and CI both depend on. A4 proves determinism, which is what makes the
artifact "re-runnable by a reader and get the same answer" — the core of the
reproducibility claim.

---

## Test Group B — Generated report content & honesty (the credibility core)

Precondition: A1 produced `docs/research-reports/llm-model-comparison.md`.

| ID | Check | Expected outcome |
|----|-------|------------------|
| B1 | YAML frontmatter | Present, with a non-empty `title` and a non-empty `description` (the Astro publish contract — same shape as the seed `llm-benchmark.md`). |
| B2 | 8-column comparison table | A Markdown table with exactly the eight aspects as headers: Provider, Model Name, Released, Cost, Effort Level, Speed, nested-JSON depth, Length accuracy. One data row per model in the registry. |
| B3 | Curated-vs-measured legend | An explicit legend/section that names which columns are **curated reference data** (cited) and which are **measured live**, in reader-facing prose — not only a table styling. |
| B4 | **Fixtured-row honesty (highest stakes)** | For every row produced by the fixture client, the three **measured** cells (Speed, nested-JSON depth, Length accuracy) render as **`n/a (fixtured)`** — NOT a plausible synthetic number — so a skim cannot read a fixtured row as a measurement. |
| B5 | Raw measurement masking | For fixtured rows, raw `elapsedMs` / `outputTokens` are **masked** (not shown as if observed). A fixtured row exposes no number that could be mistaken for a real measurement. |
| B6 | "Scope & limitations" prose | A required prose block stating the probe is **single-sample** and **point-in-time**, restating curated-vs-measured in words, and dating the run. (Closes direction-v1's "honest about its own limits".) |
| B7 | "Publication constraints" prose | A required prose block present (per the fixed plan) — e.g. provider-naming/ToS-respecting framing; factual, non-disparaging claims. Verify it exists and reads as objective. |
| B8 | Per-curated-cell provenance | Curated cells (Provider/Model/Released/Cost/Effort) are traceable to a cited `source` (a citation appears in the report, not only in code). |
| B9 | Method section + mermaid | A "Method" section with a mermaid diagram generated from code (matching the seed's style), describing the curated-registry + live-probe method. |
| B10 | Reproduce section | A "Reproduce" section telling a reader how to regenerate the report (the `compare:fixture` command), so the reproducibility claim is reader-actionable. |

**Why (business):** B2–B3, B8–B10 deliver the decision-aid and credibility value;
B4–B7 are the honesty acceptance criteria that make the published claim
defensible. B4/B5 are the load-bearing ones — if a fixtured row shows a number
that looks measured, the artifact fails its core business promise regardless of
any disclaimer.

---

## Test Group C — Built site & accessibility

Precondition: B-group passes; both reports exist under `docs/research-reports/`.

| ID | Step | Expected outcome |
|----|------|------------------|
| C1 | `make build` | The VitePress site (and packages) build clean; the new report page renders without build errors. |
| C2 | Sidebar IA | The "Research reports" sidebar `items` lists **both** reports (seed `llm-benchmark` + new `llm-model-comparison`); `docs/research-reports/index.md` lists both. (The `items: []` array is no longer empty.) |
| C3 | `make a11y` | `pa11y-ci` against the built preview passes at **WCAG 2.2 AA** with no new violations — the wide 8-column table must keep semantic `<th>` headers and stable heading anchors. |
| C4 | Table accessibility detail | The 8-column comparison table renders with a proper header row (column headers are table headers, not styled text); the legend is conveyed in text, not color-only. |
| C5 | Anchor stability | Section headings (Method, Result/table, Scope & limitations, Reproduce) produce stable, predictable anchors so deep links and AI-agent navigation hold. |

**Why (business):** C2 lands the repeatable-practice proof at the IA level (both
topics co-listed, the practice visibly repeating). C3–C5 honor the AI-native /
accessibility planning stance — the report must be reachable and legible to AI
agents as well as humans, which the direction names as a first-class premise.

---

## Test Group D — Paused real run (DEVELOPER-GATED — documented, NOT executed)

This group is the live-API increment. It is the **opt-in paid step** from the
direction's phased-investment stance and is **not executed by me**. It runs only
after the developer populates `.env` and explicitly authorizes the spend. I
document the acceptance evidence here so the headline honesty behavior is a
*demonstrated outcome*, not an assertion.

**Setup (developer):** populate `.env` with one or more of `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `GOOGLE_API_KEY`. A deliberately **partial-key (one-key) run is
the demonstration vehicle** — it is the cheapest run that exercises both branches
(live and fixtured) in a single report.

| ID | Step | Acceptance evidence |
|----|------|---------------------|
| D1 | `npm run compare` with exactly **one** provider key set | Exit 0; a complete report with **all** model rows is produced (no hard fail on the missing keys). |
| D2 | Keyed provider row | Shows **live** numbers for Speed / nested-JSON depth / Length accuracy, with `measured: true` provenance and real `elapsedMs` / `outputTokens`. |
| D3 | **Unkeyed provider rows (the honesty demonstration)** | Render **`n/a (fixtured)`** in the three measured cells, flagged fixtured exactly as in B4/B5 — provably **not** presented as a live measurement. |
| D4 | Report self-description | The "Scope & limitations" block reflects the real run (run date set; which providers were live vs fixtured stated in prose, consistent with the per-row flags). |
| D5 | Full-key run (optional, developer's discretion) | All three rows live; no fixtured rows; honesty flags consistent. |

**Gate-closing evidence (what "done" looks like for D):** a single rendered report
from a one-key run that simultaneously shows live numbers for the keyed
provider(s) **and** unmistakably-fixtured rows for the unkeyed one(s). That one
artifact is the demonstration that the honesty mechanism works under real
conditions — the business-load-bearing behavior shown, not spot-checked.

**Do-not list for this group:** I do not run `npm run compare`, do not create or
populate `.env`, and do not incur provider spend. The team lead surfaces D to the
developer as the paused real-run gate.

---

## Reporting & exit criteria

- **Keyless gate (A–C) is my executable scope.** I report each group as
  PASS/FAIL with observed evidence (exit codes, the relevant report excerpts, the
  `pa11y-ci` summary). Any FAIL goes back to the Constructor with the exact
  observed output and the failing check ID; I re-run after their fix.
- **D is reported as "ready, developer-gated"** with the acceptance evidence
  above, never as executed-by-me.
- **Definition of E2E done (keyless):** A1–A4, B1–B10, and C1–C5 all PASS — the
  artifact is reproducible with zero spend, reader-honest about curated vs
  measured and about its own limits, and accessible at WCAG 2.2 AA with both
  reports in the IA. D's demonstration is then handed to the developer.

## Notes for the GATE dispatch

- I will execute Groups A–C only after the Constructor reports green AND the
  Architect's analytical review passes (per the Phase Gate Policy).
- If `compare:fixture`'s fixtured rows render synthetic numbers instead of
  `n/a (fixtured)` (B4) or expose raw `elapsedMs`/`outputTokens` (B5), that is a
  **business-critical FAIL**, not a cosmetic one — it breaks the artifact's core
  credibility promise — and I will report it as blocking.

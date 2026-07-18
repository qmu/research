# Design-validation review — first real trial (guideline step 3)

Trial: `2026-07-18T11:29:34.171Z`, 1 repetition, prompt manifest v1 / instrument
`svg-v2` (5 prompts: 3 static + 2 animated), rasterizer `resvg-js@2`, vision
judge `claude-sonnet-5`. 4/4 subject rows `measured`, zero `error` rows.

## Did the measurement work as designed?

Yes, cleanly. All four subjects (Claude Opus 4.8, GPT-5.5, Gemini 3.1 Pro,
Grok 4.3) generated SVG through their completion API, rasterized locally, and
were scored end to end with no instrument fixes required during the run — no
registry drift and no provider-dialect failure surfaced (contrast the
image-generation first trial, which needed two live ACL fixes). Every generated
SVG was read once by the fixed vision judge; no persistent provider resources
were created.

## Did the metrics discriminate between subjects?

Four of the five metrics discriminated; one saturated.

- **Render validity — discriminated.** Gemini 3.1 Pro 0.60 ± 0.55 (n=5) against
  1.00 for the other three. Gemini alone emitted malformed / non-`<svg>`-rooted
  output on part of the manifest.
- **Prompt fidelity — discriminated strongly.** Claude Opus 4.8 1.00 and
  GPT-5.5 1.00, Gemini 3.1 Pro 0.60 ± 0.55, Grok 4.3 0.467 ± 0.51 (n=5). The
  judge marked Grok's SVGs as syntactically valid but semantically off-spec
  (missing constraints such as a single cloud or a recognizable heart) on
  several prompts — cheap, valid, but frequently not what was asked.
- **Generation latency — discriminated sharply.** Claude Opus 4.8 3,461 ± 793 ms
  < GPT-5.5 6,640 ± 2,652 ms < Grok 4.3 9,573 ± 5,439 ms < Gemini 3.1 Pro
  26,003 ± 10,728 ms (n=5 each).
- **Path complexity — discriminated (descriptive).** GPT-5.5 9.0 ± 9.8 > Claude
  Opus 4.8 6.2 ± 2.9 > Grok 4.3 4.0 ± 2.0 > Gemini 3.1 Pro 3.6 ± 2.4. Reported
  as detail, not a verdict.
- **Animation presence — did NOT discriminate (saturated).** All four models
  carried a SMIL/CSS animation on both animated prompts (1.00, n=2). Over only
  two animated prompts the binary metric cannot separate 2026 flagships: every
  subject animates when asked. This is the one v1 weakness — analogous to the
  image-generation manifest-v1 adherence saturation. The natural next
  instrument bump adds more, and harder, animated prompts (multi-element
  timelines, easing/keyframe constraints, begin/end coordination) whose
  presence-and-correctness a mechanical check can grade; per policy that starts
  a new comparability series.

## Did the cost match the estimate?

Yes — under it. Estimate for the trial was ~$0.4593 (generation + 20 judge
reads). Actual generation-only spend was $0.1137 (Claude Opus 4.8 $0.0312 /
1,248 out-tok; GPT-5.5 $0.0709 / 2,365; Gemini 3.1 Pro $0.0101 / 838; Grok 4.3
$0.0015 / 605), plus 20 judge reads at ~$0.0066 each ≈ $0.13, so the benchmark
came in near $0.25 — the estimate over-approximated per-call input tokens.
Including the insights call and the Japanese full-report translation, the whole
trial stayed well under $1 and far inside the agreed $5/trial ceiling.

## Cadence

Monthly cadence confirmed (no revision). The wide latency spread, the
fidelity/validity separation, and the need for a harder animated-prompt set all
justify a recurring series; the off-cadence trigger (a frontier text-model
release at a covered provider) stands.

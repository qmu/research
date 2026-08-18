# 0011 — Gate generational directions on the standard error of the difference

- **Status**: proposed (2026-08-13) — the decision is the owner's, because it
  changes which findings the published article asserts. This record states the
  case and the **measured** consequence; it does not change the gate.
- **Would supersede**: [0008](0008-generational-verdict-sampling.md), which is
  left intact. 0008's reasoning is correct for the problem it solved and stays
  readable as the position this would replace.
- **Related**: [0009](0009-end-to-end-throughput.md) (the throughput definition
  the suppressed directions are about).

## Context

The generational section admits a direction only when

```
|mean_new − mean_former|  >  sd_former + sd_new
```

(`generational-delta.ts`, `outcomeOf`). ADR 0008 added that gate for a good
reason: an identical scoped sweep re-run hours apart moved sustained throughput
by up to 88% on the same configuration, and a bare percentage over three trials
was being published as a generational finding. The gate stopped that.

But `sd` estimates how far *individual trials* scatter, and that does not shrink
as trials are added — only the estimate of it stabilises. The threshold
therefore stands still however much is spent, and **no trial count can convert
an `indistinguishable` result into a supported direction.** The project has no
lever: raising `--trials` buys nothing, and lowering the threshold restores the
defect 0008 fixed.

This is not a bug in the gate. It is a mismatch between the statistic and the
question. The section's claim is about two *means* ("this generation is
faster"); the test is about the two distributions' *spread*.

## Decision (proposed)

Gate the direction on the standard error of the difference of the means,

```
se_diff = sqrt( sd_former² / n_former  +  sd_new² / n_new )
```

admitting a direction when `|difference| > m × se_diff`, with **m = 2** as the
proposed band (the conventional ~95% two-sided interval for a difference of
means). Keep the run-to-run spread column: it is genuinely informative to a
reader, and only its role as the gate would change.

`se_diff` shrinks at 1/√n, so deeper sampling of paired generational
configurations becomes a purchase that buys resolution — which is the property
the current gate lacks.

## The measured consequence

The fear about a looser threshold is that it floods the article with restored
directions, including the Gemini throughput results deliberately suppressed in
`32d5165`. **Measured against every committed frame, it does not.** Reproduce
with:

```sh
# from packages/tech
npm run generational-precision -- --frame <frame.data.json[.gz]>
```

| Frame | Metrics compared | Undecidable (n<2) | Label changes at 2×se |
| ----- | ---------------: | ----------------: | --------------------: |
| `2026-07-26T09-33-50.758Z` | 42 | 18 | **2** |
| `2026-07-27T04-37-01.015Z` | 42 | 18 | **0** |
| `2026-08-04T07-56-39.415Z` | 63 | 27 | **0** |

Both changes are in the one frame, and both **restore** a direction that is
currently withheld:

- `google-gemini-3-5-flash → google-gemini-3-6-flash` [high] Total response
  time: `indistinguishable` → `regressed` (diff 1108.7 ms; dispersion band
  1155.3; 2×se band 977.4; n=3/3)
- `google-gemini-3-1-flash-lite → google-gemini-3-5-flash-lite` [high] Total
  response time: `indistinguishable` → `improved` (diff −696.7 ms; dispersion
  band 743.9; 2×se band 682.7; n=3/3)

No direction is lost, and no throughput direction is restored at three trials —
at n=3 the two bands are close, which is the honest reading: **this change is
not a loosening at the current sample.** What it changes is what more sampling
can do.

## The lever it creates

For each direction still suppressed, the same statistic answers "how many trials
per side would resolve this?" — `n > m² (sd_a² + sd_b²) / diff²`. From the
2026-08-04 frame:

| Trials/side | Direction it would resolve |
| ----------: | -------------------------- |
| 5 | `opus-4-8 → opus-5` [high] Output throughput |
| 5 | `opus-4-8 → opus-5` [high] Time to first token |
| 5 | `gemini-3-1-flash-lite → gemini-3-5-flash-lite` [high] Output throughput |
| 7 | `opus-4-8 → opus-5` [high] Length accuracy |
| 12 | `opus-4-8 → opus-5` [max] Output throughput |
| 573 | `gemini-3-5-flash → gemini-3-6-flash` [low] Output throughput |

Twelve of the 2026-08-04 frame's suppressed directions are resolvable within
1000 trials/side; five of them within 12. That last row is equally useful: it
says the low-effort Gemini throughput difference is **not** worth buying, which
today's gate cannot tell anyone.

## What is implemented, and what is not

`packages/tech/src/llm-model-comparison/domain/generational-precision.ts`
computes the statistic, both bands, and `trialsToResolve`, with unit coverage at
several `n` asserting the load-bearing property (same measured spread, larger
`n`, narrower band). `analyze-generational-precision.ts` produces the table
above from any frame.

**None of it is wired into the gate.** `outcomeOf` is unchanged, every published
label is unchanged, and every committed artifact is byte-identical. Adopting
this ADR means changing `measuredDeltasFor` to pass the precision band and
re-rendering the frames; that is a short change and is deliberately not made
here.

## Open, for the owner

1. **Adopt, or keep 0008?** The measured cost of adopting is two restored
   directions, both in a superseded frame.
2. **What band?** `m = 2` is proposed. The analyzer takes `--band`, so 1.5 or
   2.5 can be measured before choosing.
3. **Sample paired configurations deeper?** Five trials per side on the
   `opus-4-8 → opus-5` pair would resolve three of its directions. That is a
   spend decision, and it only makes sense if this ADR is adopted — under the
   current gate the extra trials change nothing.

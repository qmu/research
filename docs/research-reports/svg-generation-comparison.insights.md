---
source_artifact: svg-generation-comparison.real.data.json
source_commit: 8da6dbf
insights_model: claude-sonnet-5
generated_at: 2026-07-18T11:34:26.547Z
trials: 1
provenance: llm-insights
---
Across the five test prompts, the clearest signal in this artifact is that Claude Opus 4.8 was the only model to combine perfect render validity (5/5), perfect prompt fidelity (5/5), and the lowest mean generation latency (3,461 ms) of the four systems measured. That combination — reliable, on-spec, and fast — makes it the strongest default choice when a pipeline needs SVGs it can render and trust without a validation/retry loop. GPT-5.5 matched it on validity and fidelity (also 1.0/1.0) but took roughly 92% longer on average (6,639.8 ms mean) and showed much wider latency variance (stdDev 2,651.5 ms vs. Claude's 792.9 ms), so it's a viable fallback where output quality matters more than turnaround time.

Cost and reliability do not move together in this data, which is the key trade-off for anyone optimizing spend. Grok 4.3 has by far the cheapest measured token pricing ($1.25/$2.5 per MTok in/out) and still rendered valid SVG on every call (renderValidity mean 1.0), but its prompt fidelity averaged only 0.467 — the judge marked it as missing constraints like "single cloud" or a recognizable heart shape in two of five prompts. That means Grok's SVGs are syntactically fine but frequently miss the semantic ask, so cheap tokens can translate into unusable output that still requires re-generation or manual correction. Gemini 3.1

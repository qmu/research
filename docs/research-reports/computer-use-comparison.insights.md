---
source_artifact: computer-use-comparison.real.data.json
source_commit: 19e2e3b
insights_model: claude-sonnet-5
generated_at: 2026-07-18T15:19:36.885Z
trials: 1
provenance: llm-insights
---
Across this pinned 8-task Playwright suite, only Anthropic's Claude Sonnet 5 (Computer Use) produced a working, comparably measured run, and even there task success was low: 2 of 8 tasks succeeded (25% mean success rate). The other two entrants are not usable as performance comparisons in this artifact — OpenAI's computer-use-preview run is marked provenance "error" (the browser context/page closed mid-run), yielding zero completed calls and no stats, while Google's Gemini 2.5 Computer Use nominally "ran" all 8 tasks but recorded a 0% success rate with stepsToComplete reported at n=0 and latencyPerActionMs at 0 across every call. That pattern (near-instant wall-clock times of roughly 3.5–4 seconds, sub-cent costs, but no recorded steps or action latency) reads as the model failing to engage the computer-use action loop at all, not as an efficient completion — it should not be interpreted as "Gemini finishes tasks in under 4 seconds for $0.003," but as "Gemini's calls terminated without taking measurable actions."

Within the Anthropic run itself, the numbers show a sharp bifurcation rather than a smooth cost/latency curve. The two successful tasks (open-product-from-catalog, add-two-items-to-cart) completed in 1 and 3 steps respectively, in under 11 seconds, for $0.02–

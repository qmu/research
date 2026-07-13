---
source_artifact: llm-accuracy-comparison.real.data.json
source_commit: e522aa0
insights_model: claude-sonnet-5
generated_at: 2026-07-12T07:41:40.373Z
trials: 1
provenance: llm-insights
---
## LLM Output Accuracy: JSON-Schema Limits, Length Following, and Information Accuracy

The most decision-relevant finding is that **structural output limits are governed by API/provider architecture, not by "model intelligence."** Anthropic's tool-calling grammar compiler rejects schemas above roughly 72–73 flat string fields ("compiled grammar is too large") regardless of model tier (Haiku, Sonnet, Opus, and Fable-5 all cap in that same 72–73 breadth range), and nested-object depth becomes unreliable past ~20–21 levels, with intermittent 503s and 180-second timeouts appearing even below that ceiling (e.g., depth 22–24 failures recur across nearly every Anthropic config tested). OpenAI's `response_format` schema validator enforces a **hard 10-level nesting cap** (a 400 "exceeds limit of 10" error) across every GPT-5.x, o4-mini, and Codex variant, but tolerates much wider breadth (192 fields tested successfully). Google's Gemini models sit in between (depth ~15, breadth 192 both usable), while xAI's Grok models tolerated the deepest nesting observed — Grok 4.3 reached depth 48 successfully at "none"/"low" effort, and depth 22 at "high" effort before 180-second timeouts appeared at depth 23+. This suggests that if a use case requires deeply nested JSON extraction (>20 levels), Grok or Gemini are the only options tested that don't hit a hard architectural wall; if it requires very wide flat objects (>73 fields), avoid Anthropic's tool-schema path specifically.

On length-instruction following, most configurations achieved lengthAccuracy at or near 1.0, but the artifact surfaces several **effort-level regressions worth flagging as a trade-off, not a bug**: Gemini 3.5 Flash's length accuracy *fell* from 1.0 (low effort) to 0.27 (medium) to 0.15 (high) even as raw throughput stayed high (221–267 tok/s) — i.e., "smarter" settings produced faster but far less length-compliant prose in this single-trial run. Similarly, GPT-5.5 at xhigh effort, o4-mini at high effort, and Grok Sonnet 5 at max effort each recorded lengthAccuracy of 0, generally corresponding to truncated, malformed, or reasoning-leakage output (raw text showing model "thinking out loud" instead of the requested paragraph). This indicates that higher reasoning-effort settings are **not a safe default for format-constrained generation tasks** and should be validated per-task rather than assumed to strictly improve output quality.

The **informationAccuracy metric itself was not measured** in this sweep — the artifact explicitly lists it under `omittedMetrics`. Everything reported here is a proxy (schema conformance, length matching) rather than a direct measurement of factual correctness, so any factual-accuracy claims about these models cannot be grounded in this data and should be treated as an open gap for future measurement.

On the speed/latency axis, time-to-first-token spans nearly three orders of magnitude: sub-400ms for small, fast models (GPT-5.4-nano low effort: 368ms TTFT) versus multi-second waits for reasoning-heavy configurations (Grok Build 0.1: 9.5s TTFT; Claude Son

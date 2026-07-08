---
source_artifact: llm-model-comparison.real.data.json
source_commit: 834ade8
insights_model: claude-sonnet-5
generated_at: 2026-07-08T20:41:22.634Z
trials: 1
provenance: llm-insights
---
The single most decision-relevant pattern in this artifact is that **effort/reasoning level does not reliably buy quality** — it often trades away basic instruction-following for marginal throughput gains, and sometimes breaks output integrity outright. For example, Gemini 3.5 Flash at medium effort measured 254.7 tok/s throughput but a lengthAccuracy of just 0.27, and at high effort dropped further to 0.15, while its low-effort sibling scored a clean 1.0 at slower (267 tok/s) but still strong speed. Similarly, Claude Sonnet 5 at "xhigh" effort recorded lengthAccuracy of 0 and visibly truncated output (`""` for the length probe), and o4-mini at "high" effort produced 0 lengthAccuracy alongside garbled JSON with stray reasoning text ("Oops invalid... need correct JSON") leaking into the response body. This suggests that for tasks with strict output-length or format constraints, dialing effort up can measurably *reduce* reliability rather than improve it — a counterintuitive result worth testing before assuming "more thinking" is safer.

Second, structured-output ceilings are largely a **provider/platform artifact, not a raw-capability signal**. OpenAI's Responses/Chat APIs hard-reject schemas beyond 10 levels of nesting (`400 Invalid schema... 16 levels of nesting exceeds limit of 10`), regardless of model tier — this affected GPT-5.5, GPT-5.4, GPT-5.4-mini/nano, and o4-mini identically. Google's Gemini models hit a similar wall around 15 levels (`400 Request contains an invalid argument`) but tolerated breadths up to 192 fields cleanly. Anthropic's Claude family had no hard API cap but instead degraded via timeouts and 503s starting around depth 22–32

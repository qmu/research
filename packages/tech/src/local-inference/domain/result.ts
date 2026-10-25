/** Per-request observations; no cross-engine ranking or steady-state aggregation. */
export const engines = ["ollama", "llama.cpp", "mlx", "strata"] as const;
export type Engine = (typeof engines)[number];
export type Measurement =
  | { value: number; unit: string; source: "client" | "usage" | "os-sampler" }
  | {
      value: null;
      unit: string;
      reason: "NO-FIELD" | "NOT-RUN" | "MEASURE-FAILED";
    };
export type Observation = {
  firstMs?: number;
  lastMs?: number;
  completionTokens?: number;
};
export function metrics(observation: Observation, failed = false) {
  const gap = (
    unit: string,
    reason: "NO-FIELD" | "NOT-RUN" | "MEASURE-FAILED",
  ): Measurement => ({ value: null, unit, reason });
  const measured = (
    value: number,
    unit: string,
    source: "client" | "usage",
  ): Measurement => ({ value, unit, source });
  const { firstMs, lastMs, completionTokens } = observation;
  const reason = failed ? "MEASURE-FAILED" : "NO-FIELD";
  return {
    ttft:
      !failed && firstMs !== undefined
        ? measured(firstMs / 1000, "s", "client")
        : gap("s", reason),
    completion_tokens:
      !failed && completionTokens !== undefined
        ? measured(completionTokens, "tokens", "usage")
        : gap("tokens", reason),
    tps:
      !failed &&
      completionTokens !== undefined &&
      firstMs !== undefined &&
      lastMs !== undefined &&
      lastMs > firstMs
        ? measured(
            completionTokens / ((lastMs - firstMs) / 1000),
            "tokens/s",
            "client",
          )
        : gap("tokens/s", reason),
    startup_time: gap("s", "NOT-RUN"),
    peak_rss: gap("MiB", "NOT-RUN"),
  };
}

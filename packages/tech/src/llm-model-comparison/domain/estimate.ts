// Pre-run cost/time estimate. The redesigned sweep is large and costly — model ×
// effort × probe × trial, plus a judge call per configuration — so the runner
// MUST show the owner the bill before making a single paid call. This is the pure
// arithmetic behind that estimate and behind the `--estimate` dry-run; the token
// assumptions are the runner's policy, passed in.

import type { RunEstimate } from "./types";

// One configuration's price, from the curated registry.
export type ConfigPrice = Readonly<{
  inputCostPerMTok: number;
  outputCostPerMTok: number;
}>;

export type EstimateParams = Readonly<{
  configs: ReadonlyArray<ConfigPrice>;
  probeCallsPerConfig: number; // probe API calls per config, across all trials
  avgInputTokensPerCall: number; // rough assumption for the probe calls
  avgOutputTokensPerCall: number;
  judgeInputTokens: number; // per configuration (one judge call each)
  judgeOutputTokens: number;
  judgeInputCostPerMTok: number;
  judgeOutputCostPerMTok: number;
  secondsPerCall: number; // rough ETA per API call
}>;

const perMTok = (tokens: number, pricePerMTok: number): number =>
  (tokens / 1_000_000) * pricePerMTok;

// Compute the call count, a rough USD cost, and an ETA for a full real sweep.
// Call count is exact (probe calls + one judge call per config); the cost is an
// order-of-magnitude figure from the token assumptions and registry prices, and
// is labelled as such wherever it is shown. The judge cost is priced separately
// because the judge is a single fixed model, not the model under test.
export const estimateRun = (params: EstimateParams): RunEstimate => {
  const {
    configs,
    probeCallsPerConfig,
    avgInputTokensPerCall,
    avgOutputTokensPerCall,
    judgeInputTokens,
    judgeOutputTokens,
    judgeInputCostPerMTok,
    judgeOutputCostPerMTok,
    secondsPerCall,
  } = params;

  const configCount = configs.length;
  const callCount = configCount * (probeCallsPerConfig + 1); // +1 judge per config

  const probeCost = configs.reduce(
    (sum, c) =>
      sum +
      probeCallsPerConfig *
        (perMTok(avgInputTokensPerCall, c.inputCostPerMTok) +
          perMTok(avgOutputTokensPerCall, c.outputCostPerMTok)),
    0,
  );
  const judgeCost =
    configCount *
    (perMTok(judgeInputTokens, judgeInputCostPerMTok) +
      perMTok(judgeOutputTokens, judgeOutputCostPerMTok));

  return {
    configCount,
    callCount,
    usdCost: probeCost + judgeCost,
    etaMinutes: (callCount * secondsPerCall) / 60,
  };
};

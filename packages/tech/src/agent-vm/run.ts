import {
  coldStartValues,
  percentile,
  summarizeStat,
  taskCostUsd,
} from "./domain/probe";
import type {
  AgentVmResult,
  ProbeSample,
  SandboxMeasurement,
  SandboxProviderCard,
  SandboxRun,
} from "./domain/types";
import {
  AGENT_VM_INSTRUMENT_VERSION,
  FIXED_TASK,
  FIXTURE_COLD_START_BASE_MS,
  SANDBOX_PROVIDERS,
} from "./models";
import { createFixtureSandboxProvisioner } from "../vendors/sandbox/fixture";
import type {
  SandboxProvisioner,
  SandboxProvisionerFactory,
} from "../vendors/sandbox/types";

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export type AgentVmRunOptions = Readonly<{
  fixture: boolean;
  repetitions: number;
  providerIds?: ReadonlyArray<string>;
  /** Overrides the provisioner source (tests inject; real mode has no adapters
   * yet, so the default real factory returns undefined for every provider). */
  provisionerFactory?: SandboxProvisionerFactory;
}>;

const selectCards = (
  providerIds?: ReadonlyArray<string>,
): ReadonlyArray<SandboxProviderCard> =>
  providerIds === undefined
    ? SANDBOX_PROVIDERS
    : SANDBOX_PROVIDERS.filter((card) => providerIds.includes(card.id));

const unreachable = (repetitions: number): SandboxMeasurement => ({
  provenance: "unreachable",
  repetitions,
  coldStartMsP50: 0,
  coldStartMsP95: 0,
  coldStartStat: { mean: 0, stdDev: 0, n: 0 },
  warmReuseMs: 0,
  fixedTaskWallClockMs: 0,
  measuredCostUsd: 0,
  samples: [],
});

const measureProvider = async (
  card: SandboxProviderCard,
  provisioner: SandboxProvisioner,
  repetitions: number,
  fixture: boolean,
): Promise<SandboxMeasurement> => {
  try {
    const samples: ProbeSample[] = [];
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      samples.push({ repetition, coldStartMs: await provisioner.bootCold() });
    }
    const warmReuseMs = await provisioner.reuseWarm();
    const fixedTaskWallClockMs = await provisioner.runTask(FIXED_TASK);
    await provisioner.teardown();
    const cold = coldStartValues(samples);
    return {
      provenance: fixture ? "fixtured" : "measured",
      repetitions,
      coldStartMsP50: percentile(cold, 0.5),
      coldStartMsP95: percentile(cold, 0.95),
      coldStartStat: summarizeStat(cold),
      warmReuseMs,
      fixedTaskWallClockMs,
      measuredCostUsd: taskCostUsd(card, fixedTaskWallClockMs),
      samples,
    };
  } catch (error: unknown) {
    // A failed probe never fakes numbers: it records an error row so the report
    // shows an honest gap. Best effort to release anything provisioned.
    try {
      await provisioner.teardown();
    } catch {
      // teardown failure is already implied by the error row.
    }
    return {
      ...unreachable(repetitions),
      provenance: "error",
      error: String(error),
    };
  }
};

const defaultFactory = (fixture: boolean): SandboxProvisionerFactory =>
  fixture
    ? (providerId) => createFixtureSandboxProvisioner(providerId)
    : // Real adapters are a gated follow-up; until they exist every provider is
      // unreachable on the real path and the report says so.
      () => undefined;

export const runAgentVm = async (
  options: AgentVmRunOptions,
): Promise<AgentVmResult> => {
  const { fixture, repetitions } = options;
  const factory = options.provisionerFactory ?? defaultFactory(fixture);
  const cards = selectCards(options.providerIds);

  const runs: SandboxRun[] = [];
  for (const card of cards) {
    const provisioner = factory(card.id);
    const measurement =
      provisioner === undefined
        ? unreachable(repetitions)
        : await measureProvider(card, provisioner, repetitions, fixture);
    runs.push({ card, measurement });
  }

  return {
    generatedAt: fixture ? FIXTURE_TIMESTAMP : new Date().toISOString(),
    fixture,
    repetitions,
    instrumentVersion: Number(AGENT_VM_INSTRUMENT_VERSION),
    task: FIXED_TASK,
    runs,
    artifactPath: "agent-vm-comparison.data.json",
  };
};

/**
 * Cost/ETA preview for a real run. No provider is booted. The estimate models
 * each provider's boot time from the landscape base timings and prices the
 * fixed task's vCPU-seconds at the published rate — an order-of-magnitude
 * figure, labelled as such, that decides against the agreed ceiling.
 */
export const estimateAgentVm = (
  providerIds: ReadonlyArray<string> | undefined,
  repetitions: number,
): string => {
  const cards = selectCards(providerIds);
  const reachable = cards.filter((card) => card.apiReachable);
  const taskSeconds = 118 / 1000;
  let totalUsd = 0;
  let totalBootSeconds = 0;
  for (const card of cards) {
    const bootMs = FIXTURE_COLD_START_BASE_MS[card.id] ?? 500;
    const bootSeconds = (bootMs / 1000) * repetitions;
    totalBootSeconds += bootSeconds;
    // Compute-time cost of the boots + the fixed task, one vCPU.
    totalUsd +=
      ((bootSeconds + taskSeconds) / 3600) * card.publishedVcpuHourUsd;
  }
  const boots = cards.length * repetitions;
  return [
    `agent-vm estimate: ${cards.length} provider(s), ${repetitions} cold-start rep(s) each`,
    `  reachable now: ${reachable.length}/${cards.length} (no probe adapter → the rest stay catalog-only until adapters land)`,
    `  boots: ${boots}; approx boot wall-clock: ~${totalBootSeconds.toFixed(1)}s (sequential)`,
    `  approx compute cost: ~$${totalUsd.toFixed(4)} (order-of-magnitude; excludes per-boot minimums and account/egress fees)`,
    `  NOTE: real numbers require credentials + a gated approval; run --estimate before every real run.`,
  ].join("\n");
};

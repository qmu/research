import type { FixedTask, SandboxProviderCard } from "./domain/types";

/**
 * Curated registry of the agent VM / sandbox providers this topic compares —
 * the single source of truth for subjects, reference prices, and capability.
 * Every value is curated catalog data with a cited source and a last-verified
 * date, NOT a live measurement; published prices are the provider's listed
 * standard-tier rate and MUST be reconfirmed at trial time (they move often).
 *
 * `apiReachable: false` marks a provider that has no probe adapter yet — it
 * stays catalog-only until a `vendors/sandbox` adapter is added (a gated
 * follow-up ticket), and its measured cells read `unreachable`.
 */
export const SANDBOX_PROVIDERS: ReadonlyArray<SandboxProviderCard> = [
  {
    id: "aws-lambda-microvm",
    providerName: "AWS Lambda microVMs",
    isolationModel: "firecracker",
    publishedVcpuHourUsd: 0.1,
    publishedGbHourUsd: 0.011,
    billingGranularity: "per-100ms",
    maxRuntimeSeconds: 900,
    snapshotResume: false,
    filesystemPersistence: "ephemeral",
    networkEgress: "restricted",
    gpuAvailable: false,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://aws.amazon.com/lambda/pricing/",
  },
  {
    id: "fly-machines",
    providerName: "Fly.io Machines",
    isolationModel: "firecracker",
    publishedVcpuHourUsd: 0.0219,
    publishedGbHourUsd: 0.0053,
    billingGranularity: "per-second",
    maxRuntimeSeconds: null,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: true,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://fly.io/docs/about/pricing/",
  },
  {
    id: "e2b",
    providerName: "E2B",
    isolationModel: "firecracker",
    publishedVcpuHourUsd: 0.1,
    publishedGbHourUsd: 0.0108,
    billingGranularity: "per-second",
    maxRuntimeSeconds: 86_400,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: false,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://e2b.dev/docs/pricing",
  },
  {
    id: "modal",
    providerName: "Modal",
    isolationModel: "gvisor",
    publishedVcpuHourUsd: 0.135,
    publishedGbHourUsd: 0.0067,
    billingGranularity: "per-second",
    maxRuntimeSeconds: 86_400,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: true,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://modal.com/pricing",
  },
  {
    id: "daytona",
    providerName: "Daytona",
    isolationModel: "container",
    publishedVcpuHourUsd: 0.05,
    publishedGbHourUsd: 0.0125,
    billingGranularity: "per-second",
    maxRuntimeSeconds: null,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: true,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://www.daytona.io/pricing",
  },
  {
    id: "cloudflare-sandbox",
    providerName: "Cloudflare Containers / Sandbox SDK",
    isolationModel: "container",
    publishedVcpuHourUsd: 0.072,
    publishedGbHourUsd: 0.009,
    billingGranularity: "per-second",
    maxRuntimeSeconds: null,
    snapshotResume: false,
    filesystemPersistence: "ephemeral",
    networkEgress: "open",
    gpuAvailable: false,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://developers.cloudflare.com/containers/pricing/",
  },
  {
    id: "vercel-sandbox",
    providerName: "Vercel Sandbox",
    isolationModel: "firecracker",
    publishedVcpuHourUsd: 0.128,
    publishedGbHourUsd: 0.0212,
    billingGranularity: "per-second",
    maxRuntimeSeconds: 2_700,
    snapshotResume: false,
    filesystemPersistence: "ephemeral",
    networkEgress: "open",
    gpuAvailable: false,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://vercel.com/docs/vercel-sandbox",
  },
  {
    id: "northflank",
    providerName: "Northflank Sandboxes",
    isolationModel: "kata",
    publishedVcpuHourUsd: 0.01667,
    publishedGbHourUsd: 0.00833,
    billingGranularity: "per-second",
    maxRuntimeSeconds: null,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: true,
    apiReachable: false,
    lastVerified: "2026-07-14",
    source: "https://northflank.com/pricing",
  },
];

/**
 * The fixed CPU workload every provider boots and runs, so the fixed-task
 * wall-clock is comparable across subjects. A bounded, deterministic compute
 * (no network, no disk) keeps the measurement about the platform, not the task.
 */
export const FIXED_TASK: FixedTask = {
  id: "cpu-bound-loop-v1",
  description:
    "A bounded CPU loop (fixed iteration count) run inside a warm sandbox; wall-clock isolates platform compute, not I/O.",
};

/**
 * Instrument version. Bumped whenever the fixed task or the tracked metric set
 * changes, so trend charts connect only same-version history points (a metric
 * measured under a different task is not comparable). See `domain/history.ts`.
 */
export const AGENT_VM_INSTRUMENT_VERSION = "1";

/** Deterministic per-provider fixture timings (ms), grounded in the 2026-07
 * landscape survey. Used ONLY by the keyless fixture provisioner so the
 * self-test renders a realistic, byte-stable page without booting anything. */
export const FIXTURE_COLD_START_BASE_MS: Readonly<Record<string, number>> = {
  "aws-lambda-microvm": 600,
  "fly-machines": 2_800,
  e2b: 90,
  modal: 400,
  daytona: 150,
  "cloudflare-sandbox": 500,
  "vercel-sandbox": 250,
  northflank: 1_200,
};

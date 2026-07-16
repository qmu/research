/**
 * Anti-corruption port for agent VM / sandbox providers. Named in domain terms
 * (boot / reuse / run / teardown), so a provider SDK is swappable and no vendor
 * type leaks into `agent-vm/domain`. Real adapters (E2B, Modal, Fly, …) are
 * gated follow-ups; the keyless `fixture` provisioner implements this shape for
 * CI. The direction is ours → this port → theirs.
 */

/** The fixed CPU workload a provisioner runs inside a warm sandbox. */
export type SandboxTask = Readonly<{
  id: string;
  description: string;
}>;

/**
 * A live handle to one provider. Every method returns a latency in
 * milliseconds; `teardown` releases whatever the provisioner allocated (a real
 * adapter MUST leave zero orphaned sandboxes, mirroring the RAG teardown
 * guarantee).
 */
export type SandboxProvisioner = Readonly<{
  provider: string;
  /** Boot a fresh sandbox from cold; resolve with the boot latency (ms). */
  bootCold: () => Promise<number>;
  /** Reuse an already-warm sandbox; resolve with the reuse latency (ms). */
  reuseWarm: () => Promise<number>;
  /** Run the fixed task in a warm sandbox; resolve with wall-clock (ms). */
  runTask: (task: SandboxTask) => Promise<number>;
  /** Release every provisioned resource. Safe to call more than once. */
  teardown: () => Promise<void>;
}>;

/** Factory a runner uses to obtain a provisioner for a provider id, or
 * `undefined` when no adapter/credential is available (→ `unreachable`). */
export type SandboxProvisionerFactory = (
  providerId: string,
) => SandboxProvisioner | undefined;

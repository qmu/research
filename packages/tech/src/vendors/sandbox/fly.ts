import type { SandboxProvisioner, SandboxTask } from "./types";

/**
 * Fly.io Machines adapter for the sandbox probe, over the documented Machines
 * REST API (https://fly.io/docs/machines/api/). No Fly SDK dependency — plain
 * HTTP through an injectable transport, so the create→poll→started timing and
 * teardown are unit-testable without a live token. Effect boundary only; no
 * vendor type escapes into `agent-vm/domain`.
 *
 * Cold start = wall-clock from `create machine` to the machine reporting
 * `started`. Warm reuse = stop→start the same machine. Fixed task = one `exec`.
 * Teardown force-deletes every machine created. The exact `exec`/metric shapes
 * are confirmed against live Fly on the first real run; a wrong response
 * degrades to an honest `error` row (the runner wraps each provider in try/catch).
 */

export type HttpResponse = Readonly<{
  status: number;
  json: () => Promise<unknown>;
}>;

export type HttpTransport = (
  url: string,
  init: Readonly<{
    method: string;
    headers: Readonly<Record<string, string>>;
    body?: string;
  }>,
) => Promise<HttpResponse>;

export type FlyMachinesConfig = Readonly<{
  token: string;
  appName: string;
  /** Image the probe boots; a tiny public image keeps boot about the platform. */
  image: string;
  region?: string;
  /** Guest size preset, e.g. "shared-cpu-1x". */
  size?: string;
  baseUrl?: string;
  pollIntervalMs?: number;
  maxPollMs?: number;
  transport?: HttpTransport;
  /** Millisecond clock; injected so timing is deterministic in tests. */
  clock?: () => number;
  /** Await between polls; injected so tests don't really wait. */
  sleep?: (ms: number) => Promise<void>;
}>;

const DEFAULT_BASE = "https://api.machines.dev/v1";

/** Fly machine states that mean the guest is up and running. */
export const isStartedState = (state: unknown): boolean => state === "started";

/** Extract the machine id from a create response, or throw a clear error. */
export const machineIdOf = (payload: unknown): string => {
  const id = (payload as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || id === "") {
    throw new Error("Fly create machine returned no id");
  }
  return id;
};

const realFetch: HttpTransport = async (url, init) => {
  const response = await fetch(url, init);
  return { status: response.status, json: () => response.json() };
};

export const createFlyMachinesProvisioner = (
  config: FlyMachinesConfig,
): SandboxProvisioner => {
  const base = config.baseUrl ?? DEFAULT_BASE;
  const transport = config.transport ?? realFetch;
  const clock = config.clock ?? (() => Date.now());
  const sleep =
    config.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const pollIntervalMs = config.pollIntervalMs ?? 150;
  const maxPollMs = config.maxPollMs ?? 60_000;
  const created: string[] = [];

  const headers = {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
  } as const;
  const machinesUrl = `${base}/apps/${config.appName}/machines`;

  const request = async (
    url: string,
    method: string,
    body?: unknown,
  ): Promise<unknown> => {
    const response = await transport(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status >= 400) {
      throw new Error(`Fly ${method} ${url} → HTTP ${response.status}`);
    }
    return response.json();
  };

  const waitStarted = async (id: string): Promise<void> => {
    const deadline = clock() + maxPollMs;
    for (;;) {
      const payload = await request(`${machinesUrl}/${id}`, "GET");
      if (isStartedState((payload as { state?: unknown }).state)) return;
      if (clock() >= deadline) {
        throw new Error(
          `Fly machine ${id} did not start within ${maxPollMs}ms`,
        );
      }
      await sleep(pollIntervalMs);
    }
  };

  const createStarted = async (): Promise<{
    id: string;
    elapsedMs: number;
  }> => {
    const start = clock();
    const payload = await request(machinesUrl, "POST", {
      region: config.region,
      config: {
        image: config.image,
        guest: { cpu_kind: "shared", cpus: 1, memory_mb: 256 },
        ...(config.size === undefined ? {} : { size: config.size }),
      },
    });
    const id = machineIdOf(payload);
    created.push(id);
    await waitStarted(id);
    return { id, elapsedMs: clock() - start };
  };

  let lastId: string | undefined;

  return {
    provider: "fly-machines",
    bootCold: async () => {
      const { id, elapsedMs } = await createStarted();
      lastId = id;
      return elapsedMs;
    },
    reuseWarm: async () => {
      if (lastId === undefined) return (await createStarted()).elapsedMs;
      const start = clock();
      await request(`${machinesUrl}/${lastId}/stop`, "POST");
      await request(`${machinesUrl}/${lastId}/start`, "POST");
      await waitStarted(lastId);
      return clock() - start;
    },
    runTask: async (task: SandboxTask) => {
      if (lastId === undefined) throw new Error("no warm machine for task");
      const start = clock();
      await request(`${machinesUrl}/${lastId}/exec`, "POST", {
        command: ["/bin/sh", "-c", `: ${task.id}`],
      });
      return clock() - start;
    },
    teardown: async () => {
      for (const id of created.splice(0)) {
        try {
          await request(`${machinesUrl}/${id}?force=true`, "DELETE");
        } catch {
          // Surface nothing here; an orphan is caught by the post-run sweep.
        }
      }
      lastId = undefined;
    },
  };
};

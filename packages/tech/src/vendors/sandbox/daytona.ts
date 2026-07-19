import type { SandboxProvisioner, SandboxTask } from "./types";

/**
 * Daytona adapter for the sandbox probe, over the documented Daytona REST API
 * (https://www.daytona.io/docs/tools/api/). No Daytona SDK dependency — plain
 * HTTP through an injectable transport, so the create→poll→started timing, the
 * stop→start warm reuse, the toolbox exec, and the force-delete teardown are
 * unit-testable without a live token. Effect boundary only; no vendor type
 * escapes into `agent-vm/domain`.
 *
 * Cold start = wall-clock from `POST /sandbox` to the sandbox reporting
 * `started`. Warm reuse = stop→start the same sandbox. Fixed task = one toolbox
 * `process/execute`. Teardown force-deletes every sandbox created. The control
 * plane and the toolbox exec live on different hosts (`app.daytona.io/api` vs
 * `proxy.app.daytona.io/toolbox`), both overridable for tests. The exact exec
 * response shape is confirmed against live Daytona on the first real run; a
 * wrong response degrades to an honest `error` row (the runner wraps each
 * provider in try/catch).
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

export type DaytonaConfig = Readonly<{
  token: string;
  /** Snapshot/image the probe boots; empty body uses the account default. */
  snapshot?: string;
  /** Optional target region/class passed straight through to create. */
  target?: string;
  baseUrl?: string;
  toolboxUrl?: string;
  pollIntervalMs?: number;
  maxPollMs?: number;
  transport?: HttpTransport;
  /** Millisecond clock; injected so timing is deterministic in tests. */
  clock?: () => number;
  /** Await between polls; injected so tests don't really wait. */
  sleep?: (ms: number) => Promise<void>;
}>;

const DEFAULT_BASE = "https://app.daytona.io/api";
const DEFAULT_TOOLBOX = "https://proxy.app.daytona.io/toolbox";

/** Daytona sandbox state that means the guest is up and running. */
export const isDaytonaStarted = (state: unknown): boolean =>
  state === "started";

/** Extract the sandbox id from a create response, or throw a clear error. */
export const sandboxIdOf = (payload: unknown): string => {
  const id = (payload as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || id === "") {
    throw new Error("Daytona create sandbox returned no id");
  }
  return id;
};

const realFetch: HttpTransport = async (url, init) => {
  const response = await fetch(url, init);
  return { status: response.status, json: () => response.json() };
};

export const createDaytonaProvisioner = (
  config: DaytonaConfig,
): SandboxProvisioner => {
  const base = config.baseUrl ?? DEFAULT_BASE;
  const toolbox = config.toolboxUrl ?? DEFAULT_TOOLBOX;
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
  const sandboxUrl = `${base}/sandbox`;

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
      throw new Error(`Daytona ${method} ${url} → HTTP ${response.status}`);
    }
    return response.json();
  };

  const waitStarted = async (id: string): Promise<void> => {
    const deadline = clock() + maxPollMs;
    for (;;) {
      const payload = await request(`${sandboxUrl}/${id}`, "GET");
      if (isDaytonaStarted((payload as { state?: unknown }).state)) return;
      if (clock() >= deadline) {
        throw new Error(
          `Daytona sandbox ${id} did not start within ${maxPollMs}ms`,
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
    const payload = await request(sandboxUrl, "POST", {
      ...(config.snapshot === undefined ? {} : { snapshot: config.snapshot }),
      ...(config.target === undefined ? {} : { target: config.target }),
    });
    const id = sandboxIdOf(payload);
    created.push(id);
    await waitStarted(id);
    return { id, elapsedMs: clock() - start };
  };

  let lastId: string | undefined;

  return {
    provider: "daytona",
    bootCold: async () => {
      const { id, elapsedMs } = await createStarted();
      lastId = id;
      return elapsedMs;
    },
    reuseWarm: async () => {
      if (lastId === undefined) return (await createStarted()).elapsedMs;
      const start = clock();
      await request(`${sandboxUrl}/${lastId}/stop`, "POST");
      await request(`${sandboxUrl}/${lastId}/start`, "POST");
      await waitStarted(lastId);
      return clock() - start;
    },
    runTask: async (task: SandboxTask) => {
      if (lastId === undefined) throw new Error("no warm sandbox for task");
      const start = clock();
      await request(`${toolbox}/${lastId}/process/execute`, "POST", {
        command: `: ${task.id}`,
      });
      return clock() - start;
    },
    teardown: async () => {
      for (const id of created.splice(0)) {
        try {
          await request(`${sandboxUrl}/${id}?force=true`, "DELETE");
        } catch {
          // Surface nothing here; an orphan is caught by the post-run sweep.
        }
      }
      lastId = undefined;
    },
  };
};

import { describe, expect, it } from "vitest";
import {
  createDaytonaProvisioner,
  isDaytonaStarted,
  sandboxIdOf,
  type HttpResponse,
  type HttpTransport,
} from "./daytona";

describe("daytona helpers", () => {
  it("isDaytonaStarted only accepts started", () => {
    expect(isDaytonaStarted("started")).toBe(true);
    expect(isDaytonaStarted("starting")).toBe(false);
    expect(isDaytonaStarted(undefined)).toBe(false);
  });

  it("sandboxIdOf extracts the id or throws", () => {
    expect(sandboxIdOf({ id: "s1" })).toBe("s1");
    expect(() => sandboxIdOf({})).toThrow(/no id/);
    expect(() => sandboxIdOf(null)).toThrow();
  });
});

type Call = Readonly<{ url: string; method: string }>;

const scriptedTransport = (
  responder: (call: Call, getCount: number) => unknown,
): { transport: HttpTransport; calls: Call[] } => {
  const calls: Call[] = [];
  let getCount = 0;
  const transport: HttpTransport = async (url, init) => {
    calls.push({ url, method: init.method });
    if (init.method === "GET") getCount += 1;
    const body = responder({ url, method: init.method }, getCount);
    const response: HttpResponse = { status: 200, json: async () => body };
    return response;
  };
  return { transport, calls };
};

const stepClock = () => {
  let t = 0;
  return () => {
    t += 100;
    return t;
  };
};

describe("createDaytonaProvisioner", () => {
  it("boots cold: creates a sandbox and polls until started, timing the wait", async () => {
    const { transport, calls } = scriptedTransport((call, getCount) => {
      if (call.method === "POST") return { id: "s1", state: "creating" };
      // First GET still starting, second GET started.
      return { state: getCount >= 2 ? "started" : "starting" };
    });
    const provisioner = createDaytonaProvisioner({
      token: "t",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });

    const coldMs = await provisioner.bootCold();
    expect(coldMs).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({ method: "POST" });
    expect(calls[0]?.url).toContain("/sandbox");
    expect(
      calls.filter((c) => c.method === "GET").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("reuses warm: stops then starts the same sandbox and re-polls started", async () => {
    const { transport, calls } = scriptedTransport((call) =>
      call.method === "POST"
        ? { id: "s1", state: "creating" }
        : { state: "started" },
    );
    const provisioner = createDaytonaProvisioner({
      token: "t",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await provisioner.bootCold();
    const warmMs = await provisioner.reuseWarm();
    expect(warmMs).toBeGreaterThan(0);
    expect(calls.some((c) => c.url.endsWith("/s1/stop"))).toBe(true);
    expect(calls.some((c) => c.url.endsWith("/s1/start"))).toBe(true);
  });

  it("runs the task against the toolbox exec host", async () => {
    const { transport, calls } = scriptedTransport((call) =>
      call.method === "POST" && call.url.endsWith("/sandbox")
        ? { id: "s1", state: "started" }
        : call.method === "GET"
          ? { state: "started" }
          : { exitCode: 0, result: "" },
    );
    const provisioner = createDaytonaProvisioner({
      token: "t",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await provisioner.bootCold();
    const taskMs = await provisioner.runTask({ id: "cpu", description: "d" });
    expect(taskMs).toBeGreaterThan(0);
    const exec = calls.find((c) => c.url.includes("/process/execute"));
    expect(exec?.url).toContain("proxy.app.daytona.io/toolbox/s1");
  });

  it("tears down every created sandbox with a force delete", async () => {
    const { transport, calls } = scriptedTransport((call) =>
      call.method === "POST"
        ? { id: "s1", state: "started" }
        : { state: "started" },
    );
    const provisioner = createDaytonaProvisioner({
      token: "t",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await provisioner.bootCold();
    await provisioner.teardown();
    const del = calls.find((c) => c.method === "DELETE");
    expect(del?.url).toContain("/sandbox/s1");
    expect(del?.url).toContain("force=true");
  });

  it("surfaces an HTTP error from create", async () => {
    const failing: HttpTransport = async () => ({
      status: 500,
      json: async () => ({}),
    });
    const provisioner = createDaytonaProvisioner({
      token: "t",
      transport: failing,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await expect(provisioner.bootCold()).rejects.toThrow(/HTTP 500/);
  });
});

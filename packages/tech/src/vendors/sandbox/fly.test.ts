import { describe, expect, it } from "vitest";
import {
  createFlyMachinesProvisioner,
  isStartedState,
  machineIdOf,
  type HttpResponse,
  type HttpTransport,
} from "./fly";

describe("fly helpers", () => {
  it("isStartedState only accepts started", () => {
    expect(isStartedState("started")).toBe(true);
    expect(isStartedState("starting")).toBe(false);
    expect(isStartedState(undefined)).toBe(false);
  });

  it("machineIdOf extracts the id or throws", () => {
    expect(machineIdOf({ id: "m1" })).toBe("m1");
    expect(() => machineIdOf({})).toThrow(/no id/);
    expect(() => machineIdOf(null)).toThrow();
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

describe("createFlyMachinesProvisioner", () => {
  it("boots cold: creates a machine and polls until started, timing the wait", async () => {
    const { transport, calls } = scriptedTransport((call, getCount) => {
      if (call.method === "POST") return { id: "m1", state: "created" };
      // First GET still starting, second GET started.
      return { state: getCount >= 2 ? "started" : "starting" };
    });
    const provisioner = createFlyMachinesProvisioner({
      token: "t",
      appName: "app",
      image: "alpine",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });

    const coldMs = await provisioner.bootCold();
    expect(coldMs).toBeGreaterThan(0);
    expect(calls[0]).toMatchObject({ method: "POST" });
    expect(
      calls.filter((c) => c.method === "GET").length,
    ).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.url).toContain("/apps/app/machines");
  });

  it("tears down every created machine with a force delete", async () => {
    const { transport, calls } = scriptedTransport((call) =>
      call.method === "POST"
        ? { id: "m1", state: "started" }
        : { state: "started" },
    );
    const provisioner = createFlyMachinesProvisioner({
      token: "t",
      appName: "app",
      image: "alpine",
      transport,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await provisioner.bootCold();
    await provisioner.teardown();
    const del = calls.find((c) => c.method === "DELETE");
    expect(del?.url).toContain("/machines/m1");
    expect(del?.url).toContain("force=true");
  });

  it("surfaces an HTTP error from create", async () => {
    const failing: HttpTransport = async () => ({
      status: 500,
      json: async () => ({}),
    });
    const provisioner = createFlyMachinesProvisioner({
      token: "t",
      appName: "app",
      image: "alpine",
      transport: failing,
      clock: stepClock(),
      sleep: async () => undefined,
    });
    await expect(provisioner.bootCold()).rejects.toThrow(/HTTP 500/);
  });
});

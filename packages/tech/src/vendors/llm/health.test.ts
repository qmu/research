import { describe, expect, it } from "vitest";
import { classifyHealthProbeError } from "./health";

describe("classifyHealthProbeError", () => {
  it("distinguishes timeout, rate limit, server, network, and client failures", () => {
    expect(
      classifyHealthProbeError(new Error("probe timed out after 10000ms")),
    ).toBe("timeout");
    expect(classifyHealthProbeError({ status: 429 })).toBe("rate_limit");
    expect(classifyHealthProbeError({ statusCode: 503 })).toBe("server_error");
    expect(
      classifyHealthProbeError(new Error("ECONNRESET socket hang up")),
    ).toBe("network_error");
    expect(classifyHealthProbeError({ status: 401 })).toBe("client_error");
  });
});

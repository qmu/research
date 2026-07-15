import { describe, expect, it } from "vitest";
import {
  adaptersMissingCredentials,
  buildRealFactory,
  credentialsPresent,
  findAdapterSpec,
} from "./credentials";

describe("sandbox credential assembly", () => {
  it("knows the fly-machines adapter and its env vars", () => {
    const spec = findAdapterSpec("fly-machines");
    expect(spec?.envVars).toContain("FLY_API_TOKEN");
    expect(spec?.envVars).toContain("FLY_APP_NAME");
  });

  it("returns no adapter for a provider that has none", () => {
    expect(findAdapterSpec("e2b")).toBeUndefined();
    expect(buildRealFactory({})("e2b")).toBeUndefined();
  });

  it("credentialsPresent requires every env var non-empty", () => {
    const spec = findAdapterSpec("fly-machines");
    expect(spec).toBeDefined();
    if (spec === undefined) return;
    expect(credentialsPresent(spec, { FLY_API_TOKEN: "t" })).toBe(false);
    expect(
      credentialsPresent(spec, { FLY_API_TOKEN: "t", FLY_APP_NAME: "" }),
    ).toBe(false);
    expect(
      credentialsPresent(spec, { FLY_API_TOKEN: "t", FLY_APP_NAME: "app" }),
    ).toBe(true);
  });

  it("builds an adapter only when all credentials are present", () => {
    const withCreds = buildRealFactory({
      FLY_API_TOKEN: "t",
      FLY_APP_NAME: "app",
    });
    expect(withCreds("fly-machines")?.provider).toBe("fly-machines");
    expect(
      buildRealFactory({ FLY_API_TOKEN: "t" })("fly-machines"),
    ).toBeUndefined();
  });

  it("reports which adapters are missing credentials", () => {
    expect(adaptersMissingCredentials({})).toEqual([
      {
        providerId: "fly-machines",
        missing: ["FLY_API_TOKEN", "FLY_APP_NAME"],
      },
    ]);
    expect(
      adaptersMissingCredentials({ FLY_API_TOKEN: "t", FLY_APP_NAME: "app" }),
    ).toEqual([]);
  });
});

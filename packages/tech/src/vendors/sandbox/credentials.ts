import { createFlyMachinesProvisioner } from "./fly";
import type { SandboxProvisioner, SandboxProvisionerFactory } from "./types";

/**
 * The real-adapter assembly: which providers have a probe adapter, which env
 * vars each needs, and how to build a factory that returns an adapter for every
 * provider whose credentials are present (and `undefined` otherwise, so the
 * runner records it `unreachable`). Adding a provider adapter = one entry here;
 * the runner and report do not change. Pure over an injected env record, so the
 * present/absent logic is unit-testable without real credentials.
 */

export type EnvRecord = Readonly<Record<string, string | undefined>>;

export type SandboxAdapterSpec = Readonly<{
  providerId: string;
  /** Env vars that must all be non-empty for the adapter to run. */
  envVars: ReadonlyArray<string>;
  /** Build the provisioner from the (validated-present) env. */
  build: (env: EnvRecord) => SandboxProvisioner;
}>;

const value = (env: EnvRecord, key: string): string => env[key] ?? "";

/** Registry of implemented adapters. Providers absent here stay catalog-only
 * (their measured cells read `unreachable`) until an adapter lands. */
export const SANDBOX_ADAPTERS: ReadonlyArray<SandboxAdapterSpec> = [
  {
    providerId: "fly-machines",
    envVars: ["FLY_API_TOKEN", "FLY_APP_NAME"],
    build: (env) =>
      createFlyMachinesProvisioner({
        token: value(env, "FLY_API_TOKEN"),
        appName: value(env, "FLY_APP_NAME"),
        image: value(env, "FLY_IMAGE") || "docker.io/library/alpine:latest",
        region: env.FLY_REGION,
      }),
  },
];

export const findAdapterSpec = (
  providerId: string,
): SandboxAdapterSpec | undefined =>
  SANDBOX_ADAPTERS.find((spec) => spec.providerId === providerId);

/** Whether every env var the spec needs is present and non-empty. */
export const credentialsPresent = (
  spec: SandboxAdapterSpec,
  env: EnvRecord,
): boolean => spec.envVars.every((key) => value(env, key) !== "");

/**
 * A factory that returns an adapter for a provider when it has an implemented
 * adapter AND all its credentials are present; otherwise `undefined`
 * (→ `unreachable`). This is what the `--real` entrypoint injects.
 */
export const buildRealFactory =
  (env: EnvRecord): SandboxProvisionerFactory =>
  (providerId: string) => {
    const spec = findAdapterSpec(providerId);
    if (spec === undefined || !credentialsPresent(spec, env)) return undefined;
    return spec.build(env);
  };

/** Providers that have an adapter but are missing credentials — reported by the
 * entrypoint so a real run says exactly which env vars to set. */
export const adaptersMissingCredentials = (
  env: EnvRecord,
): ReadonlyArray<
  Readonly<{ providerId: string; missing: ReadonlyArray<string> }>
> =>
  SANDBOX_ADAPTERS.flatMap((spec) => {
    const missing = spec.envVars.filter((key) => value(env, key) === "");
    return missing.length === 0
      ? []
      : [{ providerId: spec.providerId, missing }];
  });

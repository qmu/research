// Provider-neutral authentication material for building a live completion client,
// and the pure env-resolution that produces it.
//
// Today every provider authenticates with a single API-key string. AWS Bedrock
// (SigV4-signed requests) and Google Vertex (GCP Application Default Credentials)
// do not fit one key, so the entrypoint can no longer wire auth as a bare
// `Record<Provider, string>` of key strings. This module generalizes the contract:
// a provider carries a structured `Credential` resolved from the environment by a
// declarative `CredentialSpec`, without any provider SDK type crossing the
// vendors/ ACL — the union is plain data (region, ids, project — strings), never a
// `@aws-sdk` or `google-auth-library` type.
//
// The keyless fallback is preserved by construction: `resolveCredential` returns
// `null` whenever a spec's required variables are absent, and the caller then uses
// the deterministic fixture path (`provenance: "fixtured"`). A live client is
// built only when a full credential resolves.

// --- resolved credential (what an adapter is built from) ---------------------

// A single bearer key: Anthropic, OpenAI, xAI, and Google AI Studio all use this.
export type ApiKeyCredential = Readonly<{ kind: "apiKey"; apiKey: string }>;

// AWS SigV4 material for Bedrock. Plain strings only — the adapter (a future
// ticket) hands these to the AWS SDK's signer behind the ACL; the union itself
// stays SDK-free. `sessionToken` is present only for temporary/STS credentials.
export type AwsSigV4Credential = Readonly<{
  kind: "awsSigV4";
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}>;

// Google Vertex routing facts. ADC itself is resolved by the Google auth library
// from the ambient environment (GOOGLE_APPLICATION_CREDENTIALS or the metadata
// server), so this credential holds only the project/location the request is
// routed to — never a raw key.
export type GcpAdcCredential = Readonly<{
  kind: "gcpAdc";
  projectId: string;
  location: string;
}>;

export type Credential =
  | ApiKeyCredential
  | AwsSigV4Credential
  | GcpAdcCredential;

// --- declarative resolution spec (how a provider's credential comes from env) --

// Each variant names the environment variables to read; `resolveCredential` turns
// a spec + an env snapshot into a `Credential` or `null`. Keeping this as data
// (not a closure over `process.env`) makes resolution a pure function that unit
// tests drive with a plain object — no live keys, no `process.env` mutation.
export type CredentialSpec =
  | Readonly<{ kind: "apiKey"; apiKeyEnv: string }>
  | Readonly<{
      kind: "awsSigV4";
      regionEnv: string;
      accessKeyIdEnv: string;
      secretAccessKeyEnv: string;
      sessionTokenEnv?: string;
    }>
  | Readonly<{ kind: "gcpAdc"; projectIdEnv: string; locationEnv: string }>;

// A read-only environment snapshot. `process.env` satisfies this; tests pass a
// plain record.
export type Env = Readonly<Record<string, string | undefined>>;

const nonEmpty = (value: string | undefined): value is string =>
  value !== undefined && value !== "";

// Resolve a spec against an environment. Returns the structured credential when
// every required variable is present and non-empty, or `null` when any is missing
// — the signal for the caller to fall back to the fixture path. Never throws:
// absent credentials are an expected, keyless state, not an error.
export const resolveCredential = (
  spec: CredentialSpec,
  env: Env,
): Credential | null => {
  if (spec.kind === "apiKey") {
    const apiKey = env[spec.apiKeyEnv];
    return nonEmpty(apiKey) ? { kind: "apiKey", apiKey } : null;
  }
  if (spec.kind === "awsSigV4") {
    const region = env[spec.regionEnv];
    const accessKeyId = env[spec.accessKeyIdEnv];
    const secretAccessKey = env[spec.secretAccessKeyEnv];
    if (
      !nonEmpty(region) ||
      !nonEmpty(accessKeyId) ||
      !nonEmpty(secretAccessKey)
    ) {
      return null;
    }
    const sessionToken = spec.sessionTokenEnv
      ? env[spec.sessionTokenEnv]
      : undefined;
    return {
      kind: "awsSigV4",
      region,
      accessKeyId,
      secretAccessKey,
      ...(nonEmpty(sessionToken) ? { sessionToken } : {}),
    };
  }
  if (spec.kind === "gcpAdc") {
    const projectId = env[spec.projectIdEnv];
    const location = env[spec.locationEnv];
    return nonEmpty(projectId) && nonEmpty(location)
      ? { kind: "gcpAdc", projectId, location }
      : null;
  }
  // Exhaustive: every CredentialSpec variant is handled above. `spec` is `never`
  // here, so a new variant added without a branch is a compile error.
  return assertNeverSpec(spec);
};

const assertNeverSpec = (spec: never): null => {
  throw new Error(
    `unhandled credential spec: ${JSON.stringify(spec as unknown)}`,
  );
};

// Narrow a resolved credential to an API key, or fail loudly. Adapters that
// authenticate with a single bearer key call this so a misrouted credential
// (e.g. a SigV4 credential handed to the OpenAI adapter) is a hard error, never a
// silent wrong-auth call.
export const requireApiKey = (
  credential: Credential,
  provider: string,
): string => {
  if (credential.kind !== "apiKey") {
    throw new Error(
      `${provider}: expected an apiKey credential, got "${credential.kind}"`,
    );
  }
  return credential.apiKey;
};

// Narrow a resolved credential to AWS SigV4 material (Bedrock), or fail loudly.
export const requireAwsSigV4 = (
  credential: Credential,
  provider: string,
): AwsSigV4Credential => {
  if (credential.kind !== "awsSigV4") {
    throw new Error(
      `${provider}: expected an awsSigV4 credential, got "${credential.kind}"`,
    );
  }
  return credential;
};

// Narrow a resolved credential to GCP ADC routing facts (Vertex), or fail loudly.
export const requireGcpAdc = (
  credential: Credential,
  provider: string,
): GcpAdcCredential => {
  if (credential.kind !== "gcpAdc") {
    throw new Error(
      `${provider}: expected a gcpAdc credential, got "${credential.kind}"`,
    );
  }
  return credential;
};

import { describe, it, expect } from "vitest";
import {
  resolveCredential,
  requireApiKey,
  type CredentialSpec,
} from "./credentials";

describe("resolveCredential — apiKey", () => {
  const spec: CredentialSpec = { kind: "apiKey", apiKeyEnv: "PROVIDER_KEY" };

  it("resolves the key when the env var is present", () => {
    expect(resolveCredential(spec, { PROVIDER_KEY: "sk-123" })).toEqual({
      kind: "apiKey",
      apiKey: "sk-123",
    });
  });

  it("returns null (fixture fallback) when the var is absent", () => {
    expect(resolveCredential(spec, {})).toBeNull();
  });

  it("treats an empty string as absent", () => {
    expect(resolveCredential(spec, { PROVIDER_KEY: "" })).toBeNull();
  });
});

describe("resolveCredential — awsSigV4", () => {
  const spec: CredentialSpec = {
    kind: "awsSigV4",
    regionEnv: "AWS_REGION",
    accessKeyIdEnv: "AWS_ACCESS_KEY_ID",
    secretAccessKeyEnv: "AWS_SECRET_ACCESS_KEY",
    sessionTokenEnv: "AWS_SESSION_TOKEN",
  };
  const full = {
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "AKIA",
    AWS_SECRET_ACCESS_KEY: "secret",
  };

  it("resolves when all required vars are present, omitting an absent session token", () => {
    expect(resolveCredential(spec, full)).toEqual({
      kind: "awsSigV4",
      region: "us-east-1",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
    });
  });

  it("includes the session token when present", () => {
    const cred = resolveCredential(spec, { ...full, AWS_SESSION_TOKEN: "tok" });
    expect(cred).toMatchObject({ kind: "awsSigV4", sessionToken: "tok" });
  });

  it("returns null when any required var is missing", () => {
    expect(
      resolveCredential(spec, {
        AWS_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "AKIA",
      }),
    ).toBeNull();
  });
});

describe("resolveCredential — gcpAdc", () => {
  const spec: CredentialSpec = {
    kind: "gcpAdc",
    projectIdEnv: "GCP_PROJECT",
    locationEnv: "GCP_LOCATION",
  };

  it("resolves the routing facts when both vars are present", () => {
    expect(
      resolveCredential(spec, {
        GCP_PROJECT: "my-proj",
        GCP_LOCATION: "us-central1",
      }),
    ).toEqual({
      kind: "gcpAdc",
      projectId: "my-proj",
      location: "us-central1",
    });
  });

  it("returns null when the location is missing", () => {
    expect(resolveCredential(spec, { GCP_PROJECT: "my-proj" })).toBeNull();
  });
});

describe("requireApiKey", () => {
  it("returns the key for an apiKey credential", () => {
    expect(requireApiKey({ kind: "apiKey", apiKey: "k" }, "openai")).toBe("k");
  });

  it("throws with the provider and offending kind for a non-apiKey credential", () => {
    expect(() =>
      requireApiKey(
        {
          kind: "awsSigV4",
          region: "us-east-1",
          accessKeyId: "AKIA",
          secretAccessKey: "s",
        },
        "bedrock",
      ),
    ).toThrow(/bedrock: expected an apiKey credential, got "awsSigV4"/);
  });
});

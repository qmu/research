import { describe, expect, it } from "vitest";
import { fingerprintCommand, redactArgv } from "./fingerprint";

describe("redactArgv", () => {
  it("redacts a secret flag's space-separated value", () => {
    const argv = ["ollama", "run", "--api-key", "sk-live-secret"];
    const expected = ["ollama", "run", "--api-key", "[REDACTED]"];
    expect(redactArgv(argv)).toEqual(expected);
  });

  it("redacts a secret flag's equals-sign value", () => {
    const argv = ["--token=sk-live-secret"];
    expect(redactArgv(argv)).toEqual(["--token=[REDACTED]"]);
  });

  it("redacts a bare filesystem path", () => {
    const argv = ["ollama", "run", "/Users/alice/models/llama3.1"];
    const expected = ["ollama", "run", "[REDACTED]"];
    expect(redactArgv(argv)).toEqual(expected);
  });

  it("redacts a bare URL", () => {
    const argv = ["--base-url=http://localhost:11434"];
    expect(redactArgv(argv)).toEqual(["--base-url=[REDACTED]"]);
  });

  it("leaves public, non-sensitive arguments unchanged", () => {
    const argv = [
      "ollama",
      "run",
      "llama3.1:8b-instruct-q4_K_M",
      "--keepalive",
      "5m",
    ];
    expect(redactArgv(argv)).toEqual(argv);
  });

  it("does not mistake an unrelated flag for a secret's value", () => {
    const argv = ["--keepalive", "5m", "--api-key", "sk-live-secret"];
    const expected = ["--keepalive", "5m", "--api-key", "[REDACTED]"];
    expect(redactArgv(argv)).toEqual(expected);
  });
});

describe("fingerprintCommand", () => {
  it("returns a versioned sha256 digest string", () => {
    const fingerprint = fingerprintCommand(["ollama", "run", "llama3.1"]);
    expect(fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is deterministic for the same argv", () => {
    const argv = ["ollama", "run", "llama3.1", "--keepalive", "5m"];
    expect(fingerprintCommand(argv)).toBe(fingerprintCommand([...argv]));
  });

  it("never contains the secret value it redacted", () => {
    const argv = ["ollama", "run", "--api-key", "sk-live-secret-value"];
    const fingerprint = fingerprintCommand(argv);
    expect(fingerprint).not.toContain("sk-live-secret-value");
  });

  it("produces the same fingerprint for two commands differing only in a secret value", () => {
    const first = fingerprintCommand([
      "ollama",
      "run",
      "--api-key",
      "sk-live-one",
    ]);
    const second = fingerprintCommand([
      "ollama",
      "run",
      "--api-key",
      "sk-live-two",
    ]);
    expect(first).toBe(second);
  });

  it("produces a different fingerprint for a different public command", () => {
    const first = fingerprintCommand([
      "ollama",
      "run",
      "llama3.1",
      "--keepalive",
      "5m",
    ]);
    const second = fingerprintCommand([
      "ollama",
      "run",
      "llama3.1",
      "--keepalive",
      "10m",
    ]);
    expect(first).not.toBe(second);
  });
});

/** Explicitly reviewed measurement contracts; never infer support from semver. */
const supported = [
  "local-inference/2",
  "local-inference/3",
  "local-inference/4",
];
export interface RunnerRecovery {
  reason: "MISSING-RUNNER-VERSION" | "UNKNOWN-RUNNER-VERSION";
  message: string;
  href: string;
}

/** Untrusted saved labels never become commands, links, or displayed text. */
export function checkRunnerVersion(value: unknown): {
  version: string | null;
  recovery: RunnerRecovery | null;
} {
  if (typeof value === "string" && supported.includes(value))
    return { version: value, recovery: null };
  const missing =
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length === 0);
  return {
    version: null,
    recovery: {
      reason: missing ? "MISSING-RUNNER-VERSION" : "UNKNOWN-RUNNER-VERSION",
      message: missing
        ? "Runner version was not recorded."
        : "Runner version is not supported by this reader.",
      href: "./local-inference-adoption-format.md#runner-version",
    },
  };
}

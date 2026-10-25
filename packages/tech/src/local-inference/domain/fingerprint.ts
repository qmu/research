// Turns a run's argv into a safe, reproducible command fingerprint: secrets,
// filesystem paths and URLs are redacted BEFORE hashing, so the digest can be
// published on the comparison page without exposing what it was computed
// from. The version tag is folded into the hash input so a future redaction
// rule change naturally produces a different fingerprint instead of silently
// colliding with the old one.

import { createHash } from "node:crypto";

export const FINGERPRINT_VERSION = "local-inference-command/1";

const REDACTED = "[REDACTED]";

const SECRET_FLAG_PATTERN =
  /^--?(api[-_]?key|token|auth(?:orization)?|password|secret|bearer|cookie)$/i;
const PATH_LIKE_PATTERN = /^(\/|~\/|\.\.?\/|[A-Za-z]:\\)/;
const URL_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const KEY_VALUE_PATTERN = /^(--?[A-Za-z][\w-]*)=(.*)$/;

const isSecretFlag = (flag: string): boolean => SECRET_FLAG_PATTERN.test(flag);
const isPathLike = (value: string): boolean => PATH_LIKE_PATTERN.test(value);
const isUrlLike = (value: string): boolean => URL_LIKE_PATTERN.test(value);
const isSensitiveValue = (value: string): boolean =>
  isPathLike(value) || isUrlLike(value);

/**
 * Redact argv tokens that could carry a secret, a filesystem path, or a URL:
 * `--flag=value` pairs, `--flag value` pairs (space-separated), and bare
 * sensitive-looking tokens. Everything else — subcommands, booleans, numeric
 * settings — passes through unchanged so the fingerprint still distinguishes
 * different public run configurations.
 */
export const redactArgv = (argv: readonly string[]): string[] => {
  const out: string[] = [];
  let redactNextValue = false;

  for (const token of argv) {
    if (redactNextValue) {
      out.push(REDACTED);
      redactNextValue = false;
      continue;
    }

    const keyValue = KEY_VALUE_PATTERN.exec(token);
    if (keyValue) {
      const [, flag, value] = keyValue;
      out.push(
        isSecretFlag(flag) || isSensitiveValue(value)
          ? `${flag}=${REDACTED}`
          : token,
      );
      continue;
    }

    if (isSecretFlag(token)) {
      out.push(token);
      redactNextValue = true;
      continue;
    }

    out.push(isSensitiveValue(token) ? REDACTED : token);
  }

  return out;
};

/**
 * Compute the safe, versioned command fingerprint for a run's argv: redact
 * first, then hash the redaction result together with the format version.
 * The input argv is never retained or returned.
 */
export const fingerprintCommand = (argv: readonly string[]): string => {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        version: FINGERPRINT_VERSION,
        argv: redactArgv(argv),
      }),
    )
    .digest("hex");
  return `sha256:${digest}`;
};

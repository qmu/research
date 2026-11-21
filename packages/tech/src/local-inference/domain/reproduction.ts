import { createHash } from "node:crypto";

/** Public slots refer to a separately maintained, secret-free fixture manifest. */
export type FailureReproductionInput = {
  modelAlias?: string;
  quantization?: string;
  inputFixture?: string;
  rerunArgv?: readonly string[];
};

const quantizations = new Set([
  "none",
  "fp32",
  "fp16",
  "bf16",
  "int8",
  "int4",
  "Q4_0",
  "Q4_1",
  "Q4_K_S",
  "Q4_K_M",
  "Q5_0",
  "Q5_1",
  "Q5_K_S",
  "Q5_K_M",
  "Q6_K",
  "Q8_0",
  "IQ4_XS",
  "IQ4_NL",
]);
const publicTokens = new Set([
  "node",
  "nodejs",
  "tsx",
  "npm",
  "run",
  "local-inference",
  "run-local-inference.ts",
  "--import",
  "tsx/esm",
  "--",
  "ollama",
  "llama-server",
  "mlx_lm.generate",
  "strata",
  "--model",
  "--fixture",
  "--quantization",
  "--config",
  "--output",
]);

function publicSlot(
  value: unknown,
  prefix: "model" | "fixture",
): string | null {
  return typeof value === "string" &&
    new RegExp(`^${prefix}-[1-9][0-9]{0,2}$`).test(value)
    ? value
    : null;
}

/** Hash only public command structure, never raw argv or environment values.
 * Values (including public-looking option values) are always redacted.
 * This is a comparison aid, not a reversible command or a unique run identity.
 */
function commandFingerprint(
  argv: readonly string[] | undefined,
): string | null {
  if (
    !Array.isArray(argv) ||
    argv.length === 0 ||
    !argv.every((token) => typeof token === "string")
  )
    return null;
  let optionValue = false;
  const normalized = argv.map((token, index) => {
    if (optionValue) {
      optionValue = false;
      return "[REDACTED]";
    }
    if (
      [
        "--model",
        "--fixture",
        "--quantization",
        "--config",
        "--output",
      ].includes(token)
    ) {
      optionValue = true;
      return token;
    }
    const name = token.replaceAll("\\", "/").split("/").at(-1) ?? "";
    if (
      index === 0 &&
      [
        "node",
        "nodejs",
        "tsx",
        "npm",
        "ollama",
        "llama-server",
        "mlx_lm.generate",
        "strata",
      ].includes(name)
    )
      return name === "nodejs" ? "node" : name;
    return publicTokens.has(token) ? token : "[REDACTED]";
  });
  return createHash("sha256")
    .update(JSON.stringify(["failure-command/1", normalized]))
    .digest("hex");
}

export function failureReproduction(input: FailureReproductionInput = {}) {
  return {
    fingerprintVersion: "failure-command/1" as const,
    modelAlias: publicSlot(input.modelAlias, "model"),
    quantization:
      typeof input.quantization === "string" &&
      quantizations.has(input.quantization)
        ? input.quantization
        : null,
    inputFixture: publicSlot(input.inputFixture, "fixture"),
    commandSha256: commandFingerprint(input.rerunArgv),
  };
}

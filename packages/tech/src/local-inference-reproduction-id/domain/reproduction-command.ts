// Builds a literal, runnable reproduction command for one local-inference
// comparison row, carrying the same reproduction id shown for that row on
// the public adoption page, so the page and the command always agree on
// which configuration is being reproduced.

import {
  normalizeReproductionConditions,
  reproductionId,
  type ReproductionConditions,
} from "./identity";

// Defensive, not exhaustive: the five conditions come from a saved row, not
// from a live environment, so this should never fire in practice. It exists
// as a last-resort guard against a secret leaking into a row by mistake.
const SECRET_LIKE = /key|token|secret|password|credential|profile/i;

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`;

const COMMAND_FLAGS: ReadonlyArray<
  readonly [flag: string, key: keyof ReproductionConditions]
> = [
  ["--engine", "engine"],
  ["--model", "model"],
  ["--fixture", "fixture"],
  ["--runner-version", "runnerVersion"],
  ["--target-commit", "targetCommit"],
];

/**
 * Builds `npm run local-inference -- --engine <v> --model <v> --fixture <v>
 * --runner-version <v> --target-commit <v> --reproduction-id <id>` from a
 * row's own five conditions. Throws instead of rendering if any condition
 * looks secret-like.
 */
export const reproductionCommand = (
  conditions: ReproductionConditions,
): string => {
  const normalized = normalizeReproductionConditions(conditions);
  const id = reproductionId(normalized);
  const args = COMMAND_FLAGS.map(([flag, key]) => {
    const value = normalized[key];
    if (SECRET_LIKE.test(value)) {
      throw new Error(
        `refusing to render a reproduction command: ${flag} value looks secret-like`,
      );
    }
    return `${flag} ${shellQuote(value)}`;
  }).join(" ");

  return `npm run local-inference -- ${args} --reproduction-id ${shellQuote(id)}`;
};

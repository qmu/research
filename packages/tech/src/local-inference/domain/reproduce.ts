// Derives a literal, runnable reproduction command from a saved comparison
// snapshot's own public fields — engine version, model, fixture version, and
// runner version. These are the same values already shown in the adoption
// table, so the command adds no new information a reader could not already
// see; it just makes rerunning that exact configuration a copy-paste away.

import type { ComparisonSnapshot } from "./snapshot";

// Defensive, not exhaustive: refuses to render a command whose engine
// version, model, fixture version, or runner version looks like it carries a
// credential rather than a public version string. The four fields come from
// a saved snapshot, not from a live environment, so this should never fire
// in practice — it exists as a last-resort guard against a secret leaking
// into a snapshot by mistake upstream.
const SECRET_LIKE = /key|token|secret|password|credential|profile/i;

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`;

type ReadField = (snapshot: ComparisonSnapshot) => string;

const COMMAND_FIELDS: ReadonlyArray<readonly [string, ReadField]> = [
  ["--engine-version", (snapshot) => snapshot.engineVersion],
  ["--model", (snapshot) => snapshot.model],
  ["--fixture-version", (snapshot) => snapshot.fixtureVersion],
  ["--runner-version", (snapshot) => snapshot.runnerVersion],
];

/**
 * Builds `npm run local-inference -- --engine-version <v> --model <v>
 * --fixture-version <v> --runner-version <v>` from a snapshot's own fields.
 * Throws instead of rendering if any of those four values looks secret-like.
 */
export const safeReproduceCommand = (snapshot: ComparisonSnapshot): string => {
  const args = COMMAND_FIELDS.map(([flag, read]) => {
    const value = read(snapshot);
    if (SECRET_LIKE.test(value)) {
      throw new Error(
        `refusing to render a reproduction command for snapshot "${snapshot.id}": ` +
          `${flag} value looks secret-like`,
      );
    }
    return `${flag} ${shellQuote(value)}`;
  }).join(" ");

  return `npm run local-inference -- ${args}`;
};

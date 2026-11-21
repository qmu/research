import type { ConfigRun } from "./types";

/**
 * A safe, display-only command that reproduces the shared `compare` sweep a
 * split report (speed/accuracy) was projected from. Built only from each
 * configuration's own public model id and effort level plus the trial count
 * — never from an environment variable, API key, or other credential — so
 * there is nothing in it to redact.
 */
export type ReproduceCommandInput = Readonly<{
  configs: ReadonlyArray<Pick<ConfigRun, "id" | "effort">>;
  trials: number;
}>;

const SECRET_LIKE_PATTERN = /key|token|secret|password|credential|profile/i;

export const safeReproduceCommand = (input: ReproduceCommandInput): string => {
  const safeTrials = Math.max(1, Math.trunc(input.trials));
  const configFlag = input.configs.map((c) => `${c.id}:${c.effort}`).join(",");
  const command =
    configFlag === ""
      ? `npm run compare -- --trials ${safeTrials}`
      : `npm run compare -- --configs ${configFlag} --trials ${safeTrials}`;
  if (SECRET_LIKE_PATTERN.test(command)) {
    throw new Error(
      "safeReproduceCommand: refusing to render a secret-like token",
    );
  }
  return command;
};

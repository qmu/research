/**
 * A safe, display-only command for reproducing a RAG benchmark run.
 *
 * The command is built only from the run's own non-secret parameters (the
 * fixture flag, dataset id, and trial count) and never reads environment
 * variables or vendor credentials, so there is nothing in it to redact.
 * Pairing it with the dataset id (the "fixture id") lets a reader confirm
 * which committed fixture the command reconstructs without exposing how any
 * real, credentialed run was actually invoked.
 */
export type ReproduceCommandInput = Readonly<{
  fixture: boolean;
  datasetId: string;
  trials: number;
}>;

/**
 * Maps a known dataset id to the `--corpus` flag that selects it, or
 * `undefined` when the id is the entrypoint's default corpus (no flag
 * needed). An id outside this map renders no `--corpus` flag at all, which
 * keeps the command safe (it never echoes an unrecognized id into the
 * command) at the cost of that command reproducing the default corpus
 * instead.
 */
const CORPUS_FLAG_BY_DATASET_ID: Readonly<Record<string, string>> = {
  "scifact-beir-subset": "scifact",
};

const SECRET_LIKE_PATTERN = /key|token|secret|password|credential|profile/i;

export const safeReproduceCommand = (input: ReproduceCommandInput): string => {
  const corpus = CORPUS_FLAG_BY_DATASET_ID[input.datasetId];
  const safeTrials = Math.max(1, Math.trunc(input.trials));
  const flags = [
    input.fixture ? "--fixture" : undefined,
    corpus === undefined ? undefined : `--corpus ${corpus}`,
    `--trials ${safeTrials}`,
  ].filter((flag): flag is string => flag !== undefined);
  const command = `npm run rag -- ${flags.join(" ")}`;
  if (SECRET_LIKE_PATTERN.test(command)) {
    throw new Error(
      `safeReproduceCommand produced a command containing a secret-like token: ${command}`,
    );
  }
  return command;
};

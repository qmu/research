import type { StreamedCompletion } from "./types";

// Anti-corruption layer for MLX (Apple's on-device inference framework). Unlike
// the cloud adapters in this directory, there is no SDK call to wrap: a trial
// runs `mlx_lm.generate --verbose` (or the equivalent `generate()` Python call)
// on the operator's own Apple Silicon machine, and only the CAPTURED stdout
// comes back to this repository. This module's job is narrower than the other
// adapters' — parse that one fixed text format and normalize it into the same
// `StreamedCompletion` every provider produces — so the domain never branches on
// whether a trial ran in the cloud or on device.
//
// The format parsed here is `mlx_lm`'s own `--verbose` output: the generated
// text framed by a `==========` line on each side, followed by a fixed
// three-line stats block. This has been stable across `mlx_lm` releases.
const SEPARATOR_LINE = /^={3,}$/;

const PROMPT_STATS_RE =
  /^Prompt:\s*(\d+)\s*tokens,\s*([\d.]+)\s*tokens-per-sec$/;
const GENERATION_STATS_RE =
  /^Generation:\s*(\d+)\s*tokens,\s*([\d.]+)\s*tokens-per-sec$/;
const PEAK_MEMORY_RE = /^Peak memory:\s*([\d.]+)\s*GB$/;

export type MlxGenerateStats = Readonly<{
  promptTokens: number;
  promptTokensPerSecond: number;
  generationTokens: number;
  generationTokensPerSecond: number;
  peakMemoryGb: number;
}>;

const firstMatch = (
  lines: ReadonlyArray<string>,
  pattern: RegExp,
): RegExpMatchArray | undefined => {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match;
  }
  return undefined;
};

export const DIAG_A_PLACEHOLDER: StreamedCompletion = {
  text: "",
  outputTokens: 0,
  elapsedMs: 0,
  ttftMs: 0,
  model: "diag",
};

export const diagUse = (): unknown => [
  SEPARATOR_LINE,
  PROMPT_STATS_RE,
  GENERATION_STATS_RE,
  PEAK_MEMORY_RE,
  firstMatch,
];

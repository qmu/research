import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { estimateSpeech, runSpeechComparison } from "../speech/run";
import { renderSpeechReport } from "../speech/domain/report";
import type { AudioClip } from "../vendors/speech/types";
import type { SttUtterance } from "../speech/domain/types";

const hasArg = (name: string): boolean => process.argv.includes(name);

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const parseList = (name: string): ReadonlyArray<string> | undefined =>
  argValue(name)
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");

const parseTrials = (): number => {
  const parsed = Number(argValue("--trials") ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
};

const AUDIO_EXTENSIONS: ReadonlyArray<readonly [string, string]> = [
  ["wav", "audio/wav"],
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["flac", "audio/flac"],
  ["ogg", "audio/ogg"],
];

/** Reads a reference clip for an STT utterance from `SPEECH_AUDIO_DIR`, trying
 * the common audio extensions. Only used on the real path. */
const loadReferenceAudio = async (
  utterance: SttUtterance,
): Promise<AudioClip> => {
  const dir = process.env.SPEECH_AUDIO_DIR;
  if (dir === undefined || dir === "") {
    throw new Error(
      "SPEECH_AUDIO_DIR must point at a directory of reference clips " +
        `named <utterance-id>.<ext> for a real STT run (missing for '${utterance.id}').`,
    );
  }
  for (const [ext, mimeType] of AUDIO_EXTENSIONS) {
    try {
      const bytes = await readFile(resolve(dir, `${utterance.id}.${ext}`));
      return { base64: bytes.toString("base64"), mimeType };
    } catch {
      continue;
    }
  }
  throw new Error(
    `no reference clip for '${utterance.id}' in ${dir} ` +
      `(expected ${utterance.id}.{${AUDIO_EXTENSIONS.map(([ext]) => ext).join(",")}}).`,
  );
};

export const main = async (): Promise<void> => {
  const trials = parseTrials();
  const modelIds = parseList("--models");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateSpeech(modelIds, trials)}\n`);
    return;
  }

  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateSpeech(modelIds, trials)}\n`);
  }

  const result = await runSpeechComparison({
    fixture,
    trials,
    modelIds,
    loadReferenceAudio,
  });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(process.cwd(), "../../docs/research-reports/speech-comparison.md");
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath:
      artifactPath.split("/").at(-1) ?? "speech-comparison.data.json",
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderSpeechReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `speech: ${result.runs.length} subject row(s), fixture=${fixture}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`speech comparison failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

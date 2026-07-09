import { archiveReportFrame } from "../research/archive-runner";
import { isDirectRun } from "./direct-run";

const usage = (): string =>
  [
    "Usage: research-archive <topic> [--generated-at ISO_TIMESTAMP]",
    "",
    "Copies the current English report, data artifact when present, and Japanese",
    "page into docs/research-reports/history/<topic>/<timestamp>/.",
    "",
  ].join("\n");

const generatedAtFrom = (args: ReadonlyArray<string>): string => {
  const index = args.indexOf("--generated-at");
  const value = index === -1 ? undefined : args[index + 1];
  return value ?? new Date().toISOString();
};

export const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const [topicId] = args;
  if (topicId === undefined || topicId === "--help") {
    process.stderr.write(usage());
    process.exitCode = 1;
    return;
  }
  const written = await archiveReportFrame({
    topicId,
    generatedAt: generatedAtFrom(args),
  });
  process.stdout.write(
    written.length === 0
      ? `research archive ${topicId}: no current files found\n`
      : `research archive ${topicId}: wrote\n${written.map((path) => `- ${path}`).join("\n")}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`research archive failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

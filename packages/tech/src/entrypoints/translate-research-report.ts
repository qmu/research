import { runReportTranslation } from "../research/report-translation-runner";
import { isDirectRun } from "./direct-run";

const usage = (): string =>
  [
    "Usage: research-translate-report <topic> [--estimate]",
    "",
    "Translates the topic's full English report into the configured Japanese",
    "report path. Without ANTHROPIC_API_KEY the deterministic fixture client is",
    "used; pass --estimate to price the live translation without writing.",
    "",
  ].join("\n");

export const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const [topicId] = args;
  if (topicId === undefined || topicId === "--help") {
    process.stderr.write(usage());
    process.exitCode = 1;
    return;
  }
  await runReportTranslation({
    topicId,
    mode: args.includes("--estimate") ? "estimate" : "real",
    generatedAt: new Date().toISOString(),
  });
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `research report translation failed: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
}

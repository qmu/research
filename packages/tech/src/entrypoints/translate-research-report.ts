import { runReportTranslation } from "../research/report-translation-runner";
import { isDirectRun } from "./direct-run";

const usage = (): string =>
  [
    "Usage: research-translate-report <topic> [--estimate] [--fixture]",
    "",
    "Translates the topic's full English report into the configured Japanese",
    "report path. The live translation needs ANTHROPIC_API_KEY; without it the",
    "command refuses rather than overwriting the page with the deterministic",
    "stub. Pass --estimate to price the live call without writing, or --fixture",
    "to write the stub deliberately.",
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
    // The stub is reachable, but only on request: an unasked-for fixture run
    // replaces a published page with a placeholder.
    allowFixture: args.includes("--fixture"),
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

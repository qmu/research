import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  publishPlan,
  publishSlugs,
  renderJapaneseIndex,
  renderQmuTicketPayload,
  renderSourceIndex,
} from "../research/domain/site";
import { isDirectRun } from "./direct-run";

const repoRoot = (): string => resolve(process.cwd(), "../..");

const usage = (): string =>
  [
    "Usage: research-site <command>",
    "",
    "Commands:",
    "  slugs         Print qmu publish slugs in sidebar order",
    "  copy-plan     Print source and destination slugs for qmu copy",
    "  qmu-ticket    Print the qmu-co-jp handoff ticket body",
    "  write-indexes Regenerate docs/research-reports and docs/llm-foundation indexes",
    "",
  ].join("\n");

const writeText = async (path: string, text: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
};

export const main = async (): Promise<void> => {
  const [command] = process.argv.slice(2);
  if (command === "slugs") {
    process.stdout.write(`${publishSlugs().join(" ")}\n`);
    return;
  }
  if (command === "copy-plan") {
    process.stdout.write(
      `${publishPlan()
        .map((entry) => `${entry.sourceSlug}\t${entry.destinationSlug}`)
        .join("\n")}\n`,
    );
    return;
  }
  if (command === "qmu-ticket") {
    process.stdout.write(`${renderQmuTicketPayload()}\n`);
    return;
  }
  if (command === "write-indexes") {
    await writeText(
      resolve(repoRoot(), "docs/research-reports/index.md"),
      renderSourceIndex(),
    );
    await writeText(
      resolve(repoRoot(), "docs/llm-foundation/index.md"),
      renderJapaneseIndex(),
    );
    process.stdout.write("wrote research site indexes\n");
    return;
  }

  process.stderr.write(usage());
  process.exitCode = 1;
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`research-site failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

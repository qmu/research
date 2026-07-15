import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { estimateAgentVm, runAgentVm } from "../agent-vm/run";
import { renderAgentVmReport } from "../agent-vm/domain/report";
import {
  adaptersMissingCredentials,
  buildRealFactory,
} from "../vendors/sandbox/credentials";

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

const parseReps = (): number => {
  const parsed = Number(argValue("--reps") ?? "5");
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 5;
};

export const main = async (): Promise<void> => {
  const repetitions = parseReps();
  const providerIds = parseList("--providers");

  if (hasArg("--estimate")) {
    process.stdout.write(`${estimateAgentVm(providerIds, repetitions)}\n`);
    return;
  }

  const fixture = !hasArg("--real");
  if (!fixture) {
    process.stdout.write(`${estimateAgentVm(providerIds, repetitions)}\n`);
    for (const gap of adaptersMissingCredentials(process.env)) {
      process.stdout.write(
        `agent-vm: ${gap.providerId} adapter present but missing ${gap.missing.join(", ")} → will record unreachable\n`,
      );
    }
  }

  const result = await runAgentVm({
    fixture,
    repetitions,
    providerIds,
    // On the real path, assemble adapters from whichever provider tokens are
    // present in the environment; providers without an adapter or credentials
    // record `unreachable`. The fixture path ignores this.
    provisionerFactory: fixture ? undefined : buildRealFactory(process.env),
  });
  const canonicalPath =
    process.env.OUTPUT_PATH ??
    resolve(
      process.cwd(),
      "../../docs/research-reports/agent-vm-comparison.md",
    );
  const reportPath = fixture
    ? canonicalPath
    : canonicalPath.replace(/\.md$/, ".real.md");
  const artifactPath = reportPath.replace(/\.md$/, ".data.json");
  const rendered = {
    ...result,
    artifactPath:
      artifactPath.split("/").at(-1) ?? "agent-vm-comparison.data.json",
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderAgentVmReport(rendered), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(rendered, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `agent-vm: ${result.runs.length} provider row(s), fixture=${fixture}\n` +
      `wrote ${reportPath}\n` +
      `wrote ${artifactPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`agent-vm failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}

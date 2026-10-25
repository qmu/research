import { readFile } from "node:fs/promises";
import { useCases } from "../local-inference-use-case-thresholds/domain/catalog.js";
import {
  evaluateQualityAdoption,
  renderQualityAdoption,
} from "../local-inference-use-case-thresholds/domain/quality-adoption.js";

try {
  const [flag, targetCommit, beforePath, afterPath, id, ...extra] =
    process.argv.slice(2);
  if (
    flag !== "--commit" ||
    !targetCommit ||
    !/^[a-f0-9]{40}$/.test(targetCommit) ||
    !beforePath ||
    !afterPath ||
    extra.length
  )
    throw new Error("Expected target commit, baseline and current JSON paths");
  const selected = id ? useCases.filter((u) => u.id === id) : useCases;
  if (!selected.length) throw new Error("Unknown use case");
  const before: unknown = JSON.parse(await readFile(beforePath, "utf8"));
  const after: unknown = JSON.parse(await readFile(afterPath, "utf8"));
  const output = selected.map(
    (u) =>
      `## ${u.label}\n\n${renderQualityAdoption(evaluateQualityAdoption(before, after, u, targetCommit))}`,
  );
  console.log(
    "Proposed thresholds; saved fixture evidence only, not a deployment recommendation.\n\n" +
      output.join("\n"),
  );
} catch {
  console.error(
    "Invalid comparison input. Usage: npm run local-inference-quality-adoption -- --commit <full-target-sha> baseline.json current.json [use-case-id]",
  );
  process.exitCode = 1;
}

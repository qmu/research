import { remeasurementContext, remeasurementAnchor } from "./remeasurement.js";
import { checkRunnerVersion, type RunnerRecovery } from "./runner-version.js";

/** Join the schemaVersion 1 measurement, fingerprint and exact-text quality contracts. */
type RecordValue = Record<string, unknown>;
type Verdict = "pass" | "fail" | "undetermined";
export interface AdoptionRow {
  sourceIndex: number;
  commitSha: string | null;
  runnerVersion: string | null;
  runnerRecovery: RunnerRecovery | null;
  excluded: boolean;
  runIndex: number;
  engine: string;
  model: string;
  status: "measured" | "failed";
  metrics: RecordValue;
  error?: string;
  quality: RecordValue[];
  adoption: Verdict;
  comparability: "comparable" | "undetermined";
  reasons: string[];
  conditionKey: string | null;
  groupId: string | null;
}
export interface AdoptionReport {
  schemaVersion: 1;
  currentCommit: string;
  rows: AdoptionRow[];
  evaluatorMismatches: {
    rowIndexes: [number, number];
    reason: "EVALUATOR-VERSION-MISMATCH";
  }[];
  groups: { id: string; conditionKey: string; rowIndexes: number[] }[];
}
const object = (value: unknown): RecordValue => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as RecordValue;
};
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const oneOf = (value: unknown, values: readonly string[]) =>
  typeof value === "string" && values.includes(value);
const isCommit = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const hash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const own = (value: RecordValue, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort(compare)
      .map((key) => `${JSON.stringify(key)}:${canonical(object(value)[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function scalars(value: unknown): RecordValue {
  const data = object(value);
  if (
    !Object.values(data).every(
      (v) =>
        typeof v === "string" ||
        typeof v === "boolean" ||
        (typeof v === "number" && Number.isFinite(v)),
    )
  )
    throw new Error("Invalid condition or sampling values");
  return data;
}
function fingerprint(value: unknown): RecordValue {
  const data = object(value);
  if (
    Object.keys(data).length !== 4 ||
    !text(data.os) ||
    !text(data.arch) ||
    !text(data.engineVersion) ||
    typeof data.totalMemoryMiB !== "number" ||
    !Number.isFinite(data.totalMemoryMiB) ||
    data.totalMemoryMiB <= 0
  )
    throw new Error("Invalid fingerprint");
  return data;
}
function metrics(value: unknown): RecordValue {
  const data = object(value);
  for (const [name, raw] of Object.entries(data)) {
    const metric = object(raw);
    if (
      !text(metric.unit) ||
      (metric.value === null
        ? !oneOf(metric.reason, ["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"]) ||
          own(metric, "source")
        : typeof metric.value !== "number" ||
          !Number.isFinite(metric.value) ||
          metric.value < 0 ||
          !oneOf(metric.source, ["client", "usage"]) ||
          own(metric, "reason"))
    )
      throw new Error(`Invalid metric: ${name}`);
  }
  return structuredClone(data);
}
function quality(value: unknown): RecordValue[] {
  if (!Array.isArray(value) || !value.length)
    throw new Error("Expected nonempty quality array");
  const ids = new Set<string>();
  return value.map((raw) => {
    const q = object(raw);
    if (
      !text(q.fixtureId) ||
      !hash(q.fixtureSha256) ||
      !text(q.evaluatorVersion) ||
      !oneOf(q.verdict, ["pass", "fail", "undetermined"]) ||
      (q.verdict === "undetermined"
        ? !oneOf(q.reason, ["MEASURE-FAILED", "INPUT-MISMATCH", "NO-OUTPUT"])
        : q.reason !== null)
    )
      throw new Error("Invalid quality record");
    if (ids.has(q.fixtureId)) throw new Error("Duplicate quality fixture id");
    ids.add(q.fixtureId);
    return structuredClone(q);
  });
}

/** Missing legacy metadata stays visible but cannot establish comparability or adoption. */
export function joinAdoptionResults(
  inputs: readonly unknown[],
  currentCommit: string,
): AdoptionReport {
  if (!isCommit(currentCommit)) throw new Error("Invalid current commit");
  if (!Array.isArray(inputs) || !inputs.length)
    throw new Error("Expected at least one result");
  const rows: AdoptionRow[] = [];
  inputs.forEach((input, sourceIndex) => {
    const data = object(input);
    if (
      data.schemaVersion !== 1 ||
      !Array.isArray(data.runs) ||
      !data.runs.length
    )
      throw new Error("Expected schemaVersion 1 with nonempty runs");
    const execution = own(data, "execution") ? object(data.execution) : {};
    if (own(execution, "targetCommit") && !isCommit(execution.targetCommit))
      throw new Error("Invalid saved commit");
    const commitSha = isCommit(execution.targetCommit)
      ? execution.targetCommit
      : null;
    const commitReason =
      commitSha === null
        ? "MISSING-COMMIT"
        : commitSha !== currentCommit
          ? "COMMIT-MISMATCH"
          : null;
    const runner = checkRunnerVersion(execution.runnerVersion);
    const excluded = commitReason !== null || runner.recovery !== null;
    const environment = own(data, "fingerprint")
      ? fingerprint(data.fingerprint)
      : null;
    const sampling = own(data, "sampling") ? scalars(data.sampling) : null;
    if (own(data, "inputSha256") && !hash(data.inputSha256))
      throw new Error("Invalid inputSha256");
    if (own(data, "procedure") && !text(data.procedure))
      throw new Error("Invalid procedure");
    if (own(data, "qualitySchemaVersion") && data.qualitySchemaVersion !== 1)
      throw new Error("Invalid qualitySchemaVersion");
    if (own(data, "qualitySourceSha256") && !hash(data.qualitySourceSha256))
      throw new Error("Invalid qualitySourceSha256");
    data.runs.forEach((raw, runIndex) => {
      const run = object(raw);
      if (
        !oneOf(run.engine, ["ollama", "llama.cpp", "mlx", "strata"]) ||
        !text(run.model) ||
        !oneOf(run.status, ["measured", "failed"])
      )
        throw new Error("Invalid run identity or status");
      if (own(run, "runtimeVersion") && !text(run.runtimeVersion))
        throw new Error("Invalid runtimeVersion");
      if (own(run, "error") && typeof run.error !== "string")
        throw new Error("Invalid error");
      const condition = own(run, "condition") ? scalars(run.condition) : null;
      const evaluations = own(run, "quality") ? quality(run.quality) : [];
      if (
        run.status === "failed" &&
        evaluations.some(
          (q) => q.verdict !== "undetermined" || q.reason !== "MEASURE-FAILED",
        )
      )
        throw new Error("Failed run has contradictory quality");
      if (
        run.status === "measured" &&
        evaluations.some((q) => q.reason === "MEASURE-FAILED")
      )
        throw new Error("Measured run has contradictory quality");
      const reasons: string[] = commitReason ? [commitReason] : [];
      if (runner.recovery) reasons.push(runner.recovery.reason);
      if (!environment) reasons.push("MISSING-FINGERPRINT");
      if (!condition || !Object.keys(condition).length)
        reasons.push("MISSING-CONDITION");
      if (!run.runtimeVersion) reasons.push("MISSING-RUNTIME-VERSION");
      if (!sampling || !Object.keys(sampling).length)
        reasons.push("MISSING-SAMPLING");
      if (!data.inputSha256) reasons.push("MISSING-INPUT-SHA256");
      if (!data.procedure) reasons.push("MISSING-PROCEDURE");
      if (
        !evaluations.length ||
        data.qualitySchemaVersion !== 1 ||
        !data.qualitySourceSha256
      )
        reasons.push("MISSING-QUALITY");
      const conditionKey = reasons.length
        ? null
        : canonical({
            runnerVersion: runner.version,
            fingerprint: environment,
            engine: run.engine,
            model: run.model,
            runtimeVersion: run.runtimeVersion,
            condition,
            sampling,
            inputSha256: data.inputSha256,
            procedure: data.procedure,
            quality: evaluations
              .map(({ fixtureId, fixtureSha256, evaluatorVersion }) => ({
                fixtureId,
                fixtureSha256,
                evaluatorVersion,
              }))
              .sort((a, b) => compare(canonical(a), canonical(b))),
          });
      if (run.status === "failed") reasons.push("MEASURE-FAILED");
      for (const q of evaluations)
        if (q.reason && !reasons.includes(String(q.reason)))
          reasons.push(String(q.reason));
      if (evaluations.some((q) => q.verdict === "fail"))
        reasons.push("QUALITY-FAIL");
      rows.push({
        sourceIndex,
        commitSha,
        runnerVersion: runner.version,
        runnerRecovery: runner.recovery ? { ...runner.recovery } : null,
        excluded,
        runIndex,
        engine: String(run.engine),
        model: run.model,
        status: run.status as AdoptionRow["status"],
        metrics: metrics(run.metrics),
        ...(own(run, "error") ? { error: run.error as string } : {}),
        quality: evaluations,
        adoption: excluded
          ? "undetermined"
          : reasons.includes("QUALITY-FAIL")
            ? "fail"
            : reasons.length
              ? "undetermined"
              : "pass",
        comparability: conditionKey === null ? "undetermined" : "comparable",
        reasons,
        conditionKey,
        groupId: null,
      });
    });
  });
  const keys = [
    ...new Set(
      rows.flatMap((r) => (r.conditionKey === null ? [] : [r.conditionKey])),
    ),
  ].sort(compare);
  const groups = keys.map((conditionKey, index) => ({
    id: `condition-${index + 1}`,
    conditionKey,
    rowIndexes: [] as number[],
  }));
  const lookup = new Map(groups.map((group) => [group.conditionKey, group]));
  rows.forEach((row, index) => {
    const group =
      row.conditionKey === null ? undefined : lookup.get(row.conditionKey);
    if (group) {
      row.groupId = group.id;
      group.rowIndexes.push(index);
    }
  });
  // Compare evaluator identities only after all other recorded dimensions match.
  // Missing metadata never establishes a comparison candidate.
  const candidates = rows.map((row) => {
    if (row.conditionKey === null) return null;
    const key = JSON.parse(row.conditionKey);
    key.quality = key.quality
      .map(({ fixtureId, fixtureSha256 }: RecordValue) => ({
        fixtureId,
        fixtureSha256,
      }))
      .sort((a: RecordValue, b: RecordValue) =>
        compare(canonical(a), canonical(b)),
      );
    return canonical(key);
  });
  const evaluatorMismatches: AdoptionReport["evaluatorMismatches"] = [];
  rows.forEach((row, right) => {
    for (let left = 0; left < right; left++) {
      if (
        candidates[right] !== null &&
        candidates[left] === candidates[right] &&
        rows[left].conditionKey !== row.conditionKey
      ) {
        evaluatorMismatches.push({
          rowIndexes: [left, right],
          reason: "EVALUATOR-VERSION-MISMATCH",
        });
      }
    }
  });
  return { schemaVersion: 1, currentCommit, rows, groups, evaluatorMismatches };
}

// Encode markup, including Vue template delimiters, before embedding untrusted JSON.
const cell = (value: string) =>
  value.replace(/[&<>|`*_[\]\\{}\r\n]/g, (char) =>
    char === "\r" || char === "\n" ? " " : `&#${char.charCodeAt(0)};`,
  );
export function renderAdoptionReport(
  inputs: readonly unknown[],
  currentCommit: string,
): string {
  const report = joinAdoptionResults(inputs, currentCommit);
  const contexts = inputs.map((input) =>
    remeasurementContext(object(input).execution),
  );
  const entry = (sourceIndex: number, label = "Remeasure snapshot") =>
    contexts[sourceIndex]
      ? `[${label}](#${remeasurementAnchor(sourceIndex)})`
      : "Remeasurement unavailable: incomplete snapshot identity";
  const pretty = (value: unknown) =>
    JSON.stringify(value, null, 2).split("\n").map(cell).join("\n");
  const table = (rows: AdoptionRow[]) => [
    "| Source / run | Engine / model | Status | Adoption | Reasons | Next step |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${[`${r.sourceIndex + 1} / ${r.runIndex + 1}`, `${r.engine} / ${r.model}`, r.status, r.adoption, r.reasons.join(", ") || "none"].map(cell).join(" | ")} | ${entry(r.sourceIndex)} |`,
    ),
    "",
    "<details>",
    "<summary>Recorded evidence</summary>",
    "",
    ...rows.flatMap((row) => [
      `### Source / run ${row.sourceIndex + 1} / ${row.runIndex + 1}`,
      "",
      `<pre>${pretty({ metrics: row.metrics, quality: row.quality, ...(row.error !== undefined ? { error: row.error } : {}) })}</pre>`,
      "",
    ]),
    "</details>",
    "",
  ];
  const sections = report.groups.flatMap((group) => [
    `## ${group.id}`,
    "",
    "Rows in this group share every recorded comparison dimension.",
    "",
    ...table(group.rowIndexes.map((index) => report.rows[index])),
    "<details>",
    "<summary>Exact group conditions</summary>",
    "",
    `<pre>${pretty(JSON.parse(group.conditionKey))}</pre>`,
    "",
    "</details>",
    "",
  ]);
  const ungrouped = report.rows.filter(
    (row) => row.groupId === null && !row.excluded,
  );
  if (ungrouped.length)
    sections.push(
      "## Undetermined conditions",
      "",
      "These rows lack comparison metadata. They are not mutually comparable and do not form a condition group.",
      "",
      ...table(ungrouped),
    );
  return [
    "# Local inference adoption and comparability",
    "",
    "Adoption pass means the recorded fixtures passed under complete recorded conditions; it is not a general model recommendation. Only rows with the same condition group share all recorded comparison dimensions. Missing metadata is undetermined. Groups do not establish statistical significance or verify provenance. Engine and runtime are exact identity dimensions; no cross-engine equivalence is inferred.",
    "",
    ...(inputs.some(
      (input) =>
        typeof object(input).procedure === "string" &&
        String(object(input).procedure).startsWith("synthetic"),
    )
      ? [
          "Synthetic entries test joining and are not measured engine performance.",
          "",
        ]
      : []),
    ...(report.evaluatorMismatches.length
      ? [
          "## Evaluator version mismatch",
          "",
          "EVALUATOR-VERSION-MISMATCH: Evaluator versions differ; direct comparison is blocked. Adoption is local to each recorded evaluator; no cross-version winner or quality delta is computed.",
          "",
          "| Source / run A | Evaluator A (fixture: version) | Source / run B | Evaluator B (fixture: version) | Reason | Next step |",
          "| --- | --- | --- | --- | --- | --- |",
          ...report.evaluatorMismatches.map(({ rowIndexes, reason }) => {
            const [a, b] = rowIndexes.map((index) => report.rows[index]);
            const versions = (r: AdoptionRow) =>
              r.quality
                .map((q) => `${q.fixtureId}: ${q.evaluatorVersion}`)
                .sort(compare)
                .join(", ");
            return `| ${cell(`${a.sourceIndex + 1} / ${a.runIndex + 1}`)} | ${cell(versions(a))} | ${cell(`${b.sourceIndex + 1} / ${b.runIndex + 1}`)} | ${cell(versions(b))} | ${reason} | ${entry(a.sourceIndex, "Remeasure A")} / ${entry(b.sourceIndex, "Remeasure B")} |`;
          }),
          "",
        ]
      : []),
    "## Commit eligibility",
    "",
    `Current comparison commit: ${report.currentCommit}`,
    "",
    "COMMIT-MISMATCH: Saved measurement commit differs from the current comparison commit. MISSING-COMMIT: No saved commit was recorded. These rows are excluded from adoption and condition groups; recorded evidence remains available below. [Recovery guidance](./local-inference-adoption-format.md#commit-eligibility).",
    "",
    "| Source / run | Saved commit | Eligibility | Reason |",
    "| --- | --- | --- | --- |",
    ...report.rows.map((row) => {
      if (row.reasons[0] === "MISSING-COMMIT")
        return `| ${row.sourceIndex + 1} / ${row.runIndex + 1} | not recorded | excluded (cannot adopt) | MISSING-COMMIT: Target commit SHA was not recorded. [Missing commit guidance](./local-inference-adoption-format.md#missing-commit) |`;
      const commitExcluded = row.reasons.includes("COMMIT-MISMATCH");
      return `| ${row.sourceIndex + 1} / ${row.runIndex + 1} | ${row.commitSha ?? "not recorded"} | ${commitExcluded ? "excluded" : "eligible"} | ${commitExcluded ? "COMMIT-MISMATCH" : "none"} |`;
    }),
    "",
    "## Runner version eligibility",
    "",
    "Only explicitly supported runner versions clear this gate. Commit eligibility alone does not permit adoption. Unknown or missing versions are excluded from adoption, condition groups and evaluator differences; original metrics and quality remain evidence. A supported version still requires all other checks.",
    "",
    "| Source / run | Runner version | Eligibility | Reason / next step |",
    "| --- | --- | --- | --- |",
    ...report.rows.map((row) => {
      const recovery = row.runnerRecovery;
      return `| ${row.sourceIndex + 1} / ${row.runIndex + 1} | ${row.runnerVersion ?? "unavailable"} | ${recovery ? "excluded (cannot adopt)" : "supported"} | ${recovery ? `${recovery.reason}: ${recovery.message} [Runner recovery guidance](${recovery.href})` : "none"} |`;
    }),
    "",
    ...report.rows
      .filter((row) => row.excluded)
      .flatMap((row) => [
        "<details>",
        `<summary>Excluded evidence: source / run ${row.sourceIndex + 1} / ${row.runIndex + 1}</summary>`,
        "",
        `<pre>${pretty({ metrics: row.metrics, quality: row.quality })}</pre>`,
        "",
        "</details>",
        "",
      ]),
    "## Snapshot-bound remeasurement",
    "",
    "Each entry is pinned to the saved snapshot, not latest or the current checkout. Missing or unsupported identity disables the entry. Rendering and preparing a plan do not execute inference.",
    "",
    "| Source | Next step |",
    "| --- | --- |",
    ...contexts.map((_, index) => `| ${index + 1} | ${entry(index)} |`),
    "",
    ...contexts.flatMap((context, index) =>
      context
        ? [
            `### Source ${index + 1} remeasurement {#${remeasurementAnchor(index)}}`,
            "",
            `Snapshot execution ID: \`${context.runId}\``,
            "",
            `Snapshot target commit: \`${context.targetCommit}\``,
            "",
            `Snapshot runner version: \`${context.runnerVersion}\``,
            "",
            `Current comparison commit: \`${report.currentCommit}\`. This entry preserves the snapshot target even if it differs.`,
            "",
            "From packages/tech, replace only snapshot.json with the original artifact path:",
            "",
            "```sh",
            `node --import tsx/esm src/entrypoints/prepare-local-inference-remeasurement.ts ${context.runId} ${context.targetCommit} ${context.runnerVersion} snapshot.json`,
            "```",
            "",
            "The guard reads the original snapshot and rejects any changed identity before returning a plan. Preserve the old artifact. Use the pinned target and runner in a trusted checkout, retain all recorded input/model/evaluator conditions, and save remeasurement under a NEW execution ID and output path. Never reuse the source execution ID for the new run. No engine runner is invoked by this entry.",
            "",
            "[Remeasurement contract](./local-inference-adoption-format.md#snapshot-bound-remeasurement)",
            "",
          ]
        : [],
    ),
    ...sections,
    "[Input contract and interpretation](./local-inference-adoption-format.md)",
    "",
  ].join("\n");
}

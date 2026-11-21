/** Presentation contract for decisions produced by an upstream snapshot verifier.
 * This module never reads measurements or computes thresholds. */
export type PublicationAxis = "speed" | "quality" | "memory" | "environment";
export type PublicationReason = "pass" | "fail" | "missing" | "unsupported";
export type VerifiedSnapshotResult = Readonly<{
  verification: "verified";
  runId: string;
  commit: string;
  runnerVersion: string;
  decision: "adopt" | "reject";
  reasons: Readonly<Record<PublicationAxis, PublicationReason>>;
}>;

const axes = ["speed", "quality", "memory", "environment"] as const;
const labels = {
  speed: "Speed",
  quality: "Quality",
  memory: "Memory",
  environment: "Environment",
} as const;
const reasonText: Record<PublicationReason, string> = {
  pass: "Meets policy",
  fail: "Does not meet policy",
  missing: "Evidence missing",
  unsupported: "Measurement unsupported",
};

/** Render only an upstream-verified decision. The verifier is responsible for
 * run ID/commit/runner matching, measurement validation and policy evaluation.
 * The marker is an API contract, not a substitute for those checks. Only fixed
 * reason text and restricted provenance identifiers enter public Markdown. */
export const renderVerifiedSnapshotResults = (
  results: ReadonlyArray<VerifiedSnapshotResult>,
): string => {
  if (results.length === 0) throw new Error("No verified snapshot results");
  const seen = new Set<string>();
  const rows = results.map((result) => {
    if (
      result.verification !== "verified" ||
      typeof result.runId !== "string" ||
      typeof result.commit !== "string" ||
      typeof result.runnerVersion !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(result.runId) ||
      !/^[a-fA-F0-9]{40}$/.test(result.commit) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,63}$/.test(result.runnerVersion)
    ) {
      throw new Error("Verified provenance required");
    }
    if (seen.has(result.runId)) throw new Error("Duplicate snapshot run ID");
    seen.add(result.runId);
    const reasons = axes.map((axis) => {
      const reason = result.reasons?.[axis];
      if (!Object.hasOwn(reasonText, reason)) {
        throw new Error("Four recognized reasons required");
      }
      return `| ${labels[axis]} | ${reasonText[reason]} |`;
    });
    const allPass = axes.every((axis) => result.reasons[axis] === "pass");
    if (
      (result.decision !== "adopt" && result.decision !== "reject") ||
      (result.decision === "adopt") !== allPass
    ) {
      throw new Error("Decision and reasons disagree");
    }
    return [
      `### Run ${result.runId}: ${result.decision === "adopt" ? "Adopt" : "Reject"}`,
      "",
      `Commit: \`${result.commit}\`; runner: \`${result.runnerVersion}\`.`,
      "",
      "| Aspect | Reason |",
      "| --- | --- |",
      ...reasons,
    ].join("\n");
  });
  return `${rows.join("\n\n")}\n`;
};

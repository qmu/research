import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isDirectRun } from "./direct-run";
import { MODELS } from "../llm-model-comparison/models";
import {
  buildFoundationModelsCatalog,
  renderFoundationModelsReport,
} from "../llm-model-comparison/domain/catalog";

/**
 * Effectful runner for REFERENCE topics — topics with no live benchmark. Two
 * kinds:
 *   - "catalog": generated deterministically from a source of truth (the model
 *     registry). Keyless and byte-stable, like a fixture.
 *   - "article": a hand-written design/reference article that already carries
 *     its own provenance labels; the runner only confirms it exists and points
 *     to it, never regenerating it.
 * Neither performs provider calls; the provenance is carried on the page so a
 * reference is never mistaken for a measurement.
 */
export type ReferenceKind = "catalog" | "article";

const docsReportDir = (): string =>
  resolve(process.cwd(), "../../docs/research-reports");

const generateFoundationModelsCatalog = async (): Promise<void> => {
  const catalog = buildFoundationModelsCatalog(MODELS);
  const reportPath = resolve(docsReportDir(), "foundation-models.md");
  const artifactPath = resolve(docsReportDir(), "foundation-models.data.json");
  await mkdir(docsReportDir(), { recursive: true });
  await writeFile(reportPath, renderFoundationModelsReport(catalog), "utf8");
  await writeFile(
    artifactPath,
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `research foundation-models: catalog of ${catalog.rows.length} models (provenance: catalog, source ${catalog.generatedFrom})\n` +
      `wrote ${reportPath}\nwrote ${artifactPath}\n`,
  );
};

const confirmArticle = async (
  topicId: string,
  articlePath: string,
): Promise<void> => {
  const absolute = resolve(process.cwd(), "../..", articlePath);
  try {
    await access(absolute);
  } catch {
    process.stderr.write(
      `research ${topicId}: reference article missing at ${articlePath}\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `research ${topicId}: reference article (provenance: design-comparison / 未測定 / 要確認) at ${articlePath} — hand-authored, not regenerated\n`,
  );
};

export type ReferenceTopicOptions = Readonly<{
  topicId: string;
  kind: ReferenceKind;
  /** For "article" topics: repo-relative path to the hand-written article. */
  articlePath?: string;
}>;

export const runReferenceTopic = async (
  options: ReferenceTopicOptions,
): Promise<void> => {
  if (options.kind === "catalog") {
    await generateFoundationModelsCatalog();
    return;
  }
  if (options.articlePath === undefined) {
    throw new Error(
      `reference topic '${options.topicId}' is kind 'article' but has no articlePath`,
    );
  }
  await confirmArticle(options.topicId, options.articlePath);
};

if (isDirectRun(import.meta.url)) {
  runReferenceTopic({ topicId: "foundation-models", kind: "catalog" }).catch(
    (error: unknown) => {
      process.stderr.write(`reference topic failed: ${String(error)}\n`);
      process.exitCode = 1;
    },
  );
}

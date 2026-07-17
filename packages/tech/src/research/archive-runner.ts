import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  findPublishedResearchTopic,
  historyPathFor,
  reportFrameSources,
  type ResearchSiteTopic,
} from "./domain/site";

const repoRoot = (): string => resolve(process.cwd(), "../..");

const repoPath = (path: string): string => resolve(repoRoot(), path);

const copyIfPresent = async (
  source: string | undefined,
  destination: string,
): Promise<boolean> => {
  if (source === undefined) return false;
  try {
    await mkdir(dirname(repoPath(destination)), { recursive: true });
    await copyFile(repoPath(source), repoPath(destination));
    return true;
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    if (code === "ENOENT") return false;
    throw error;
  }
};

/**
 * A real run's report and artifact reference the gitignored
 * `<artifactBase>.real.data.json`; inside a dated frame the artifact is
 * committed under the plain `<artifactBase>.data.json` name, so the archived
 * copies rewrite that one reference. Pure and exported for unit tests.
 */
export const rewriteRealArtifactReferences = (
  content: string,
  artifactBase: string,
): string =>
  content
    .split(`${artifactBase}.real.data.json`)
    .join(`${artifactBase}.data.json`);

/** The `.real` sibling of a rendered page or data artifact path. */
const realSiblingOf = (path: string): string =>
  path.replace(/\.data\.json$/, ".real.data.json").replace(/\.md$/, ".real.md");

/**
 * Copy `source`'s `.real` sibling (a real run's gitignored output) into the
 * frame when it exists — rewriting the `.real.data.json` artifact reference to
 * the committed frame name — and fall back to the canonical file otherwise.
 * The dated frames are the committed real-data source of truth (the
 * llm-model-comparison convention), so a frame archived right after a real run
 * must carry the measured report and artifact, never the keyless fixture
 * render that occupies the canonical paths until the current pages are
 * re-composed from the new frame.
 */
const copyPreferringReal = async (
  topic: ResearchSiteTopic,
  source: string | undefined,
  destination: string,
): Promise<boolean> => {
  if (source !== undefined) {
    try {
      const real = await readFile(repoPath(realSiblingOf(source)), "utf8");
      await mkdir(dirname(repoPath(destination)), { recursive: true });
      await writeFile(
        repoPath(destination),
        rewriteRealArtifactReferences(real, topic.artifactBase),
        "utf8",
      );
      return true;
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (code !== "ENOENT") throw error;
    }
  }
  return copyIfPresent(source, destination);
};

export type ArchiveReportOptions = Readonly<{
  topicId: string;
  generatedAt: string;
}>;

export const archiveReportFrame = async (
  options: ArchiveReportOptions,
): Promise<ReadonlyArray<string>> => {
  const topic = findPublishedResearchTopic(options.topicId);
  if (topic === undefined) {
    throw new Error(`unknown published research topic: ${options.topicId}`);
  }
  const reportSources = reportFrameSources(topic);
  const copies = [
    {
      source: reportSources.source,
      destination: historyPathFor(topic, options.generatedAt, "source"),
      preferReal: true,
    },
    {
      source: topic.dataPath,
      destination: historyPathFor(topic, options.generatedAt, "data"),
      preferReal: true,
    },
    {
      source: reportSources.japanese,
      destination: historyPathFor(topic, options.generatedAt, "japanese"),
      preferReal: false,
    },
  ];
  const written: string[] = [];
  for (const copy of copies) {
    const copied = copy.preferReal
      ? await copyPreferringReal(topic, copy.source, copy.destination)
      : await copyIfPresent(copy.source, copy.destination);
    if (copied) {
      written.push(copy.destination);
    }
  }
  return written;
};

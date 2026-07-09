import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  historyPathFor,
  researchSiteTopics,
  type ResearchSiteTopic,
} from "./domain/site";

const repoRoot = (): string => resolve(process.cwd(), "../..");

const repoPath = (path: string): string => resolve(repoRoot(), path);

const findSiteTopic = (id: string): ResearchSiteTopic | undefined =>
  researchSiteTopics.find((topic) => topic.id === id);

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

export type ArchiveReportOptions = Readonly<{
  topicId: string;
  generatedAt: string;
}>;

export const archiveReportFrame = async (
  options: ArchiveReportOptions,
): Promise<ReadonlyArray<string>> => {
  const topic = findSiteTopic(options.topicId);
  if (topic === undefined) {
    throw new Error(`unknown site topic: ${options.topicId}`);
  }
  const copies = [
    {
      source: topic.source.docsPath,
      destination: historyPathFor(topic, options.generatedAt, "source"),
    },
    {
      source: topic.dataPath,
      destination: historyPathFor(topic, options.generatedAt, "data"),
    },
    {
      source: topic.japanese.docsPath,
      destination: historyPathFor(topic, options.generatedAt, "japanese"),
    },
  ];
  const written: string[] = [];
  for (const copy of copies) {
    if (await copyIfPresent(copy.source, copy.destination)) {
      written.push(copy.destination);
    }
  }
  return written;
};

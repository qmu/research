import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { markdownImageRefs } from "../image-generation/domain/report";
import { publishedResearchTopics } from "./domain/site";

/**
 * Existence guard for embedded images (Quality Gate: "Report embeds resolve").
 * Every markdown image reference (`![alt](path)`) on a committed published page
 * or in a committed dated history frame must resolve to a file on disk, so the
 * pictures the article promises actually ship. Remote (`http(s)://`) and
 * site-absolute (`/...`, resolved by VitePress) refs are out of scope.
 *
 * Until a manifest-v2 real run lands, the image-generation pages carry no image
 * references and this guard passes over an empty set — it becomes load-bearing
 * the moment persisted images are committed.
 */

const repoRoot = resolve(process.cwd(), "../..");

const isLocalRef = (ref: string): boolean =>
  !/^https?:\/\//.test(ref) && !ref.startsWith("/") && !ref.startsWith("#");

const collectMarkdownFiles = (dir: string): ReadonlyArray<string> => {
  const absolute = resolve(repoRoot, dir);
  if (!existsSync(absolute)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...collectMarkdownFiles(child));
    } else if (entry.name.endsWith(".md")) {
      out.push(child);
    }
  }
  return out;
};

const currentPages = publishedResearchTopics.flatMap((topic) => [
  topic.source.docsPath,
  topic.japanese.docsPath,
]);

const framePages = collectMarkdownFiles("docs/research-reports/history");

describe("embedded image references resolve on disk", () => {
  const pages = [...currentPages, ...framePages];

  it("has pages to check", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it("resolves every local markdown image reference to a committed file", () => {
    const missing: string[] = [];
    for (const page of pages) {
      const absolute = resolve(repoRoot, page);
      if (!existsSync(absolute)) continue;
      const markdown = readFileSync(absolute, "utf8");
      for (const ref of markdownImageRefs(markdown)) {
        if (!isLocalRef(ref)) continue;
        const target = resolve(dirname(absolute), ref);
        if (!existsSync(target)) missing.push(`${page} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

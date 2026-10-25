import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import * as prettier from "prettier";

const FILES = ["comparison.ts", "comparison.test.ts"];

describe("TEMP prettier debug (to be deleted)", () => {
  for (const name of FILES) {
    it(`diff for ${name}`, async () => {
      const filepath = join(__dirname, name);
      const source = readFileSync(filepath, "utf8");
      const options = (await prettier.resolveConfig(filepath)) ?? {};
      const formatted = await prettier.format(source, {
        ...options,
        filepath,
      });
      if (formatted === source) return;

      const src = source.split("\n");
      const fmt = formatted.split("\n");
      let start = 0;
      while (
        start < src.length &&
        start < fmt.length &&
        src[start] === fmt[start]
      ) {
        start += 1;
      }
      let endSrc = src.length - 1;
      let endFmt = fmt.length - 1;
      while (endSrc > start && endFmt > start && src[endSrc] === fmt[endFmt]) {
        endSrc -= 1;
        endFmt -= 1;
      }
      const before = src.slice(start, endSrc + 1).join("\n");
      const after = fmt.slice(start, endFmt + 1).join("\n");
      throw new Error(
        `PRETTIER WOULD CHANGE ${name} at lines ${start + 1}-${endSrc + 1}\n` +
          `>>> BEFORE >>>\n${before}\n<<< BEFORE <<<\n` +
          `>>> AFTER >>>\n${after}\n<<< AFTER <<<`,
      );
    });
  }
});

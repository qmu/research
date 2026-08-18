/**
 * Check every published Japanese page for glossary drift. No API calls.
 *
 * The point of being API-free is economic: a translation pass over the two long
 * reports costs about $7.20, so discovering a labelling regression by paying for
 * another pass is the expensive way to find out. This runs over the committed
 * Markdown in milliseconds.
 *
 *   npm run check:glossary            # every *.insights.ja.md page
 *   npm run check:glossary -- <path>… # named pages
 *
 * Exits non-zero when any page carries a forbidden rendering.
 *
 * **Not yet wired into `make lint`**, deliberately: the pages committed at
 * `1fefebc` are the known-bad regression fixtures this ticket was filed against,
 * so wiring it in today would turn CI red on content the ticket says to leave
 * alone. Wire it in once those pages have been regenerated under the glossary —
 * that ordering is the only reason it is a separate script.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  describeGlossaryDrift,
  findGlossaryDrift,
} from "../research/domain/translation-glossary";

// cwd is `packages/tech`, the convention every other runner here uses.
const REPORT_DIR = resolve(process.cwd(), "../../docs/research-reports");

const named = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

const targets =
  named.length > 0
    ? named.map((path) => resolve(process.cwd(), path))
    : readdirSync(REPORT_DIR)
        .filter((name) => name.endsWith(".insights.ja.md"))
        .sort()
        .map((name) => resolve(REPORT_DIR, name));

let pagesWithDrift = 0;
let findings = 0;

for (const target of targets) {
  const drift = findGlossaryDrift(readFileSync(target, "utf8"));
  if (drift.length === 0) continue;
  pagesWithDrift += 1;
  findings += drift.length;
  console.log(target.replace(`${REPORT_DIR}/`, ""));
  for (const entry of drift) console.log(`  ${describeGlossaryDrift(entry)}`);
}

console.log(
  `checked ${targets.length} page(s): ${findings} finding(s) across ${pagesWithDrift} page(s)`,
);
process.exit(findings === 0 ? 0 : 1);

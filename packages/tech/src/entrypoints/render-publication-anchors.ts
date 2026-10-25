import { readFileSync } from "node:fs";
import {
  renderPublicationSections,
  type PublicationSections,
} from "../publication-anchors/domain/markdown.js";

try {
  const input = JSON.parse(readFileSync(0, "utf8")) as PublicationSections;
  process.stdout.write(renderPublicationSections(input));
} catch {
  process.stderr.write("Invalid public adoption sections\n");
  process.exitCode = 1;
}

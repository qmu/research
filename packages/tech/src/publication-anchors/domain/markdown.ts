/** Stable public identifiers, independent of translated labels and row order. */
export type PublicationSection = "engines" | "metrics" | "reason-codes";
export type PublicationEntry = Readonly<{
  key: string;
  label: string;
  description: string;
}>;
export type PublicationSections = Readonly<
  Record<PublicationSection, readonly PublicationEntry[]>
>;

const sections = ["engines", "metrics", "reason-codes"] as const;
const titles: Record<PublicationSection, string> = {
  engines: "Engines",
  metrics: "Metrics",
  "reason-codes": "Reason codes",
};

/** Keys are persisted identifiers, never display-name slugs. Case is significant. */
export function publicationAnchor(
  section: PublicationSection,
  key?: string,
): string {
  if (
    !sections.includes(section) ||
    (key !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(key))
  ) {
    throw new Error("Invalid publication anchor key");
  }
  return `adoption-${section}${key === undefined ? "" : `-${key}`}`;
}

function escapeText(value: string): string {
  if (typeof value !== "string" || /[\r\n]/.test(value))
    throw new Error("Single-line publication text required");
  return value.replace(
    /[&<>"'\\`*_[\]{}()#!|]/g,
    (char) => `&#${char.codePointAt(0)};`,
  );
}

/** Render the reference sections appended to an upstream adoption report.
 * This is presentation only: callers supply public text and verified decisions.
 * Explicit HTML anchors work in both GitHub Markdown and VitePress.
 */
export function renderPublicationSections(input: PublicationSections): string {
  return (
    sections
      .map((section) => {
        const seen = new Set<string>();
        const entries = input[section].map((entry) => {
          const id = publicationAnchor(section, entry.key);
          if (seen.has(id)) throw new Error("Duplicate publication anchor key");
          seen.add(id);
          return `<a id="${id}"></a>\n\n### ${escapeText(entry.label)}\n\n${escapeText(entry.description)}`;
        });
        return [
          `<a id="${publicationAnchor(section)}"></a>`,
          `## ${titles[section]}`,
          ...entries,
        ].join("\n\n");
      })
      .join("\n\n") + "\n"
  );
}

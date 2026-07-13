/**
 * A dependency-free structural well-formedness check for XML / SVG source.
 *
 * It is NOT a full XML validator: it does not resolve entities, validate
 * namespaces, or process a DTD's internal subset. It verifies the one property
 * the render-validity metric needs on the keyless path — that every element tag
 * is opened and closed in correctly nested order — while honouring self-closing
 * tags, comments, CDATA sections, processing instructions, and declarations.
 * A real rasterizer/parser is the stronger check applied on the real-run
 * follow-up; this is the mechanical "does it parse as a single element tree"
 * signal that runs without a browser or codec.
 */

const NAME_START = /[A-Za-z_:]/;
const WHITESPACE = /\s/;

/** True when `source` is a single, correctly-nested element tree. */
export const isWellFormedXml = (source: string): boolean => {
  const stack: string[] = [];
  const n = source.length;
  let i = 0;
  let sawRoot = false;

  while (i < n) {
    if (source[i] !== "<") {
      i += 1;
      continue;
    }

    // Non-element constructs beginning with '<'.
    if (source.startsWith("<!--", i)) {
      const close = source.indexOf("-->", i + 4);
      if (close === -1) return false;
      i = close + 3;
      continue;
    }
    if (source.startsWith("<![CDATA[", i)) {
      const close = source.indexOf("]]>", i + 9);
      if (close === -1) return false;
      i = close + 3;
      continue;
    }
    if (source.startsWith("<?", i)) {
      const close = source.indexOf("?>", i + 2);
      if (close === -1) return false;
      i = close + 2;
      continue;
    }
    if (source.startsWith("<!", i)) {
      // DOCTYPE / declaration: skip to its closing '>' (no internal-subset handling).
      const close = source.indexOf(">", i + 2);
      if (close === -1) return false;
      i = close + 1;
      continue;
    }

    // Closing tag.
    if (source.startsWith("</", i)) {
      let j = i + 2;
      while (j < n && WHITESPACE.test(source[j])) j += 1;
      const start = j;
      while (j < n && !WHITESPACE.test(source[j]) && source[j] !== ">") j += 1;
      const name = source.slice(start, j);
      while (j < n && source[j] !== ">") j += 1;
      if (j >= n || name === "") return false;
      if (stack.pop() !== name) return false;
      i = j + 1;
      continue;
    }

    // Opening or self-closing tag.
    let j = i + 1;
    if (j >= n || !NAME_START.test(source[j])) return false; // stray '<'
    const start = j;
    while (
      j < n &&
      !WHITESPACE.test(source[j]) &&
      source[j] !== ">" &&
      source[j] !== "/"
    ) {
      j += 1;
    }
    const name = source.slice(start, j);

    // Scan attributes with quote awareness until the unquoted tag-closing '>'.
    let quote: string | null = null;
    let selfClose = false;
    while (j < n) {
      const c = source[j];
      if (quote !== null) {
        if (c === quote) quote = null;
        j += 1;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        j += 1;
        continue;
      }
      if (c === ">") break;
      if (c === "/") {
        let k = j + 1;
        while (k < n && WHITESPACE.test(source[k])) k += 1;
        if (source[k] === ">") {
          selfClose = true;
          j = k;
          break;
        }
      }
      j += 1;
    }
    if (j >= n || source[j] !== ">") return false; // unterminated tag

    if (stack.length === 0) {
      if (sawRoot) return false; // a second top-level element — not a single tree
      sawRoot = true;
    }
    if (!selfClose) stack.push(name);
    i = j + 1;
  }

  return sawRoot && stack.length === 0;
};

/** The name of the first element (root), ignoring comments/CDATA/PI/declarations.
 * Returns null when there is no element. */
export const rootElementName = (source: string): string | null => {
  const stripped = source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<![^>]*>/g, "");
  const match = stripped.match(/<([A-Za-z_:][A-Za-z0-9_:.-]*)/);
  return match ? match[1] : null;
};

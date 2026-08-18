/**
 * The generated hard-input corpus.
 *
 * The easy v1 corpus does not separate the models — that is the defect this
 * corpus exists to fix. Real hard documents cannot be used (licensing, privacy,
 * reproducibility), so the corpus is generated, and because it is generated the
 * ground truth is exact.
 *
 * **The load-bearing property is that ground truth and pixels come from one
 * source.** A page is described once, as a `HardPage` of rows and cells; the
 * renderer draws that description and `referenceTextOf` reads the same
 * description. Neither is transcribed from the other, so they cannot drift — the
 * failure mode where a corpus quietly scores models against text its images do
 * not contain is structurally absent rather than merely tested for. The tests
 * pin the property; this design is what makes it hold.
 *
 * Every page is a pure function of `(corpusVersion, classId, index)`, so the
 * corpus is stable across surveys and cross-run history connects like with like.
 * Changing any generator below changes what past frames mean: bump
 * `HARD_CORPUS_VERSION` deliberately, never as a side effect of a tweak.
 */
import { NO_DEGRADATION, createRng } from "./degradation";
import type { DegradationProfile } from "./degradation";
import { GLYPHS } from "./raster";
import type { FieldSpec } from "./types";

/** Bump deliberately. History only connects frames sharing this value. */
export const HARD_CORPUS_VERSION = "hard-v1";

export type HardClassId = "low-quality-scan" | "high-density" | "nested-table";

export const HARD_CLASS_IDS: ReadonlyArray<HardClassId> = [
  "low-quality-scan",
  "high-density",
  "nested-table",
];

/** One cell of a row, drawn at the column offset its index selects. */
export type HardCell = Readonly<{ column: number; text: string }>;

export type HardRow = Readonly<{ cells: ReadonlyArray<HardCell> }>;

/** A horizontal rule, in page coordinates. */
export type HardRule = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type HardPage = Readonly<{
  scale: number;
  lineSpacing: number;
  marginX: number;
  marginY: number;
  /** x offsets, in pixels, that a cell's `column` indexes into. */
  columns: ReadonlyArray<number>;
  rows: ReadonlyArray<HardRow>;
  rules: ReadonlyArray<HardRule>;
  degradation: DegradationProfile;
}>;

export type HardDocument = Readonly<{
  id: string;
  classId: HardClassId;
  page: HardPage;
  /** Derived from `page` by `referenceTextOf` — never authored separately. */
  referenceText: string;
  fields: Readonly<Record<string, string>>;
}>;

export type HardClassSpec = Readonly<{
  id: HardClassId;
  title: string;
  /** What makes this class hard, in one verifiable sentence. */
  difficulty: string;
  fields: ReadonlyArray<FieldSpec>;
  documents: number;
}>;

export type HardCorpus = Readonly<{
  version: string;
  widthPx: number;
  heightPx: number;
  classes: ReadonlyArray<HardClassSpec>;
  documents: ReadonlyArray<HardDocument>;
}>;

/** Every page in every class shares these dimensions — see `resample`. */
export const HARD_PAGE_WIDTH = 960;
export const HARD_PAGE_HEIGHT = 640;

/**
 * The ground truth of a page: its rows, each row's cells joined by one space.
 *
 * A single space between cells is what the scorer's own normalization produces
 * from any run of whitespace (`normalizeOcrText`), so the reference is written
 * in the same shape the candidate is compared in. Indentation and column
 * geometry deliberately carry no meaning here — structure is scored through the
 * fields, and expecting a transcriber to reproduce pixel columns would penalize
 * a correct read.
 */
export const referenceTextOf = (page: HardPage): string =>
  page.rows
    .map((row) =>
      row.cells
        .map((cell) => cell.text.trim())
        .filter((text) => text !== "")
        .join(" "),
    )
    .filter((line) => line !== "")
    .join("\n");

/**
 * Characters the 5x7 font can draw. Anything else would render as a space.
 *
 * The newline is exempt: `referenceTextOf` uses it to separate rows, and it is
 * never handed to the renderer as a character to draw.
 */
const drawableChars = (text: string): ReadonlyArray<string> =>
  Array.from(text.toUpperCase()).filter((char) => char !== "\n");

const renderable = (text: string): boolean =>
  drawableChars(text).every((char) => GLYPHS[char] !== undefined);

/**
 * Guard the one way this corpus could fabricate a score: a reference character
 * the font cannot draw renders as a blank, and every model is then marked wrong
 * for reading what the page actually shows. Generators run through this.
 */
export const assertRenderable = (text: string, where: string): void => {
  if (!renderable(text)) {
    const bad = Array.from(new Set(drawableChars(text))).filter(
      (char) => GLYPHS[char] === undefined,
    );
    throw new Error(
      `Hard corpus ${where} contains characters the font cannot draw: ${bad.join("")}`,
    );
  }
};

const VENDORS: ReadonlyArray<string> = [
  "NORTHSIDE SUPPLY",
  "ORCHARD LOGISTICS",
  "MERIDIAN PARTS",
  "BLUEWATER TRADING",
  "KESTREL WORKS",
  "HARBOUR MILLING",
];

const ITEMS: ReadonlyArray<string> = [
  "STEEL BRACKET",
  "COPPER FITTING",
  "NYLON WASHER",
  "BRASS COUPLER",
  "CARBON SLEEVE",
  "ALLOY SPACER",
  "RUBBER GASKET",
  "TITANIUM PIN",
];

const pick = <T>(rng: () => number, values: ReadonlyArray<T>): T => {
  const index = Math.floor(rng() * values.length);
  return values[Math.min(index, values.length - 1)] as T;
};

const integer = (rng: () => number, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

const money = (value: number): string => value.toFixed(2);

const isoDate = (rng: () => number): string => {
  const month = integer(rng, 1, 12);
  const day = integer(rng, 1, 28);
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/**
 * The seed for one document. Deriving it from the version string as well as the
 * class and index means a version bump reshuffles the whole corpus, which is the
 * honest behavior: a new version is a new corpus, not the old one relabelled.
 */
const seedFor = (
  version: string,
  classId: HardClassId,
  index: number,
): number => {
  let hash = 2166136261;
  for (const char of `${version}:${classId}:${index}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const RECEIPT_FIELDS: ReadonlyArray<FieldSpec> = [
  { name: "vendor", type: "string", normalization: "uppercase-collapse-space" },
  { name: "document_id", type: "string", normalization: "uppercase-trim" },
  { name: "date", type: "string", normalization: "iso-date" },
  { name: "line_count", type: "string", normalization: "uppercase-trim" },
  { name: "total", type: "string", normalization: "decimal-string" },
];

const NESTED_FIELDS: ReadonlyArray<FieldSpec> = [
  { name: "document_id", type: "string", normalization: "uppercase-trim" },
  { name: "group_count", type: "string", normalization: "uppercase-trim" },
  {
    name: "group_2_name",
    type: "string",
    normalization: "uppercase-collapse-space",
  },
  {
    name: "group_2_line_count",
    type: "string",
    normalization: "uppercase-trim",
  },
  { name: "group_2_subtotal", type: "string", normalization: "decimal-string" },
  { name: "grand_total", type: "string", normalization: "decimal-string" },
];

type Built = Readonly<{
  page: HardPage;
  fields: Readonly<Record<string, string>>;
}>;

/**
 * Low-quality scan: an ordinary receipt at ordinary size, then put through the
 * resample/block/tone/speckle chain. The layout is deliberately *easy* — the
 * difficulty is entirely in the degradation, so a model's score on this class
 * isolates robustness to image quality rather than to layout.
 */
const buildLowQualityScan = (index: number, rng: () => number): Built => {
  const vendor = pick(rng, VENDORS);
  const documentId = `LQ-${String(1000 + index)}`;
  const date = isoDate(rng);
  const lineCount = integer(rng, 4, 6);
  const lines = Array.from({ length: lineCount }, () => {
    const item = pick(rng, ITEMS);
    const quantity = integer(rng, 1, 9);
    const amount = integer(rng, 250, 9800) / 100;
    return { item, quantity, amount };
  });
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  // Column 2 sits at 560, not further right: at scale 4 the widest cell it
  // carries is `DATE: 2026-09-23` (380px), and 600 pushed that off the page —
  // which would have clipped ground-truth text the reference still claimed.
  const columns = [64, 470, 560];
  const rows: HardRow[] = [
    { cells: [{ column: 0, text: "DELIVERY RECEIPT" }] },
    { cells: [{ column: 0, text: `VENDOR: ${vendor}` }] },
    {
      cells: [
        { column: 0, text: `DOC: ${documentId}` },
        { column: 2, text: `DATE: ${date}` },
      ],
    },
    {
      cells: [
        { column: 0, text: "ITEM" },
        { column: 1, text: "QTY" },
        { column: 2, text: "AMOUNT" },
      ],
    },
    ...lines.map((line) => ({
      cells: [
        { column: 0, text: line.item },
        { column: 1, text: String(line.quantity) },
        { column: 2, text: money(line.amount) },
      ],
    })),
    {
      cells: [
        { column: 0, text: "LINES" },
        { column: 1, text: String(lineCount) },
      ],
    },
    {
      cells: [
        { column: 0, text: "TOTAL" },
        { column: 2, text: money(total) },
      ],
    },
  ];
  return {
    page: {
      scale: 4,
      lineSpacing: 5,
      marginX: 64,
      marginY: 48,
      columns,
      rows,
      rules: [
        { x: 48, y: 32, width: HARD_PAGE_WIDTH - 96, height: 3 },
        {
          x: 48,
          y: HARD_PAGE_HEIGHT - 40,
          width: HARD_PAGE_WIDTH - 96,
          height: 3,
        },
      ],
      degradation: {
        downscaleFactor: 3,
        blockSize: 8,
        blockStrength: 0.55,
        toneLevels: 6,
        speckleProbability: 0.04,
        speckleMagnitude: 70,
        seed: Math.floor(rng() * 0xffffffff),
      },
    },
    fields: {
      vendor,
      document_id: documentId,
      date,
      line_count: String(lineCount),
      total: money(total),
    },
  };
};

/**
 * High character density: the same page geometry filled with small type.
 *
 * Scale 2 halves the stroke width of the v1 corpus, and the line spacing is cut
 * to match, so roughly four times as many characters occupy the same page. No
 * degradation is applied — this class isolates density, and mixing in noise
 * would make a low score unattributable to either cause.
 */
const buildHighDensity = (index: number, rng: () => number): Built => {
  const vendor = pick(rng, VENDORS);
  const documentId = `HD-${String(2000 + index)}`;
  const date = isoDate(rng);
  const lineCount = 28;
  const lines = Array.from({ length: lineCount }, (_, line) => {
    const item = pick(rng, ITEMS);
    const quantity = integer(rng, 1, 99);
    const amount = integer(rng, 100, 99900) / 100;
    return {
      code: `${String(line + 1).padStart(3, "0")}`,
      item,
      quantity,
      amount,
    };
  });
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const columns = [48, 130, 470, 600, 780];
  const rows: HardRow[] = [
    { cells: [{ column: 0, text: `DENSE LEDGER ${documentId}` }] },
    {
      cells: [
        { column: 0, text: `VENDOR: ${vendor}` },
        { column: 3, text: `DATE: ${date}` },
      ],
    },
    {
      cells: [
        { column: 0, text: "LINE" },
        { column: 1, text: "ITEM" },
        { column: 2, text: "QTY" },
        { column: 3, text: "AMOUNT" },
      ],
    },
    ...lines.map((line) => ({
      cells: [
        { column: 0, text: line.code },
        { column: 1, text: line.item },
        { column: 2, text: String(line.quantity) },
        { column: 3, text: money(line.amount) },
      ],
    })),
    {
      cells: [
        { column: 0, text: "LINES" },
        { column: 1, text: String(lineCount) },
      ],
    },
    {
      cells: [
        { column: 0, text: "TOTAL" },
        { column: 3, text: money(total) },
      ],
    },
  ];
  return {
    page: {
      scale: 2,
      lineSpacing: 4,
      marginX: 48,
      marginY: 36,
      columns,
      rows,
      rules: [{ x: 40, y: 26, width: HARD_PAGE_WIDTH - 80, height: 2 }],
      degradation: NO_DEGRADATION,
    },
    fields: {
      vendor,
      document_id: documentId,
      date,
      line_count: String(lineCount),
      total: money(total),
    },
  };
};

/**
 * Nested table: groups, each holding its own item lines and subtotal, inside one
 * ruled table with a grand total.
 *
 * The fields ask for `group_2_*` specifically. Reading them requires resolving
 * which lines belong to which group — a transcriber that flattens the table into
 * a list of rows will produce a plausible transcription and still get these
 * fields wrong, which is exactly the structural failure the class is here to
 * measure.
 */
const buildNestedTable = (index: number, rng: () => number): Built => {
  const documentId = `NT-${String(3000 + index)}`;
  const groupCount = 3;
  const groups = Array.from({ length: groupCount }, (_, group) => {
    const name = pick(rng, VENDORS);
    const lineCount = integer(rng, 2, 4);
    const lines = Array.from({ length: lineCount }, () => ({
      item: pick(rng, ITEMS),
      amount: integer(rng, 500, 48000) / 100,
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    return {
      name: `GROUP ${group + 1} ${name}`,
      plainName: name,
      lines,
      subtotal,
    };
  });
  const grandTotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const columns = [56, 200, 640, 800];
  const rows: HardRow[] = [
    { cells: [{ column: 0, text: `CONSOLIDATED STATEMENT ${documentId}` }] },
    { cells: [{ column: 0, text: `GROUPS: ${groupCount}` }] },
  ];
  const rules: HardRule[] = [
    { x: 40, y: 30, width: HARD_PAGE_WIDTH - 80, height: 3 },
  ];
  for (const group of groups) {
    rows.push({ cells: [{ column: 0, text: group.name }] });
    for (const line of group.lines) {
      rows.push({
        cells: [
          { column: 1, text: line.item },
          { column: 2, text: money(line.amount) },
        ],
      });
    }
    rows.push({
      cells: [
        { column: 1, text: "SUBTOTAL" },
        { column: 2, text: money(group.subtotal) },
      ],
    });
  }
  rows.push({
    cells: [
      { column: 0, text: "GRAND TOTAL" },
      { column: 2, text: money(grandTotal) },
    ],
  });
  const second = groups[1];
  if (second === undefined) {
    throw new Error("Nested-table generator requires at least two groups");
  }
  return {
    page: {
      scale: 3,
      lineSpacing: 4,
      marginX: 56,
      marginY: 44,
      columns,
      rows,
      rules,
      degradation: NO_DEGRADATION,
    },
    fields: {
      document_id: documentId,
      group_count: String(groupCount),
      group_2_name: second.plainName,
      group_2_line_count: String(second.lines.length),
      group_2_subtotal: money(second.subtotal),
      grand_total: money(grandTotal),
    },
  };
};

const BUILDERS: Readonly<
  Record<HardClassId, (index: number, rng: () => number) => Built>
> = {
  "low-quality-scan": buildLowQualityScan,
  "high-density": buildHighDensity,
  "nested-table": buildNestedTable,
};

export const HARD_CLASSES: ReadonlyArray<HardClassSpec> = [
  {
    id: "low-quality-scan",
    title: "Low-quality scan",
    difficulty:
      "An easy layout resampled to a third of its resolution, block-quantized, reduced to six grey levels and speckled, so the score isolates robustness to image quality.",
    fields: RECEIPT_FIELDS,
    documents: 3,
  },
  {
    id: "high-density",
    title: "High character density",
    difficulty:
      "The same page filled with 28 ledger lines of half-width type and no degradation, so the score isolates density rather than noise.",
    fields: RECEIPT_FIELDS,
    documents: 3,
  },
  {
    id: "nested-table",
    title: "Nested table",
    difficulty:
      "Three groups, each with its own item lines and subtotal, inside one ruled table; the required fields name the second group, so a flattened read fails them while still transcribing plausibly.",
    fields: NESTED_FIELDS,
    documents: 3,
  },
];

export const fieldsForClass = (
  classId: HardClassId,
): ReadonlyArray<FieldSpec> => {
  const spec = HARD_CLASSES.find((entry) => entry.id === classId);
  if (spec === undefined) {
    throw new Error(`Unknown hard class: ${classId}`);
  }
  return spec.fields;
};

export const buildHardDocument = (
  classId: HardClassId,
  index: number,
  version: string = HARD_CORPUS_VERSION,
): HardDocument => {
  const build = BUILDERS[classId];
  const rng = createRng(seedFor(version, classId, index));
  const { page, fields } = build(index, rng);
  const referenceText = referenceTextOf(page);
  assertRenderable(referenceText, `${classId}/${index}`);
  for (const [name, value] of Object.entries(fields)) {
    assertRenderable(value, `${classId}/${index} field ${name}`);
  }
  return {
    id: `${classId}-${String(index + 1).padStart(2, "0")}`,
    classId,
    page,
    referenceText,
    fields,
  };
};

export const buildHardCorpus = (
  version: string = HARD_CORPUS_VERSION,
): HardCorpus => ({
  version,
  widthPx: HARD_PAGE_WIDTH,
  heightPx: HARD_PAGE_HEIGHT,
  classes: HARD_CLASSES,
  documents: HARD_CLASSES.flatMap((spec) =>
    Array.from({ length: spec.documents }, (_, index) =>
      buildHardDocument(spec.id, index, version),
    ),
  ),
});

import type { JsonSchema, VisionImageInput } from "../../vendors/llm/types";

export type Provenance = "measured" | "fixtured" | "error" | "out-of-scope";

export type MetricStat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
}>;

export type FieldSpec = Readonly<{
  name: string;
  type: "string";
  normalization: string;
}>;

export type OcrDocument = Readonly<{
  id: string;
  license: string;
  referenceText: string;
  fields: Readonly<Record<string, string>>;
  render: Readonly<{
    title: string;
    lines: ReadonlyArray<string>;
  }>;
}>;

export type OcrDatasetManifest = Readonly<{
  dataset: Readonly<{
    id: string;
    name: string;
    manifestVersion: string;
    source: string;
    license: string;
    imageDistribution: string;
    realDatasetStatus: string;
  }>;
  normalization: Readonly<Record<string, string>>;
  preprocessing: Readonly<{
    mimeType: "image/png";
    resolution: Readonly<{
      widthPx: number;
      heightPx: number;
      dpi: number;
    }>;
    pageSplitting: string;
    rendering: string;
    languageScript: string;
    layoutDifficulty: string;
  }>;
  schema: Readonly<{
    description: string;
    fields: ReadonlyArray<FieldSpec>;
  }>;
  documents: ReadonlyArray<OcrDocument>;
}>;

export type OcrDataset = OcrDatasetManifest &
  Readonly<{
    structuredSchema: JsonSchema;
  }>;

export type RenderedOcrDocument = Readonly<{
  document: OcrDocument;
  image: VisionImageInput;
  sha256: string;
}>;

export type FieldScore = Readonly<{
  field: string;
  expected: string;
  actual: string | undefined;
  normalizedExpected: string;
  normalizedActual: string | undefined;
  correct: boolean;
}>;

export type StructuredFieldScore = Readonly<{
  accuracy: number;
  correct: number;
  total: number;
  fields: ReadonlyArray<FieldScore>;
}>;

export type DocumentOcrScore = Readonly<{
  documentId: string;
  characterErrorRate: number;
  wordErrorRate: number;
  fieldAccuracy: number;
  fieldScore: StructuredFieldScore;
}>;

export type OcrCallRecord = Readonly<{
  documentId: string;
  transcriptionPrompt: string;
  structuredPrompt: string;
  rawTranscription: string;
  rawStructured: string;
  outputTokens: number;
  elapsedMs: number;
  error: string | undefined;
}>;

export type OcrModelRun = Readonly<{
  id: string;
  modelName: string;
  provider: string;
  apiModelId: string;
  provenance: Provenance;
  measuredAt: string;
  trialsRequested: number;
  stats: Readonly<{
    characterErrorRate: MetricStat;
    wordErrorRate: MetricStat;
    fieldAccuracy: MetricStat;
  }>;
  documentScores: ReadonlyArray<DocumentOcrScore>;
  calls: ReadonlyArray<OcrCallRecord>;
  source: string;
  error?: string;
}>;

export type OcrComparisonResult = Readonly<{
  generatedAt: string;
  fixture: boolean;
  trials: number;
  dataset: OcrDataset;
  runs: ReadonlyArray<OcrModelRun>;
  artifactPath: string;
}>;

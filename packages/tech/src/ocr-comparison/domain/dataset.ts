import manifest from "./data/synthetic-document-ocr.manifest.json";
import type { JsonSchema } from "../../vendors/llm/types";
import type { FieldSpec, OcrDataset, OcrDatasetManifest } from "./types";

const pngMimeType = (value: string): "image/png" => {
  if (value !== "image/png") {
    throw new Error(`Unsupported OCR manifest MIME type: ${value}`);
  }
  return value;
};

const stringField = (field: {
  name: string;
  type: string;
  normalization: string;
}): FieldSpec => {
  if (field.type !== "string") {
    throw new Error(
      `Unsupported OCR field type for ${field.name}: ${field.type}`,
    );
  }
  return {
    name: field.name,
    type: field.type,
    normalization: field.normalization,
  };
};

const typedManifest = (): OcrDatasetManifest => ({
  ...manifest,
  preprocessing: {
    ...manifest.preprocessing,
    mimeType: pngMimeType(manifest.preprocessing.mimeType),
  },
  schema: {
    ...manifest.schema,
    fields: manifest.schema.fields.map(stringField),
  },
});

export const OCR_SYNTHETIC_MANIFEST = typedManifest();

export const ocrFieldSchema = (): JsonSchema => {
  const properties = Object.fromEntries(
    OCR_SYNTHETIC_MANIFEST.schema.fields.map((field) => [
      field.name,
      { type: field.type },
    ]),
  );
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: OCR_SYNTHETIC_MANIFEST.schema.fields.map((field) => field.name),
  };
};

export const loadOcrDataset = (): OcrDataset => ({
  ...OCR_SYNTHETIC_MANIFEST,
  structuredSchema: ocrFieldSchema(),
});

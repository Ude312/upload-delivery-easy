// lib/filename.ts
// Assembles the final filename from LLM-chosen fields.
// Sanitises each segment and joins them in the agreed format.

import type { LLMOutput } from "./llm";

/**
 * Sanitises a filename segment: uppercases, replaces spaces/special chars with hyphens,
 * and strips anything that isn't alphanumeric or a hyphen.
 */
function sanitiseSegment(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "")
    .replace(/-{2,}/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

/**
 * Builds the delivery note filename from structured LLM output.
 * Format: <DOCTYPE>_<SUPPLIER>_<CATEGORY>_<ORDER>_<DATE>.pdf
 * e.g.    LS_ifm_Sensor_45001199207_2024-03-15.pdf
 *
 * @param fields - Structured output from the LLM
 * @returns The assembled filename string
 */
export function buildFilename(fields: LLMOutput): string {
  const docType = sanitiseSegment(fields.documentType);
  const supplier = sanitiseSegment(fields.supplier);
  const category = sanitiseSegment(fields.productCategory);
  const order = fields.orderNumber; // keep as-is (numeric)
  const date = fields.date;

  return `${docType}_${supplier}_${category}_${order}_${date}.pdf`;
}

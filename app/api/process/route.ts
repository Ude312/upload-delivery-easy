// app/api/process/route.ts
// POST /api/process
// Accepts { ocrText: string }, runs the full pipeline, returns structured result.

import { retrieveCandidates } from "@/lib/retrieval";
import { extractFields } from "@/lib/llm";
import { buildFilename } from "@/lib/filename";
import { validateFilename } from "@/lib/validator";
import type { ProcessResponse } from "@/lib/types";

export type { ProcessResponse };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).ocrText !== "string" ||
    !(body as Record<string, unknown>).ocrText
  ) {
    return Response.json(
      { error: "Missing required field: ocrText (non-empty string)" },
      { status: 400 }
    );
  }

  const ocrText = ((body as Record<string, unknown>).ocrText as string).trim();

  try {
    // Step 1 — Retrieve candidates from local JSON files
    const candidates = await retrieveCandidates(ocrText);

    // Step 2 — LLM field extraction
    const fields = await extractFields(ocrText, candidates);

    // Step 3 — Build filename
    const filename = buildFilename(fields);

    // Step 4 — Validate filename format
    const validation = validateFilename(filename);

    const result: ProcessResponse = {
      filename,
      confidence: fields.confidence,
      fields: {
        documentType: fields.documentType,
        supplier: fields.supplier,
        productCategory: fields.productCategory,
        orderNumber: fields.orderNumber,
        date: fields.date,
      },
      warnings: fields.warnings,
      validationErrors: validation.errors,
    };

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

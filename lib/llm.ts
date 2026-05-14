// lib/llm.ts
// Sends extracted OCR text + retrieval candidates to OpenAI Chat Completions.
// The model is instructed to pick the best matching fields from the candidates
// and return strict JSON. The response is parsed and validated here.
// Uses OPENAI_API_KEY from environment — no other external services.

import OpenAI from "openai";
import type { RetrievalResult } from "./retrieval";

export interface LLMOutput {
  documentType: string;  // 2-3 letter code e.g. LS, RE, AB
  supplier: string;
  productCategory: string;
  orderNumber: string;   // KWS internal: 45XXXXXXX
  date: string;          // ISO format YYYY-MM-DD
  confidence: number;    // 0–1
  warnings: string[];
}

/** Document types that require a KWS order number (45XXXXXXX) */
const ORDER_NUMBER_REQUIRED_TYPES = new Set(["AB", "LS"]);
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local and restart the server."
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Builds the system prompt that instructs the model on output format.
 */
function buildSystemPrompt(): string {
  return `You are a document filing assistant for KWS SAAT SE, a German agricultural company.
Your job is to extract structured fields from delivery note or document text to generate a standardised filename.

IMPORTANT CONTEXT:
- KWS SAAT SE is the CUSTOMER, NOT the supplier. If "KWS" appears in the text, ignore it as a supplier candidate.
- The SUPPLIER is the company that sent the document (e.g. ifm, Siemens, Rittal, Festo, Sonepar, etc.)
- Use SHORT supplier abbreviations WITHOUT legal suffixes: "ifm" not "ifm electronic GmbH", "Siemens" not "Siemens AG"
- If the supplier is not in the candidate list, infer the short name from the text (drop GmbH, AG, SE, Co. KG, etc.)

DOCUMENT TYPE (first field in filename):
- Look for a 2-3 letter code at the very beginning of the document title or filename hint in the text
- Common codes: LS=Lieferschein, RE=Rechnung, AB=Auftragsbestätigung, DB=Datenblatt, MA=Montageanleitung, etc.
- If no code is visible, infer from document content (e.g. delivery note → LS, invoice → RE)

INTERNAL ORDER NUMBER (Bestellnummer):
- KWS internal order numbers ALWAYS start with "45" and are 8-11 digits long (e.g. 45001199207, 450020109)
- A Bestellnummer ONLY exists on: Lieferschein (LS) and Auftragsbestätigung (AB)
- For all other document types (AN, RE, DB, MA, etc.) there is NO order number — use "UNKNOWN"
- Look for patterns like "Bestell-Nr", "Bestellnummer", "PO", "Order No" followed by a number starting with 45
- If found, use it EXACTLY as printed
- If not found on LS or AB, use "UNKNOWN"

PRODUCT CATEGORY — this is the most important field to get right:
- PRIORITY 1: If the document contains exactly ONE article/product, use its article number or part number directly as the category (e.g. "EL1008", "6ES7214-1AG40-0XB0", "O5D100")
- PRIORITY 2: If there are MULTIPLE articles, choose the BEST matching category name from the provided candidate list based on the product descriptions
- PRIORITY 3: If no candidate matches and no article number is visible, use the most descriptive product keyword from the text
- NEVER return "UNKNOWN" for productCategory — always use something from the text
- Do NOT use generic words like "Artikel", "Produkt", "Item" as the category

CONFIDENCE:
- 1.0 only if document type, supplier, order number AND date are all clearly present
- 0.5–0.8 if some fields had to be inferred
- below 0.5 if critical fields are missing

Add a warning for EVERY field that was guessed or not explicitly in the text.

You MUST respond with ONLY valid JSON — no markdown, no explanation:
{
  "documentType": "LS",
  "supplier": "string (short name, no GmbH/AG/SE)",
  "productCategory": "string (from candidates or article number)",
  "orderNumber": "string (45XXXXXXX or UNKNOWN)",
  "date": "YYYY-MM-DD",
  "confidence": 0.0,
  "warnings": ["string"]
}`;
}

/**
 * Builds the user prompt with OCR text and retrieval candidates.
 */
function buildUserPrompt(ocrText: string, candidates: RetrievalResult): string {
  const supplierList = candidates.suppliers
    .map((s) => `  - "${s.name}" (aliases: ${s.aliases.join(", ")})`)
    .join("\n");

  const categoryList = candidates.productCategories.length > 0
    ? candidates.productCategories
        .map((c) => `  - "${c.name}" (keywords: ${c.keywords.join(", ")})`)
        .join("\n")
    : "  (no keyword matches found in text)";

  // Article numbers extracted directly from OCR text
  const articleNumberHint = candidates.articleNumbers.length > 0
    ? `\n## Article/Part Numbers found in text\n${candidates.articleNumbers.map((a) => `  - ${a}`).join("\n")}\n(Use one of these directly as productCategory if there is only one main article)`
    : "";

  const orderList = candidates.orders
    .map((o) => `  - "${o.orderNumber}" — ${o.description}`)
    .join("\n");

  // Load document types for the prompt
  let docTypeList = "";
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const docTypes = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "document_types.json"), "utf-8")
    ) as Array<{ code: string; name: string }>;
    docTypeList = docTypes.map((d) => `  ${d.code} = ${d.name}`).join("\n");
  } catch {
    docTypeList = "  LS = Lieferschein\n  RE = Rechnung\n  AB = Auftragsbestätigung\n  DB = Datenblatt";
  }

  return `## OCR Text from Document
${ocrText.trim()}

## Known Document Type Codes
${docTypeList}

## Candidate Suppliers (KWS is the CUSTOMER — do NOT use KWS as supplier)
${supplierList || "  (none retrieved — infer short name from text, drop GmbH/AG/SE)"}

## Candidate Product Categories (from keyword matching)
${categoryList}
${articleNumberHint}

## Note on Order Number
Look for a number starting with 45 (8-11 digits). Examples: 45001199207, 450020109.
Labels to look for: Bestell-Nr, Bestellnummer, PO-Nr, Order No, Ihre Bestellung.

Now extract the fields and return strict JSON only.`;
}

/**
 * Validates and coerces the raw parsed JSON into a safe LLMOutput.
 * Fills in defaults for any missing or malformed fields.
 */
function parseLLMResponse(raw: unknown): LLMOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("LLM response is not a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  const documentType =
    typeof obj.documentType === "string" && obj.documentType.trim()
      ? obj.documentType.trim().toUpperCase()
      : "XX";

  const supplier =
    typeof obj.supplier === "string" && obj.supplier.trim() ? obj.supplier.trim() : "UNKNOWN";
  const productCategory =
    typeof obj.productCategory === "string" && obj.productCategory.trim()
      ? obj.productCategory.trim()
      : "UNKNOWN";

  // Order number must start with 45 and be 8-11 digits — enforce in code
  const orderRaw =
    typeof obj.orderNumber === "string" ? obj.orderNumber.trim() : "";
  const orderNumber = /^45\d{6,9}$/.test(orderRaw) ? orderRaw : "UNKNOWN";

  // Validate date format YYYY-MM-DD
  const dateRaw = typeof obj.date === "string" ? obj.date.trim() : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : "1970-01-01";

  const confidence =
    typeof obj.confidence === "number"
      ? Math.min(1, Math.max(0, obj.confidence))
      : 0;

  const warnings: string[] = Array.isArray(obj.warnings)
    ? obj.warnings.filter((w): w is string => typeof w === "string")
    : [];

  // Code-level safety net
  if (date === "1970-01-01" && dateRaw !== "1970-01-01") {
    warnings.push(`Date "${dateRaw}" could not be parsed — defaulted to 1970-01-01`);
  }
  if (documentType === "XX") {
    warnings.push("Document type could not be determined");
  }
  if (supplier === "UNKNOWN") {
    warnings.push("Supplier could not be determined from the document");
  }
  if (productCategory === "UNKNOWN") {
    warnings.push("Product category could not be determined");
  }
  if (orderNumber === "UNKNOWN") {
    // Try to extract 45XXXXXXX directly from the raw LLM value as fallback
    // Also try stripping trailing non-digit chars (e.g. "4500188302-4527282676" → "4500188302")
    const cleanRaw = orderRaw.replace(/\s/g, "");
    const match = cleanRaw.match(/45\d{6,9}/);
    if (match) {
      return { documentType, supplier, productCategory, orderNumber: match[0], date, confidence, warnings };
    }
    // Only warn if this document type actually requires an order number
    if (ORDER_NUMBER_REQUIRED_TYPES.has(documentType)) {
      warnings.push("KWS order number (45XXXXXXX) not found — required for AB/LS documents");
    }
  }

  return { documentType, supplier, productCategory, orderNumber, date, confidence, warnings };
}

/**
 * Cross-checks LLM output against the original OCR text.
 * If a chosen field value (or its tokens) does not appear anywhere in the OCR
 * text, we add a warning — the LLM guessed it from candidates, not from evidence.
 */
function auditFieldsAgainstOcr(output: LLMOutput, ocrText: string, articleNumbers: string[]): LLMOutput {
  const ocr = ocrText.toLowerCase();
  const warnings = [...output.warnings];

  // KWS protection: if LLM picked KWS as supplier, override it
  if (output.supplier.toLowerCase().includes("kws")) {
    warnings.push('KWS SAAT SE is the customer, not the supplier — supplier field cleared');
    return { ...output, supplier: "UNKNOWN", warnings };
  }

  // Check order number: only relevant for AB and LS
  if (ORDER_NUMBER_REQUIRED_TYPES.has(output.documentType)) {
    const orderInOcr = /45\d{6,9}/.test(ocrText.replace(/\s/g, ""));

    // If order number was found in OCR but LLM missed it, extract it
  // Use word-boundary aware regex to handle numbers followed by / or other chars
  if (output.orderNumber === "UNKNOWN") {
    const cleanOcr = ocrText.replace(/\s/g, "");
    const match = cleanOcr.match(/45\d{6,9}/);
    if (match) {
      const idx = warnings.findIndex((w) => w.includes("order number") || w.includes("Bestell"));
      if (idx !== -1) warnings.splice(idx, 1);
      return { ...output, orderNumber: match[0], warnings };
    }
  }

    if (
      output.orderNumber === "UNKNOWN" &&
      !orderInOcr &&
      !warnings.some((w) => w.toLowerCase().includes("order") || w.toLowerCase().includes("bestell"))
    ) {
      warnings.push(`KWS order number (45XXXXXXX) not found — required for ${output.documentType}`);
    }
  }
  // For all other document types: silently accept UNKNOWN order number

  // Category fallback: if still UNKNOWN, use first article number from OCR
  if (output.productCategory === "UNKNOWN") {
    if (articleNumbers.length > 0) {
      const filtered = warnings.filter(
        (w) => !w.toLowerCase().includes("categor") && !w.toLowerCase().includes("kategor")
      );
      return { ...output, productCategory: articleNumbers[0], warnings: filtered };
    }
    // Try product description label
    const productMatch = ocrText.match(
      /(?:Artikel|Produkt|Bezeichnung|Description|Item|Pos\.?\s*\d+)[:\s]+([A-Za-z0-9][A-Za-z0-9\-\s]{2,30})/i
    );
    if (productMatch) {
      const fallback = productMatch[1].trim().split(/\s+/).slice(0, 3).join("-");
      const filtered = warnings.filter(
        (w) => !w.toLowerCase().includes("categor") && !w.toLowerCase().includes("kategor")
      );
      return { ...output, productCategory: fallback, warnings: filtered };
    }
    // Last resort for invoices/receipts: use document number
    const docNumMatch = ocrText.match(/(?:Rechnung|Lieferschein|Angebot)[^\d]*(\d{5,12})/i);
    if (docNumMatch) {
      const filtered = warnings.filter(
        (w) => !w.toLowerCase().includes("categor") && !w.toLowerCase().includes("kategor")
      );
      return { ...output, productCategory: docNumMatch[1], warnings: filtered };
    }
  }

  // Check product category: none of its words appear in the OCR
  const categoryTokens = output.productCategory
    .toLowerCase()
    .split(/[\s\-\/]+/)
    .filter((t) => t.length > 2);
  const categoryFoundInOcr = categoryTokens.some((t) => ocr.includes(t));
  if (
    output.productCategory !== "UNKNOWN" &&
    !categoryFoundInOcr &&
    !warnings.some((w) => w.toLowerCase().includes("categor") || w.toLowerCase().includes("kategor"))
  ) {
    warnings.push(
      `Category "${output.productCategory}" not mentioned in text — inferred from candidates`
    );
  }

  return { ...output, warnings };
}

/**
 * Sends OCR text + retrieval candidates to OpenAI and returns structured fields.
 *
 * @param ocrText - Raw text from the delivery note
 * @param candidates - Retrieved candidates from local data files
 * @returns Structured LLMOutput with chosen fields and confidence
 */
export async function extractFields(
  ocrText: string,
  candidates: RetrievalResult
): Promise<LLMOutput> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,           // deterministic output
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(ocrText, candidates) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`OpenAI response is not valid JSON: ${content}`);
  }

  const output = parseLLMResponse(parsed);
  return auditFieldsAgainstOcr(output, ocrText, candidates.articleNumbers);
}

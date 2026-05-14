// lib/retrieval.ts
// Retrieves candidate matches from local JSON data files.
// Strategy: tokenise the OCR text, then score each entry by how many of its
// name/alias/keyword tokens appear in the OCR text. Returns the top-N matches
// for each category so the LLM has grounded options to choose from.

import path from "path";
import fs from "fs";

export interface Supplier {
  id: string;
  name: string;
  aliases: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  keywords: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  supplier: string;
  description: string;
}

export interface RetrievalResult {
  suppliers: Supplier[];
  productCategories: ProductCategory[];
  orders: Order[];
  /** Article numbers found directly in the OCR text (e.g. "EL1008", "6ES7214-1AG40-0XB0") */
  articleNumbers: string[];
  /** Best-scoring category name, or null if score was 0 */
  topCategoryScore: number;
}

/** Normalise a string to lowercase tokens for matching. */
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s,.\-\/\\:;()]+/)
      .filter((t) => t.length > 1)
  );
}

/** Score how many tokens from `terms` appear in `ocrTokens`. */
function score(ocrTokens: Set<string>, terms: string[]): number {
  let hits = 0;
  for (const term of terms) {
    const termTokens = tokenise(term);
    for (const t of termTokens) {
      if (ocrTokens.has(t)) hits++;
    }
  }
  return hits;
}

function loadJson<T>(filename: string): T {
  const filePath = path.join(process.cwd(), "data", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

/**
 * Extracts article/part numbers from OCR text.
 * Looks for patterns like: alphanumeric codes with hyphens/dots,
 * e.g. "EL1008", "6ES7214-1AG40-0XB0", "IFM-O5D100", "0441641"
 * Returns up to 3 candidates, longest first.
 */
function extractArticleNumbers(text: string): string[] {
  // Match codes that look like part numbers:
  // - at least 4 chars
  // - mix of letters+digits, optionally with hyphens/dots
  // - NOT pure words (must contain at least one digit)
  const matches = text.match(/\b[A-Z0-9][A-Z0-9\-\.]{3,24}\b/g) ?? [];
  return matches
    .filter((m) => /\d/.test(m) && /[A-Z]/.test(m)) // must have both letters and digits
    .filter((m) => !/^\d{4}-\d{2}-\d{2}$/.test(m))  // exclude dates
    .filter((m) => !/^45\d{6,9}$/.test(m))           // exclude KWS order numbers
    .slice(0, 3);
}

/**
 * Keyword-based retrieval against local JSON files.
 * Returns up to 3 best-matching candidates per category,
 * plus article numbers extracted directly from the OCR text.
 *
 * @param ocrText - Raw text extracted from the delivery note
 * @returns Ranked candidates for supplier, product category, and order
 */
export async function retrieveCandidates(ocrText: string): Promise<RetrievalResult> {
  const ocrTokens = tokenise(ocrText);

  // --- Suppliers ---
  const allSuppliers = loadJson<Supplier[]>("suppliers.json");
  const scoredSuppliers = allSuppliers
    .map((s) => ({
      entry: s,
      score: score(ocrTokens, [s.name, ...s.aliases]),
    }))
    .sort((a, b) => b.score - a.score);

  const suppliers =
    scoredSuppliers.filter((s) => s.score > 0).length > 0
      ? scoredSuppliers.filter((s) => s.score > 0).slice(0, 3).map((s) => s.entry)
      : scoredSuppliers.slice(0, 3).map((s) => s.entry);

  // --- Product Categories ---
  const allCategories = loadJson<ProductCategory[]>("product_categories.json");
  const scoredCategories = allCategories
    .map((c) => ({
      entry: c,
      score: score(ocrTokens, [c.name, ...c.keywords]),
    }))
    .sort((a, b) => b.score - a.score);

  const topCategoryScore = scoredCategories[0]?.score ?? 0;

  // Only pass categories that actually scored > 0
  const productCategories =
    scoredCategories.filter((c) => c.score > 0).slice(0, 3).map((c) => c.entry);

  // --- Orders ---
  const allOrders = loadJson<Order[]>("orders.json");
  const scoredOrders = allOrders
    .map((o) => ({
      entry: o,
      score: score(ocrTokens, [o.orderNumber, o.description]),
    }))
    .sort((a, b) => b.score - a.score);

  const orders =
    scoredOrders.filter((o) => o.score > 0).length > 0
      ? scoredOrders.filter((o) => o.score > 0).slice(0, 3).map((o) => o.entry)
      : scoredOrders.slice(0, 3).map((o) => o.entry);

  // --- Article numbers directly from OCR text ---
  const articleNumbers = extractArticleNumbers(ocrText.toUpperCase());

  return { suppliers, productCategories, orders, articleNumbers, topCategoryScore };
}

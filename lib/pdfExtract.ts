// lib/pdfExtract.ts
// Client-side PDF text extraction using pdfjs-dist.
// Runs entirely in the browser — no server, no cloud OCR API.

import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Extracts all text from a PDF File object.
 * Loads pdfjs-dist dynamically to avoid SSR issues.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamic import — pdfjs-dist is browser-only
  const pdfjsLib = await import("pdfjs-dist");

  // Point the worker at the bundled worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf: PDFDocumentProxy = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n");
}

/**
 * Returns true if the file is a supported type (PDF or plain text).
 */
export function isSupportedFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.name.endsWith(".pdf") ||
    file.name.endsWith(".txt")
  );
}

/**
 * Extracts text from a supported file (PDF or .txt).
 */
export async function extractText(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return await file.text();
  }
  return await extractTextFromPdf(file);
}

// Temporary script to extract text from Test_Data PDFs
// Usage: node eval/extract_test_data.mjs

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

// For Node.js: use the worker file directly
const workerPath = new URL(
  "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

async function extractText(filePath) {
  const data = new Uint8Array(readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  let text = "";
  for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return text.trim();
}

const files = readdirSync(path.join(root, "Test_Data"))
  .filter((f) => f.endsWith(".pdf"))
  .sort();

for (const f of files) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`FILE: ${f}`);
  console.log("=".repeat(60));
  try {
    const text = await extractText(path.join(root, "Test_Data", f));
    console.log(text.slice(0, 800) || "(no text extracted — might be scanned image)");
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}

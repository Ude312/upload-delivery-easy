// eval/eval.js
// Evaluation script — runs all test cases through the full pipeline and
// reports pass/fail for each one.
//
// Usage:  node --import tsx/esm eval/eval.js
//   or:   npx tsx eval/eval.js
//
// Requires OPENAI_API_KEY in .env.local (loaded automatically via dotenv).

// Load .env.local so OPENAI_API_KEY is available
import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Minimal .env.local parser (no extra dependency needed)
function loadEnvLocal() {
  try {
    const envPath = path.join(root, ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — OPENAI_API_KEY must be set in the environment
  }
}

loadEnvLocal();

// Dynamic imports after env is loaded
const { retrieveCandidates } = await import("../lib/retrieval.ts");
const { extractFields } = await import("../lib/llm.ts");
const { buildFilename } = await import("../lib/filename.ts");
const { validateFilename } = await import("../lib/validator.ts");

const req = createRequire(import.meta.url);
const testCases = req("./test_cases.json");

async function runEval() {
  console.log("=== Upload Delivery Easy — Pipeline Evaluation ===\n");
  console.log(`Running ${testCases.length} test case(s)...\n`);

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`[${tc.id}] ${tc.description}`);
    console.log(`  OCR text: "${tc.ocrText.replace(/\n/g, " | ")}"`);

    try {
      // Step 1 — Retrieve candidates from local JSON files
      const candidates = await retrieveCandidates(tc.ocrText);
      console.log(
        `  Retrieved: ${candidates.suppliers.length} supplier(s), ` +
        `${candidates.productCategories.length} categor(y/ies), ` +
        `${candidates.orders.length} order(s)`
      );

      // Step 2 — LLM field extraction
      const fields = await extractFields(tc.ocrText, candidates);
      console.log(`  LLM output:`);
      console.log(`    supplier        : ${fields.supplier}`);
      console.log(`    productCategory : ${fields.productCategory}`);
      console.log(`    orderNumber     : ${fields.orderNumber}`);
      console.log(`    date            : ${fields.date}`);
      console.log(`    confidence      : ${fields.confidence}`);
      if (fields.warnings.length > 0) {
        console.log(`    warnings        : ${fields.warnings.join("; ")}`);
      }

      // Step 3 — Build filename
      const filename = buildFilename(fields);
      console.log(`  Filename: ${filename}`);

      // Step 4 — Validate filename format
      const validation = validateFilename(filename);
      if (!validation.valid) {
        console.log(`  ⚠️  Validation errors: ${validation.errors.join(", ")}`);
      }

      // Step 5 — Check against expected values
      const confidenceOk = fields.confidence >= (tc.expectedConfidenceMin ?? 0);
      const filenameOk =
        tc.expectedFilename === null || filename === tc.expectedFilename;
      const warningsOk = tc.expectWarnings ? fields.warnings.length > 0 : true;

      if (confidenceOk && filenameOk && warningsOk && validation.valid) {
        console.log(`  ✅ PASS`);
        passed++;
      } else {
        console.log(`  ❌ FAIL`);
        if (!filenameOk)
          console.log(`     filename: expected "${tc.expectedFilename}", got "${filename}"`);
        if (!confidenceOk)
          console.log(`     confidence: expected >= ${tc.expectedConfidenceMin}, got ${fields.confidence}`);
        if (!warningsOk)
          console.log(`     expected warnings but got none`);
        if (!validation.valid)
          console.log(`     filename format invalid`);
        failed++;
      }
    } catch (err) {
      console.log(`  💥 ERROR: ${err.message}`);
      failed++;
    }

    console.log();
  }

  console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} total.`);
  process.exit(failed > 0 ? 1 : 0);
}

runEval();

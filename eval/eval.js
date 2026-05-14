// eval/eval.js
// Evaluation script — runs all test cases through the full pipeline.
// Usage: npm run eval
// Requires OPENAI_API_KEY in .env.local

import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Load .env.local
function loadEnvLocal() {
  try {
    const lines = readFileSync(path.join(root, ".env.local"), "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch { /* .env.local not found */ }
}
loadEnvLocal();

const { retrieveCandidates } = await import("../lib/retrieval.ts");
const { extractFields }      = await import("../lib/llm.ts");
const { buildFilename }      = await import("../lib/filename.ts");
const { validateFilename }   = await import("../lib/validator.ts");

const req = createRequire(import.meta.url);
const testCases = req("./test_cases.json");

// Metric: a test passes if ALL of the following hold:
//   1. filename matches expectedFilenamePattern (regex)
//   2. confidence >= expectedConfidenceMin
//   3. expectWarnings: warnings.length > 0 (or false → don't care)
//   4. expectNoOrderWarning: no warning mentioning "order" or "Bestell"
//   5. kwsMustNotBeSupplier: supplier !== "KWS" variant
//   6. filename passes format validation

async function runEval() {
  console.log("=== Upload Delivery Easy — Evaluation ===\n");
  console.log(`Running ${testCases.length} test case(s)...\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const tc of testCases) {
    console.log(`[${tc.id}] ${tc.description}`);

    try {
      const candidates = await retrieveCandidates(tc.ocrText);
      const fields     = await extractFields(tc.ocrText, candidates);
      const filename   = buildFilename(fields);
      const validation = validateFilename(filename);

      console.log(`  → ${filename}  (confidence: ${fields.confidence})`);
      if (fields.warnings.length > 0) {
        console.log(`  ⚠ ${fields.warnings.join(" | ")}`);
      }

      const checks = {
        filenamePattern: tc.expectedFilenamePattern
          ? new RegExp(tc.expectedFilenamePattern).test(filename)
          : true,
        confidence: fields.confidence >= (tc.expectedConfidenceMin ?? 0),
        warningsPresent: tc.expectWarnings ? fields.warnings.length > 0 : true,
        noOrderWarning: tc.expectNoOrderWarning
          ? !fields.warnings.some(w => /order|bestell/i.test(w))
          : true,
        kwsNotSupplier: tc.kwsMustNotBeSupplier
          ? !/kws/i.test(fields.supplier)
          : true,
        validFormat: validation.valid,
      };

      const allPassed = Object.values(checks).every(Boolean);

      if (allPassed) {
        console.log(`  ✅ PASS`);
        passed++;
      } else {
        console.log(`  ❌ FAIL`);
        for (const [check, ok] of Object.entries(checks)) {
          if (!ok) console.log(`     ✗ ${check}`);
        }
        failed++;
      }

      results.push({ id: tc.id, filename, confidence: fields.confidence,
                     warnings: fields.warnings, pass: allPassed });

    } catch (err) {
      console.log(`  💥 ERROR: ${err.message}`);
      failed++;
      results.push({ id: tc.id, pass: false, error: err.message });
    }
    console.log();
  }

  const total = testCases.length;
  const score = (passed / total * 100).toFixed(0);
  console.log(`Results: ${passed}/${total} passed  (${score}%)`);
  process.exit(failed > 0 ? 1 : 0);
}

runEval();

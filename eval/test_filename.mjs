// Quick smoke test for lib/filename.ts and lib/validator.ts logic
// Run with: node eval/test_filename.mjs
//
// Uses plain JS (no TypeScript compilation needed) to mirror the same logic.

// --- Replicate sanitiseSegment from lib/filename.ts ---
function sanitiseSegment(value) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFilename(fields) {
  const supplier = sanitiseSegment(fields.supplier);
  const category = sanitiseSegment(fields.productCategory);
  const order = sanitiseSegment(fields.orderNumber);
  const date = fields.date;
  return `${supplier}_${category}_${order}_${date}.pdf`;
}

// --- Replicate validateFilename from lib/validator.ts ---
const FILENAME_REGEX = /^[A-Z0-9\-]+_[A-Z0-9\-]+_[A-Z0-9\-]+_\d{4}-\d{2}-\d{2}\.pdf$/;

function validateFilename(filename) {
  const errors = [];
  if (!FILENAME_REGEX.test(filename)) {
    errors.push(`"${filename}" does not match expected format`);
  }
  return { valid: errors.length === 0, errors };
}

// --- Test cases ---
const cases = [
  {
    label: "Happy path — all fields clean",
    fields: { supplier: "Acme Corp", productCategory: "Electronics", orderNumber: "ORD-2024-001", date: "2024-03-15" },
    expectValid: true,
  },
  {
    label: "Supplier with alias / spaces",
    fields: { supplier: "Global Parts Ltd", productCategory: "Mechanical Parts", orderNumber: "ORD-2024-002", date: "2024-03-01" },
    expectValid: true,
  },
  {
    label: "Special characters in supplier name",
    fields: { supplier: "Tech & Supply GmbH!", productCategory: "Raw Materials", orderNumber: "ORD-2024-003", date: "2024-04-10" },
    expectValid: true,
  },
  {
    label: "Missing date — should fail validation",
    fields: { supplier: "Acme Corp", productCategory: "Electronics", orderNumber: "ORD-2024-001", date: "unknown" },
    expectValid: false,
  },
  {
    label: "Empty supplier — should fail validation",
    fields: { supplier: "", productCategory: "Electronics", orderNumber: "ORD-2024-001", date: "2024-03-15" },
    expectValid: false,
  },
];

let passed = 0;
let failed = 0;

console.log("=== Filename Builder + Validator Smoke Test ===\n");

for (const tc of cases) {
  const filename = buildFilename(tc.fields);
  const result = validateFilename(filename);
  const ok = result.valid === tc.expectValid;

  console.log(`[${ok ? "✅ PASS" : "❌ FAIL"}] ${tc.label}`);
  console.log(`         filename : ${filename}`);
  console.log(`         valid    : ${result.valid} (expected: ${tc.expectValid})`);
  if (result.errors.length > 0) {
    console.log(`         errors   : ${result.errors.join(", ")}`);
  }
  console.log();

  ok ? passed++ : failed++;
}

console.log(`Results: ${passed} passed, ${failed} failed out of ${cases.length} total.`);
process.exit(failed > 0 ? 1 : 0);

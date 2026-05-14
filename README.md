# Upload Delivery Easy

An AI-powered web app that generates standardised filenames for scanned delivery documents. It uses a RAG-style pipeline: local JSON retrieval + OpenAI gpt-4o-mini to extract supplier, document type, product category, and KWS internal order number from OCR text.

## What it does

1. User **drops PDF or .txt files** directly into the drop zone (multiple files at once supported)
2. App extracts text client-side from PDFs using `pdfjs-dist` — no cloud OCR
3. App retrieves matching supplier and category candidates from local JSON files
4. App sends OCR text + candidates to OpenAI
5. LLM returns structured JSON (document type, supplier, category, order number, date, confidence, warnings)
6. App validates the filename format with a regex
7. UI shows each file's filename, confidence bar, detected fields, warnings, and a copy button

Manual text paste is also supported as a fallback.

**Output format:** `DOCTYPE_Supplier_Category_OrderNumber_YYYY-MM-DD.pdf`
**Example:** `LS_ifm_Sensor_45001199207_2024-05-12.pdf`

## Requirements

- Node.js 20+
- An OpenAI API key

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ude312/upload-delivery-easy.git
cd upload-delivery-easy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and add your OpenAI API key:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace `sk-...` with your actual key:

```
OPENAI_API_KEY=sk-proj-your-key-here
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

Paste the OCR text from a scanned document into the textarea and click **Generate Filename**.

**Example input:**
```
Lieferschein
ifm electronic GmbH
Bestell-Nr: 45001199207
Datum: 12.05.2024
Artikel: Induktiver Sensor M12
Empfänger: KWS SAAT SE
```

**Expected output:** `LS_ifm_Sensor_45001199207_2024-05-12.pdf`

**Example input (Angebot — no order number expected):**
```
Angebot
Siemens AG
Datum: 10.05.2024
Artikel: SIMATIC S7-1200 CPU 1214C
```

**Expected output:** `AN_Siemens_Steuerung_UNKNOWN_2024-05-10.pdf`

## Running the evaluation

```bash
npm run eval
```

This runs all test cases in `eval/test_cases.json` through the full pipeline and reports pass/fail for each one. Requires `OPENAI_API_KEY` in `.env.local`.

## Project structure

```
app/
  api/process/route.ts   — POST endpoint, wires the pipeline
  page.tsx               — Main page
  layout.tsx             — App layout
components/
  UploadForm.tsx         — UI: form, result card, copy button
lib/
  retrieval.ts           — Keyword scoring against local JSON files
  llm.ts                 — OpenAI call, prompt, response parsing, audit layer
  filename.ts            — Filename assembly and sanitisation
  validator.ts           — Regex validation of filename format
  types.ts               — Shared TypeScript types
data/
  suppliers.json         — Known suppliers with aliases
  product_categories.json — Categories with keywords
  orders.json            — Sample internal orders
  document_types.json    — Document type codes (LS, RE, AB, ...)
eval/
  eval.js                — Evaluation script
  test_cases.json        — ≥10 labeled test cases
```

## Notes

- No Pinecone, Supabase, or hosted vector DB — all retrieval is local JSON
- No cloud OCR — user pastes text directly (MVP approach)
- Only `OPENAI_API_KEY` is required
- KWS SAAT SE is the customer, never the supplier
- Order numbers (45XXXXXXX) are only expected on LS and AB documents

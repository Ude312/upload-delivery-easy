# Upload Delivery Easy

An AI-powered web app that automatically generates standardised filenames for scanned delivery documents. Built for CPSC 254 — California State University, Fullerton.

## What it does

Companies receive dozens of delivery notes, invoices, and technical documents every week and must file them manually. This app automates the naming process.

**How it works:**
1. Drop a PDF (or paste text) into the app
2. The app extracts text from the PDF in your browser — no cloud OCR needed
3. It searches local supplier and category databases for matching candidates (RAG)
4. It sends the text + candidates to OpenAI GPT-4o-mini
5. The LLM picks the best fields and returns structured JSON
6. The app validates the filename format with a regex
7. You get a ready-to-copy filename with confidence score, detected fields, and warnings

**Output format:** `DOCTYPE_Supplier_Category_OrderNumber_YYYY-MM-DD.pdf`

**Example:** `LS_ifm_Sensor_4500191001_2025-10-15.pdf`

### Document Type Codes (German abbreviations explained)

| Code | German | English |
|------|--------|---------|
| LS | Lieferschein | Delivery Note |
| AB | Auftragsbestätigung | Order Confirmation |
| AN | Angebot | Quote / Offer |
| RE | Rechnung | Invoice |
| DB | Datenblatt | Data Sheet |
| MA | Montageanleitung | Installation Manual |
| CE | Konformitätserklärung | Declaration of Conformity |
| WA | Wartungsanleitung | Maintenance Manual |
| TB | Technische Beschreibung | Technical Description |
| SL | Stückliste | Bill of Materials |

> **Note on order numbers:** KWS internal order numbers always start with `45` and are 8–11 digits long (e.g. `4500191001`). They only appear on delivery notes (LS) and order confirmations (AB) — not on quotes or invoices.

---

## Requirements

- **Node.js 20 or higher** — check with `node --version`
- **An OpenAI API key** — get one at [platform.openai.com](https://platform.openai.com)
- **Git**

---

## Setup (step by step)

### 1. Clone the repository

```bash
git clone https://github.com/Ude312/upload-delivery-easy.git
cd upload-delivery-easy
```

### 2. Install dependencies

```bash
npm install
```

This installs Next.js, OpenAI SDK, pdfjs-dist, and all other dependencies. Takes about 30–60 seconds.

### 3. Set up your API key

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` in any text editor and replace `sk-...` with your actual OpenAI API key:

```
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

> **Important:** Never commit `.env.local` to Git. It is already in `.gitignore`.

### 4. Start the development server

```bash
npm run dev
```

Wait for this output:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
✓ Ready
```

Then open **http://localhost:3000** in your browser.

---

## Using the app

### Option A — Drop a PDF file

Drag and drop any PDF from the `Fake_Test_Data/` folder onto the drop zone. Multiple files at once are supported.

### Option B — Paste text manually

Paste OCR text into the textarea at the bottom and click **Generate Filename**.

**Example text to paste:**
```
Lieferschein
ifm electronic gmbh
Bestell-Nr: 4500191001
Datum: 15.10.2025
Artikel: Abstandssensor O5D100
```

**Expected output:** `LS_ifm_O5D100_4500191001_2025-10-15.pdf`

---

## Test files

The `Fake_Test_Data/` folder contains 10 realistic but fictional test PDFs:

| File | Document Type | Supplier | Has Order Number |
|------|--------------|----------|-----------------|
| Test01.pdf | Delivery Note (LS) | ifm | Yes — 4500191001 |
| Test02.pdf | Delivery Note (LS) | Festo | Yes — 4500192002 |
| Test03.pdf | Order Confirmation (AB) | Siemens | Yes — 4500193003 |
| Test04.pdf | Invoice (RE) | Rittal | Yes — 4500194004 |
| Test05.pdf | Quote (AN) | Phoenix Contact | No (not expected) |
| Test06.pdf | Data Sheet (DB) | Beckhoff | No (not expected) |
| Test07.pdf | Invoice (RE) | WAGO | Yes — 4500195007 |
| Test08.pdf | Delivery Note (LS) | Murr | Yes — 4500196008 |
| Test09.pdf | Declaration of Conformity (CE) | Pilz | No (not expected) |
| Test10.pdf | Quote (AN) | Offgridtec | No (not expected) |

---

## Running the evaluation

```bash
npm run eval
```

This runs all 10 labeled test cases in `eval/test_cases.json` through the full pipeline and reports pass/fail. Requires `OPENAI_API_KEY` in `.env.local`.

---

## Project structure

```
app/
  api/process/route.ts    POST endpoint — wires the full pipeline
  page.tsx                Main page
  layout.tsx              App layout
components/
  UploadForm.tsx          UI: drag & drop, result cards, copy button
lib/
  retrieval.ts            Keyword scoring against local JSON files (RAG)
  llm.ts                  OpenAI call, prompt engineering, response parsing
  filename.ts             Filename assembly and sanitisation
  validator.ts            Regex validation of filename format
  pdfExtract.ts           Client-side PDF text extraction (pdfjs-dist)
  types.ts                Shared TypeScript types
data/
  suppliers.json          Known suppliers with aliases
  product_categories.json Categories with keywords
  orders.json             Sample internal orders
  document_types.json     Document type codes (LS, RE, AB, ...)
eval/
  eval.js                 Evaluation script
  test_cases.json         10 labeled test cases
  generate_fake_pdfs.mjs  Script that generated the test PDFs
Fake_Test_Data/
  Test01.pdf – Test10.pdf 10 fictional test documents
```

---

## Constraints

- Only `OPENAI_API_KEY` is required — no Pinecone, Supabase, or other services
- All retrieval is local JSON — no hosted vector database
- PDF text extraction runs in the browser — no cloud OCR API
- Runs locally with Node 20+

---

## Troubleshooting

**"OPENAI_API_KEY is not set"** — Make sure `.env.local` exists and contains your key. Restart `npm run dev` after editing it.

**App shows blank page or 500 error** — Stop the server (`Ctrl+C`), delete the `.next` folder, and restart:
```bash
rm -rf .next
npm run dev
```

**"No text could be extracted from this file"** — The PDF is a scanned image without embedded text. Paste the text manually instead.

**Port 3000 already in use** — Run on a different port:
```bash
npm run dev -- -p 3001
```

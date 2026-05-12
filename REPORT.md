# Upload Delivery Easy — Project Report

## Overview

Upload Delivery Easy is a Next.js application that automates the naming of scanned delivery notes using a multi-step RAG-style pipeline. It goes beyond a simple OCR-to-filename call by combining local retrieval with LLM-based field selection.

---

## Pipeline

```
User input (image upload or pasted OCR text)
        │
        ▼
1. Text extraction
   └─ MVP: user pastes OCR text directly
   └─ Future: client-side or server-side OCR
        │
        ▼
2. Local retrieval  (lib/retrieval.ts)
   └─ Keyword search against:
        • data/suppliers.json
        • data/product_categories.json
        • data/orders.json
   └─ Returns ranked candidate lists
        │
        ▼
3. LLM field selection  (lib/llm.ts)
   └─ Sends OCR text + candidates to OpenAI Chat Completions
   └─ Prompt instructs model to return strict JSON:
        { supplier, productCategory, orderNumber, date, confidence, warnings }
        │
        ▼
4. Filename assembly  (lib/filename.ts)
   └─ Sanitises and joins fields:
        SUPPLIER_CATEGORY_ORDER_YYYY-MM-DD.pdf
        │
        ▼
5. Validation  (lib/validator.ts)
   └─ Regex check on assembled filename
   └─ Returns valid flag + error list
        │
        ▼
6. UI result  (components/UploadForm.tsx)
   └─ Shows: filename, confidence, detected fields, warnings, copy button
```

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Local JSON for retrieval | No external DB required; runs fully offline |
| Retrieval before LLM | Grounds the LLM in known data, reduces hallucination |
| Strict JSON output | Enables reliable programmatic validation |
| Code-level filename validation | Catches format errors independently of the LLM |
| OCR text paste for MVP | Removes cloud OCR dependency; testable without a scanner |

---

## Constraints

- Only `OPENAI_API_KEY` is used — no Pinecone, Supabase, or hosted vector DB
- No cloud OCR API
- Runs locally with Node 20+

---

## Evaluation

Test cases are defined in `eval/test_cases.json` and run via:

```bash
node eval/eval.js
```

---

## TODO

- [ ] Implement `lib/retrieval.ts` — keyword scoring against JSON files
- [ ] Implement `lib/llm.ts` — OpenAI prompt + response parsing
- [ ] Implement `components/UploadForm.tsx` — full UI with copy button
- [ ] Add API route `app/api/process/route.ts`
- [ ] Wire up `eval/eval.js` to the real pipeline
- [ ] Optional: add client-side OCR (e.g. Tesseract.js)

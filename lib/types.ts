// lib/types.ts
// Shared types used by both the API route and the client-side UI.
// This file must NOT import anything from lib/retrieval, lib/llm, or Node.js built-ins.

export interface ProcessResponse {
  filename: string;
  confidence: number;
  fields: {
    documentType: string;
    supplier: string;
    productCategory: string;
    orderNumber: string;
    date: string;
  };
  warnings: string[];
  validationErrors: string[];
}

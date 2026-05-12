"use client";

import { useState } from "react";
import type { ProcessResponse } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

export default function UploadForm() {
  const [ocrText, setOcrText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ocrText.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setCopied(false);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setResult(data as ProcessResponse);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.filename);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const confidenceColor =
    !result
      ? ""
      : result.confidence >= 0.8
      ? "text-green-600 dark:text-green-400"
      : result.confidence >= 0.5
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="ocr-input"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Paste delivery note text (OCR output)
        </label>
        <textarea
          id="ocr-input"
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          rows={6}
          placeholder={`e.g.\nDelivery Note\nSupplier: Acme Corp\nOrder No: ORD-2024-001\nDate: 15/03/2024\nItems: PCB assemblies x 20`}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
          aria-describedby="ocr-hint"
        />
        <p id="ocr-hint" className="text-xs text-zinc-500 dark:text-zinc-400">
          Paste the raw text from a scanned delivery note. The pipeline will
          extract supplier, category, order number and date automatically.
        </p>
        <button
          type="submit"
          disabled={status === "loading" || !ocrText.trim()}
          className="self-start flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-busy={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Processing…
            </>
          ) : (
            "Generate Filename"
          )}
        </button>
      </form>

      {/* Error state */}
      {status === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <span className="font-medium">Error:</span> {errorMsg}
        </div>
      )}

      {/* Result card */}
      {status === "success" && result && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">

          {/* Filename + copy */}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Generated Filename
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                {result.filename}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600 px-4 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Copy filename to clipboard"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>

          {/* Confidence */}
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 w-28 shrink-0">
              Confidence
            </span>
            <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.confidence >= 0.8
                    ? "bg-green-500"
                    : result.confidence >= 0.5
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${confidencePct}%` }}
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Confidence ${confidencePct}%`}
              />
            </div>
            <span className={`text-sm font-semibold tabular-nums w-10 text-right ${confidenceColor}`}>
              {confidencePct}%
            </span>
          </div>

          {/* Detected fields */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
              Detected Fields
            </span>
            {(
              [
                ["Doc Type",  result.fields.documentType],
                ["Supplier",  result.fields.supplier],
                ["Category",  result.fields.productCategory],
                ["Order No.", result.fields.orderNumber],
                ["Date",      result.fields.date],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 w-20 shrink-0">
                  {label}
                </span>
                <span className="text-sm text-zinc-800 dark:text-zinc-200 font-mono">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="px-5 py-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-yellow-600 dark:text-yellow-400 mb-1">
                ⚠ Warnings
              </span>
              <ul className="flex flex-col gap-1" role="list">
                {result.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation errors */}
          {result.validationErrors.length > 0 && (
            <div className="px-5 py-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
                ✗ Filename Format Errors
              </span>
              <ul className="flex flex-col gap-1" role="list">
                {result.validationErrors.map((e, i) => (
                  <li
                    key={i}
                    className="text-xs text-red-700 dark:text-red-300 leading-relaxed"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

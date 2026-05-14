"use client";

import { useState, useRef, useCallback } from "react";
import type { ProcessResponse } from "@/lib/types";
import { extractText, isSupportedFile } from "@/lib/pdfExtract";

// ─── Types ────────────────────────────────────────────────────────────────────

type FileStatus = "pending" | "extracting" | "processing" | "done" | "error";

interface FileJob {
  id: string;
  file: File;
  status: FileStatus;
  ocrText?: string;
  result?: ProcessResponse;
  error?: string;
  copied?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

const confidenceColor = (c: number) =>
  c >= 0.8
    ? "bg-green-500"
    : c >= 0.5
    ? "bg-yellow-500"
    : "bg-red-500";

const confidenceTextColor = (c: number) =>
  c >= 0.8
    ? "text-green-600 dark:text-green-400"
    : c >= 0.5
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadForm() {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // Manual text fallback
  const [manualText, setManualText] = useState("");
  const [manualStatus, setManualStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [manualResult, setManualResult] = useState<ProcessResponse | null>(null);
  const [manualError, setManualError] = useState("");
  const [manualCopied, setManualCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Update a single job by id ──────────────────────────────────────────────
  const updateJob = useCallback((id: string, patch: Partial<FileJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // ── Process one file through the pipeline ─────────────────────────────────
  async function processJob(job: FileJob) {
    // Step 1 — extract text
    updateJob(job.id, { status: "extracting" });
    let ocrText: string;
    try {
      ocrText = await extractText(job.file);
      if (!ocrText.trim()) throw new Error("No text could be extracted from this file.");
      updateJob(job.id, { ocrText });
    } catch (err) {
      updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Text extraction failed",
      });
      return;
    }

    // Step 2 — call API
    updateJob(job.id, { status: "processing" });
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API request failed");
      updateJob(job.id, { status: "done", result: data as ProcessResponse });
    } catch (err) {
      updateJob(job.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Processing failed",
      });
    }
  }

  // ── Add files and start processing ────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid = arr.filter(isSupportedFile);
    const invalid = arr.filter((f) => !isSupportedFile(f));

    if (invalid.length > 0) {
      alert(`Unsupported file type(s): ${invalid.map((f) => f.name).join(", ")}\nOnly PDF and .txt files are supported.`);
    }

    if (valid.length === 0) return;

    const newJobs: FileJob[] = valid.map((file) => ({
      id: uid(),
      file,
      status: "pending",
    }));

    setJobs((prev) => [...newJobs, ...prev]);

    // Process all new jobs (in parallel)
    for (const job of newJobs) {
      processJob(job);
    }
  }

  // ── Drag & Drop handlers ───────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  // ── Copy filename ──────────────────────────────────────────────────────────
  async function copyFilename(id: string, filename: string) {
    await navigator.clipboard.writeText(filename);
    updateJob(id, { copied: true });
    setTimeout(() => updateJob(id, { copied: false }), 2000);
  }

  // ── Manual text submit ─────────────────────────────────────────────────────
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    setManualStatus("loading");
    setManualResult(null);
    setManualError("");
    setManualCopied(false);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: manualText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setManualResult(data as ProcessResponse);
      setManualStatus("done");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Unknown error");
      setManualStatus("error");
    }
  }

  async function copyManual() {
    if (!manualResult) return;
    await navigator.clipboard.writeText(manualResult.filename);
    setManualCopied(true);
    setTimeout(() => setManualCopied(false), 2000);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full">

      {/* ── Drop Zone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop PDF files here or click to select"
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          px-6 py-10 cursor-pointer transition-colors select-none
          ${isDragging
            ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          }
        `}
      >
        <div className="text-3xl" aria-hidden="true">📄</div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Drop PDF or .txt files here
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Multiple files supported — each gets its own filename
        </p>
        <span className="mt-1 rounded-full border border-zinc-300 dark:border-zinc-600 px-4 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Browse files
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          aria-hidden="true"
        />
      </div>

      {/* ── File Results ── */}
      {jobs.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Files ({jobs.length})
          </h2>
          {jobs.map((job) => (
            <FileCard
              key={job.id}
              job={job}
              onCopy={() => job.result && copyFilename(job.id, job.result.filename)}
            />
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs text-zinc-400 dark:text-zinc-500">or paste text manually</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* ── Manual Text Input ── */}
      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
        <label htmlFor="ocr-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Paste delivery note text (OCR output)
        </label>
        <textarea
          id="ocr-input"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={5}
          placeholder={`e.g.\nLieferschein\nifm electronic GmbH\nBestell-Nr: 45001199207\nDatum: 12.05.2024`}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
        />
        <button
          type="submit"
          disabled={manualStatus === "loading" || !manualText.trim()}
          className="self-start flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {manualStatus === "loading" ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              Processing…
            </>
          ) : "Generate Filename"}
        </button>
      </form>

      {manualStatus === "error" && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <span className="font-medium">Error:</span> {manualError}
        </div>
      )}

      {manualStatus === "done" && manualResult && (
        <ResultCard result={manualResult} copied={manualCopied} onCopy={copyManual} />
      )}
    </div>
  );
}

// ─── FileCard ─────────────────────────────────────────────────────────────────

function FileCard({ job, onCopy }: { job: FileJob; onCopy: () => void }) {
  const statusLabel: Record<FileStatus, string> = {
    pending:    "Queued…",
    extracting: "Extracting text…",
    processing: "Generating filename…",
    done:       "",
    error:      "Error",
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-lg" aria-hidden="true">
          {job.file.name.endsWith(".pdf") ? "📄" : "📝"}
        </span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">
          {job.file.name}
        </span>
        {job.status !== "done" && job.status !== "error" && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            {statusLabel[job.status]}
          </span>
        )}
        {job.status === "error" && (
          <span className="text-xs text-red-500 font-medium">Failed</span>
        )}
      </div>

      {/* Error */}
      {job.status === "error" && (
        <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {job.error}
        </div>
      )}

      {/* Result */}
      {job.status === "done" && job.result && (
        <ResultCard result={job.result} copied={job.copied ?? false} onCopy={onCopy} compact />
      )}
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  copied,
  onCopy,
  compact = false,
}: {
  result: ProcessResponse;
  copied: boolean;
  onCopy: () => void;
  compact?: boolean;
}) {
  const pct = Math.round(result.confidence * 100);

  return (
    <div className={compact ? "" : "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm"}>
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
          onClick={onCopy}
          className="shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600 px-4 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Copy filename to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Confidence bar */}
      <div className="px-5 py-2 flex items-center gap-3">
        <span className="text-xs text-zinc-400 dark:text-zinc-500 w-24 shrink-0">Confidence</span>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${confidenceColor(result.confidence)}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums w-8 text-right ${confidenceTextColor(result.confidence)}`}>
          {pct}%
        </span>
      </div>

      {/* Fields */}
      <div className="px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-1">
        {(
          [
            ["Doc Type", result.fields.documentType],
            ["Supplier",  result.fields.supplier],
            ["Category",  result.fields.productCategory],
            ["Order No.", result.fields.orderNumber],
            ["Date",      result.fields.date],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1.5">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">{value}</span>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">⚠ Warnings</span>
          <ul className="mt-1 flex flex-col gap-0.5">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation errors */}
      {result.validationErrors.length > 0 && (
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-red-600 dark:text-red-400">✗ Format errors</span>
          <ul className="mt-1 flex flex-col gap-0.5">
            {result.validationErrors.map((e, i) => (
              <li key={i} className="text-xs text-red-700 dark:text-red-300">{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <main className="flex flex-col w-full max-w-2xl px-6 py-16 gap-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Upload Delivery Easy
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg">
            Paste the OCR text from a scanned delivery note. The app retrieves
            matching suppliers, categories and orders from the internal database,
            then uses an LLM to generate a standardised filename.
          </p>
        </div>

        {/* Pipeline steps — visual hint */}
        <ol
          aria-label="Processing pipeline"
          className="flex items-center gap-0 text-xs text-zinc-400 dark:text-zinc-600 select-none"
        >
          {["OCR Text", "Retrieval", "LLM", "Validate", "Filename"].map(
            (step, i, arr) => (
              <li key={step} className="flex items-center gap-0">
                <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="px-1" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            )
          )}
        </ol>

        {/* Main form */}
        <UploadForm />
      </main>
    </div>
  );
}

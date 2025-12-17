import React, { useState } from "react";
import ResultPage from "./components/ResultPage";

type ApiResult = any;

const API_BASE = "http://127.0.0.1:8000";

type View = "upload" | "loading" | "result";

const App: React.FC = () => {
  const [view, setView] = useState<View>("upload");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setError(null);
    setView("loading");

    try {
      const resp = await fetch(`${API_BASE}/extract-text`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`Extract failed: ${resp.status}`);
      }

      const data = await resp.json();
      setRawText(data.extracted_text || "");
      setView("upload");
    } catch (err: any) {
      setError(err.message || "Failed to extract text from PDF.");
      setView("upload");
    }
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setError("Please provide some text to analyze (or upload a PDF).");
      return;
    }
    setError(null);
    setView("loading");

    try {
      const resp = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (!resp.ok) {
        throw new Error(`Analyze failed: ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
      setView("result");
    } catch (err: any) {
      setError(err.message || "Failed to analyze document.");
      setView("upload");
    }
  };

  if (view === "result" && result) {
    return <ResultPage data={result} />;
  }

  return (
    <div className="min-h-screen bg-[#FFF7F2] text-gray-900">
      <header className="border-b border-red-900 bg-black text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-wide">
              NyayAI
            </h1>
            <p className="text-xs text-red-200">
              Indian Legal Document Analyzer
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-red-300">
            Prototype
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <section className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
            Upload Legal Document
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Upload a PDF or paste the text of an Indian legal document (rental
            agreement, employment offer, notice, complaint, etc.). NyayAI will
            extract key details, simplify clauses, highlight risks, and suggest
            high-level next steps.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">
                PDF Upload
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mt-1 w-full text-xs text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-courtred-600 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-courtred-700"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                We will extract text from the PDF on your device and send only
                the text to the analysis API.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Or paste text directly
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border border-gray-300 bg-[#FFFCF8] p-2 text-xs text-gray-800 shadow-inner focus:border-courtred-700 focus:outline-none focus:ring-1 focus:ring-courtred-700"
                placeholder="Paste legal text here (e.g. rental agreement, offer letter, notice)..."
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={view === "loading"}
                className="inline-flex items-center rounded-md bg-courtred-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-courtred-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {view === "loading" ? "Analyzing…" : "Analyze Document"}
              </button>
              <p className="text-[11px] text-gray-500">
                This is an informational prototype, not legal advice.
              </p>
            </div>

            {view === "loading" && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-700">
                <span className="h-3 w-3 animate-pulse rounded-full bg-courtred-600" />
                <span>Running multi‑agent analysis on your document…</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;



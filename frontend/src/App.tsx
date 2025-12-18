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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-red-600/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-red-600 text-white text-xl font-bold">
                ⚖️
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NyayAI</h1>
                <p className="text-xs text-red-400">Indian Legal Document Analyzer</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-white/80 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-white/80 hover:text-white transition-colors">How It Works</a>
              <a href="#contact" className="text-sm text-white/80 hover:text-white transition-colors">Contact</a>
              <span className="px-3 py-1.5 bg-red-600/20 border border-red-600/40 rounded-full text-xs font-medium text-red-400">
                Powered by Lovable
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Full Width */}
      <main className="pt-24 w-full">
        {/* Hero Content */}
        <section className="w-full min-h-[calc(100vh-80px)] bg-gradient-to-b from-black via-red-950/30 to-black flex items-center justify-center">

          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600 mb-6">
                <span className="text-4xl">⚖️</span>
              </div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="text-red-600">Nyay</span>
              <span className="text-white">AI</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4">
              <span className="text-red-500">कानून समझो</span>
              <span className="text-white/70"> - Understand Your Legal Documents</span>
            </p>
          </div>
        </section>

        {/* Upload Section - Full Width */}
        <section className="w-full bg-white py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Upload Your Legal Document
              </h2>
              <p className="text-gray-600">
                Upload a PDF or paste text from any Indian legal document
              </p>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-lg">
              <div className="space-y-6">
                {/* PDF Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Upload PDF Document
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-red-500 hover:bg-red-50/50 transition-all">
                      <div className="text-center">
                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-semibold text-red-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
                  </div>
                </div>

                {/* Text Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Paste Document Text
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={10}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-sm text-gray-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
                    placeholder="Paste your legal document text here..."
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-900">{error}</p>
                  </div>
                )}

                {/* Analyze Button */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={view === "loading" || !rawText.trim()}
                    className="inline-flex items-center gap-3 rounded-lg bg-red-600 hover:bg-red-700 px-8 py-3 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {view === "loading" ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Document...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Analyze Document
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 max-w-xs text-right">
                    ⚠️ Informational tool only, not legal advice
                  </p>
                </div>

                {/* Loading State */}
                {view === "loading" && (
                  <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-red-600"></div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Running AI Analysis...</p>
                        <p className="text-xs text-gray-600 mt-1">Our multi-agent system is analyzing your document</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Full Width */}
        <section id="features" className="w-full bg-black py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-8 shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 mb-6">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Analysis</h3>
                <p className="text-gray-600 leading-relaxed">AI-powered extraction of key information, parties, and clauses from your documents.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 mb-6">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Simplified Language</h3>
                <p className="text-gray-600 leading-relaxed">Complex legal jargon translated into plain, understandable language in Hindi, English, and Telugu.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 mb-6">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Risk Assessment</h3>
                <p className="text-gray-600 leading-relaxed">Identify potential risks and get actionable next steps for your legal documents.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Full Width */}
        <section id="how-it-works" className="w-full bg-white py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
              How It Works
            </h2>
            <div className="bg-gray-50 rounded-lg p-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white text-xl font-bold mx-auto mb-4">1</div>
                  <h4 className="font-bold text-gray-900 mb-2">Upload</h4>
                  <p className="text-sm text-gray-600">Upload your PDF or paste text</p>
                </div>
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white text-xl font-bold mx-auto mb-4">2</div>
                  <h4 className="font-bold text-gray-900 mb-2">Analyze</h4>
                  <p className="text-sm text-gray-600">AI analyzes your document</p>
                </div>
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white text-xl font-bold mx-auto mb-4">3</div>
                  <h4 className="font-bold text-gray-900 mb-2">Understand</h4>
                  <p className="text-sm text-gray-600">Get simplified explanations</p>
                </div>
                <div className="text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white text-xl font-bold mx-auto mb-4">4</div>
                  <h4 className="font-bold text-gray-900 mb-2">Ask Questions</h4>
                  <p className="text-sm text-gray-600">Chat with AI about your document</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Full Width */}
      <footer className="w-full bg-black border-t border-red-600/30 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white text-lg">
                ⚖️
              </div>
              <div>
                <p className="text-lg font-bold text-white">NyayAI</p>
                <p className="text-xs text-red-400">© 2025 All rights reserved</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

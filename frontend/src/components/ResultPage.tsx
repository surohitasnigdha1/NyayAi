import React, { useState } from "react";
import ChatInterface from "./ChatInterface";

type AnyRecord = Record<string, any>;

interface ResultPageProps {
  data: AnyRecord;
}

const API_BASE = "http://127.0.0.1:8000";

const ResultPage: React.FC<ResultPageProps> = ({ data }) => {
  const { document_info, simplified, risks, legal_mapping, next_steps } = data;
  const [translationLang, setTranslationLang] = useState<"en" | "hi" | "te">("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const translateText = async (text: string): Promise<string> => {
    if (translationLang === "en" || !text) return text;

    try {
      const resp = await fetch(`${API_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          target_language: translationLang,
        }),
      });
      
      if (!resp.ok) {
        console.error("Translation failed:", resp.status);
        return text;
      }
      
      const data = await resp.json();
      return data.translated_text || text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  const [translatedSummary, setTranslatedSummary] = React.useState<string | null>(null);
  const [translatedClauses, setTranslatedClauses] = React.useState<Record<string, any>>({});
  const [translatedSimplified, setTranslatedSimplified] = React.useState<Record<string, any>>({});

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/download-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NyayAI-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  React.useEffect(() => {
    if (translationLang === "en") {
      setTranslatedSummary(null);
      setTranslatedClauses({});
      setTranslatedSimplified({});
      return;
    }

    setIsTranslating(true);
    
    if (document_info?.summary) {
      translateText(document_info.summary).then((translated) => {
        setTranslatedSummary(translated);
      });
    }

    if (document_info?.clauses) {
      const clauseTranslations: Record<string, any> = {};
      Promise.all(
        document_info.clauses.map(async (clause: AnyRecord) => {
          const translatedText = await translateText(clause.text || "");
          const translatedTitle = await translateText(clause.title || "");
          clauseTranslations[clause.id] = {
            text: translatedText,
            title: translatedTitle,
          };
        })
      ).then(() => {
        setTranslatedClauses(clauseTranslations);
      });
    }

    if (simplified?.simplified_clauses) {
      const simplifiedTranslations: Record<string, any> = {};
      Promise.all(
        simplified.simplified_clauses.map(async (simp: AnyRecord) => {
          const translatedExplanation = await translateText(simp.simple_explanation_en || "");
          const translatedWhy = simp.why_it_matters 
            ? await translateText(simp.why_it_matters)
            : "";
          simplifiedTranslations[simp.clause_id] = {
            explanation: translatedExplanation,
            why: translatedWhy,
          };
        })
      ).then(() => {
        setTranslatedSimplified(simplifiedTranslations);
        setIsTranslating(false);
      });
    } else {
      setIsTranslating(false);
    }
  }, [translationLang, document_info?.summary, document_info?.clauses, simplified?.simplified_clauses]);

  const riskForClause = (clauseId: string) =>
    risks?.risks?.find((r: AnyRecord) => r.clause_id === clauseId);

  const simplifiedForClause = (clauseId: string) =>
    simplified?.simplified_clauses?.find(
      (c: AnyRecord) => c.clause_id === clauseId
    );

  const overallRiskLevel = (): string => {
    const all = risks?.risks ?? [];
    if (!all.length) return "Unknown";
    if (all.some((r: AnyRecord) => r.risk_level === "High")) return "High";
    if (all.some((r: AnyRecord) => r.risk_level === "Medium")) return "Medium";
    return "Low";
  };

  const overallRiskColor = () => {
    const level = overallRiskLevel();
    if (level === "High") return "from-red-500 to-red-600";
    if (level === "Medium") return "from-amber-500 to-amber-600";
    if (level === "Low") return "from-emerald-500 to-emerald-600";
    return "from-gray-500 to-gray-600";
  };

  const riskBadgeColor = (level: string) => {
    if (level === "High") return "bg-red-100 text-red-800 border-red-200";
    if (level === "Medium") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Fixed Header - Always Visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b-2 border-red-600 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white font-bold text-2xl shadow-lg">
              ⚖️
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                NyayAI
              </h1>
              <p className="text-xs text-red-300 font-medium">
                Document Analysis Results
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF Report
                </>
              )}
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600/20 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400"></span>
              Analysis Complete
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 pt-24 pb-8">
        {/* Language Selector */}
        <div className="glass-effect rounded-2xl p-6 shadow-xl card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-red-200">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">View in Language</label>
                <select
                  value={translationLang}
                  onChange={(e) => setTranslationLang(e.target.value as "en" | "hi" | "te")}
                  className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                  <option value="te">🇮🇳 తెలుగు (Telugu)</option>
                </select>
              </div>
            </div>
            {isTranslating && (
              <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Translating...
              </div>
            )}
          </div>
        </div>

        {/* Summary and Risk Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Document Summary */}
          <section className="md:col-span-2 glass-effect rounded-2xl p-6 shadow-xl card-hover animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-gray-900">
                Document Summary
              </h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-6">
              {isTranslating
                ? "Translating..."
                : translationLang !== "en" && translatedSummary
                ? translatedSummary
                : document_info?.summary || "Summary not available."}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-100 to-red-200 border-2 border-red-300 px-4 py-2 text-sm font-bold text-red-900">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {document_info?.document_type || "Unknown"}
              </span>
              {document_info?.parties?.map((p: AnyRecord) => (
                <span
                  key={`${p.role}-${p.name}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
                >
                  <span className="font-semibold">{p.role}:</span> {p.name}
                </span>
              ))}
            </div>
          </section>

          {/* Risk Overview */}
          <section className="glass-effect rounded-2xl p-6 shadow-xl card-hover animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${overallRiskColor()}`}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-gray-900">
                Risk Overview
              </h2>
            </div>
            <div className="mt-4">
              <span className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${overallRiskColor()} px-5 py-3 text-sm font-black text-white shadow-xl border-2 border-white/20`}>
                <span>Overall Risk:</span>
                <span className="text-xl">{overallRiskLevel()}</span>
              </span>
              <p className="mt-4 text-xs text-gray-600 leading-relaxed">
                This is an informational risk assessment based on document analysis. It is not legal advice.
              </p>
            </div>
          </section>
        </div>

        {/* Clauses Section */}
        <section className="glass-effect rounded-2xl p-6 shadow-xl animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="font-serif text-3xl font-bold text-gray-900">
              Clauses & Simplified Explanations
            </h2>
          </div>
          <div className="space-y-4">
            {document_info?.clauses?.map((clause: AnyRecord, idx: number) => {
              const simp = simplifiedForClause(clause.id);
              const risk = riskForClause(clause.id);

              return (
                <article
                  key={clause.id}
                  className="rounded-xl border-2 border-gray-100 bg-white p-5 shadow-md hover:shadow-lg transition-all card-hover animate-fade-in"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-xs font-black text-white shadow-md">
                          {clause.id.toUpperCase()}
                        </span>
                        <h3 className="font-serif text-lg font-bold text-gray-900">
                          {translationLang !== "en" && translatedClauses[clause.id]?.title 
                            ? translatedClauses[clause.id].title 
                            : clause.title}
                        </h3>
                      </div>
                      {risk && (
                        <span className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-semibold ${riskBadgeColor(risk.risk_level)}`}>
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Risk: {risk.risk_level}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                    {translationLang !== "en" && translatedClauses[clause.id]?.text
                      ? translatedClauses[clause.id].text
                      : clause.text}
                  </p>

                  {simp && (
                    <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="font-serif font-bold text-gray-900">
                          {translationLang === "en" ? "What this means:" : 
                           translationLang === "hi" ? "इसका क्या मतलब है:" : 
                           "దీని అర్థం ఏమిటి:"}
                        </p>
                      </div>
                      <p className="text-gray-700 leading-relaxed mb-3">
                        {translationLang !== "en" && translatedSimplified[simp.clause_id]?.explanation
                          ? translatedSimplified[simp.clause_id].explanation
                          : simp.simple_explanation_en}
                      </p>
                      {simp.why_it_matters && (
                        <div className="flex items-start gap-2 pt-3 border-t-2 border-red-200">
                          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm mb-1">
                              {translationLang === "en" ? "Why it matters:" : 
                               translationLang === "hi" ? "यह क्यों महत्वपूर्ण है:" : 
                               "ఇది ఎందుకు ముఖ్యమైనది:"}
                            </p>
                            <p className="text-sm text-gray-700 italic">
                              {translationLang !== "en" && translatedSimplified[simp.clause_id]?.why
                                ? translatedSimplified[simp.clause_id].why
                                : simp.why_it_matters}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Chat Interface */}
        <section className="glass-effect rounded-2xl p-6 shadow-xl animate-slide-up">
          <div style={{ height: "500px" }}>
            <ChatInterface documentInfo={document_info} />
          </div>
        </section>

        {/* Laws and Next Steps */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Relevant Laws */}
          <section className="md:col-span-2 glass-effect rounded-2xl p-6 shadow-xl card-hover animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-gray-900">
                Relevant Laws
              </h2>
            </div>
            <div className="space-y-3">
              {(legal_mapping?.laws || []).length === 0 && (
                <p className="text-sm text-gray-600 italic">
                  No specific laws were mapped for this document.
                </p>
              )}
              {legal_mapping?.laws?.map((item: AnyRecord, idx: number) => (
                <div
                  key={`${item.clause_id}-${idx}`}
                  className="rounded-xl border-2 border-gray-100 bg-white p-4 hover:border-primary-200 transition-all"
                >
                  <p className="text-sm font-bold text-red-700 mb-2">
                    Clause {item.clause_id}
                  </p>
                  <ul className="space-y-2">
                    {item.related_laws?.map((law: AnyRecord, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-600 mt-1 font-bold">•</span>
                        <div>
                          <span className="font-semibold">
                            {law.act}
                            {law.section ? ` – Section ${law.section}` : ""}
                          </span>
                          {law.summary && (
                            <span className="text-gray-600">: {law.summary}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Next Steps */}
          <section className="glass-effect rounded-2xl p-6 shadow-xl card-hover animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-bold text-gray-900">
                Next Steps
              </h2>
            </div>
            <ul className="space-y-3">
              {next_steps?.next_steps?.map((step: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-xs font-black text-white shadow-md">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-amber-50 border-2 border-amber-200 p-4">
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>⚠️ Disclaimer:</strong> {next_steps?.disclaimer ||
                  "This tool provides informational assistance only and is not a substitute for professional legal advice."}
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/80 border-t-2 border-red-600 py-8 mt-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white text-xl">
                ⚖️
              </div>
              <div>
                <p className="font-serif text-lg font-bold text-white">NyayAI</p>
                <p className="text-xs text-red-300">© 2025 All rights reserved</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/80">
              <span>Powered by</span>
              <span className="font-bold text-red-400">Lovable</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResultPage;

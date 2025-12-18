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

  React.useEffect(() => {
    if (translationLang === "en") {
      setTranslatedSummary(null);
      setTranslatedClauses({});
      setTranslatedSimplified({});
      return;
    }

    setIsTranslating(true);
    
    // Translate summary
    if (document_info?.summary) {
      translateText(document_info.summary).then((translated) => {
        setTranslatedSummary(translated);
      });
    }

    // Translate clauses
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

    // Translate simplified explanations
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
    if (level === "High") return "bg-red-100 text-red-800";
    if (level === "Medium") return "bg-amber-100 text-amber-800";
    if (level === "Low") return "bg-emerald-100 text-emerald-800";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-[#FFF7F2] text-gray-900">
      <header className="border-b border-red-900 bg-black text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-wide">
              NyayAI
            </h1>
            <p className="text-xs text-red-200">
              Indian Legal Document Analyzer
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-red-300">
            Not a substitute for legal advice
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {/* Language selector */}
        <div className="flex items-center justify-between rounded-lg border border-red-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">View in:</label>
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value as "en" | "hi" | "te")}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-courtred-700 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
            {isTranslating && (
              <span className="text-xs text-gray-500">Translating...</span>
            )}
          </div>
        </div>

        {/* Top: summary + risk overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <section className="md:col-span-2 rounded-lg border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
              Document Summary
            </h2>
            <p className="mt-3 text-sm">
              {isTranslating
                ? "Translating..."
                : translationLang !== "en" && translatedSummary
                ? translatedSummary
                : document_info?.summary || "Summary not available."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">
                Type: {document_info?.document_type || "Unknown"}
              </span>
              {document_info?.parties?.map((p: AnyRecord) => (
                <span
                  key={`${p.role}-${p.name}`}
                  className="rounded-full bg-gray-100 px-3 py-1"
                >
                  {p.role}: {p.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
              Risk Overview
            </h2>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${overallRiskColor()}`}
              >
                Overall risk: {overallRiskLevel()}
              </span>
              <p className="mt-2 text-xs text-gray-600">
                This is a rough, informational risk view based only on the text
                of the document. It is not legal advice.
              </p>
            </div>
          </section>
        </div>

        {/* Clauses list */}
        <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm">
          <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
            Clauses & Simplified Explanations
          </h2>
          <div className="mt-4 space-y-4">
            {document_info?.clauses?.map((clause: AnyRecord) => {
              const simp = simplifiedForClause(clause.id);
              const risk = riskForClause(clause.id);

              const riskColor =
                risk?.risk_level === "High"
                  ? "bg-red-100 text-red-800"
                  : risk?.risk_level === "Medium"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800";

              return (
                <article
                  key={clause.id}
                  className="rounded-md border border-gray-200 bg-[#FFFCF8] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {clause.id.toUpperCase()} · {translationLang !== "en" && translatedClauses[clause.id]?.title 
                          ? translatedClauses[clause.id].title 
                          : clause.title}
                      </h3>
                      {risk && (
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${riskColor}`}
                        >
                          Risk: {risk.risk_level}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 whitespace-pre-line text-xs text-gray-700">
                    {translationLang !== "en" && translatedClauses[clause.id]?.text
                      ? translatedClauses[clause.id].text
                      : clause.text}
                  </p>

                  {simp && (
                    <div className="mt-3 rounded border border-red-50 bg-white/70 p-2 text-xs">
                      <p className="font-semibold text-gray-900">
                        {translationLang === "en" ? "What this means:" : 
                         translationLang === "hi" ? "इसका क्या मतलब है:" : 
                         "దీని అర్థం ఏమిటి:"}
                      </p>
                      <p className="mt-1 text-gray-700">
                        {translationLang !== "en" && translatedSimplified[simp.clause_id]?.explanation
                          ? translatedSimplified[simp.clause_id].explanation
                          : simp.simple_explanation_en}
                      </p>
                      {simp.why_it_matters && (
                        <p className="mt-1 italic text-gray-600">
                          {translationLang === "en" ? "Why it matters: " : 
                           translationLang === "hi" ? "यह क्यों महत्वपूर्ण है: " : 
                           "ఇది ఎందుకు ముఖ్యమైనది: "}
                          {translationLang !== "en" && translatedSimplified[simp.clause_id]?.why
                            ? translatedSimplified[simp.clause_id].why
                            : simp.why_it_matters}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Chat Interface */}
        <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm">
          <div style={{ height: "500px" }}>
            <ChatInterface documentInfo={document_info} />
          </div>
        </section>

        {/* Relevant laws & next steps */}
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm md:col-span-2">
            <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
              Relevant Laws (Informational)
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(legal_mapping?.laws || []).length === 0 && (
                <p className="text-xs text-gray-600">
                  No specific laws were mapped for this document at this level.
                </p>
              )}
              {legal_mapping?.laws?.map((item: AnyRecord, idx: number) => (
                <div
                  key={`${item.clause_id}-${idx}`}
                  className="rounded border border-gray-200 bg-[#FFFCF8] px-3 py-2"
                >
                  <p className="text-[11px] font-semibold">
                    Clause {item.clause_id}
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-gray-700">
                    {item.related_laws?.map((law: AnyRecord, i: number) => (
                      <li key={i}>
                        <span className="font-medium">
                          {law.act}
                          {law.section ? ` – ${law.section}` : ""}
                        </span>
                        {law.summary ? `: ${law.summary}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
              Next Steps
            </h2>
            <ul className="mt-3 list-disc pl-5 text-xs text-gray-700">
              {next_steps?.next_steps?.map((step: string, idx: number) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-gray-500">
              {next_steps?.disclaimer ||
                "This tool provides informational assistance only and is not a substitute for professional legal advice."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ResultPage;



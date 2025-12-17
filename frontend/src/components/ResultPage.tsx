import React from "react";

type AnyRecord = Record<string, any>;

interface ResultPageProps {
  data: AnyRecord;
}

const ResultPage: React.FC<ResultPageProps> = ({ data }) => {
  const { document_info, simplified, risks, legal_mapping, next_steps } = data;

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
        {/* Top: summary + risk overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <section className="md:col-span-2 rounded-lg border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="border-l-4 border-courtred-700 pl-3 text-sm font-semibold uppercase tracking-wide text-courtred-700">
              Document Summary
            </h2>
            <p className="mt-3 text-sm">
              {document_info?.summary || "Summary not available."}
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
                        {clause.id.toUpperCase()} · {clause.title}
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
                    {clause.text}
                  </p>

                  {simp && (
                    <div className="mt-3 rounded border border-red-50 bg-white/70 p-2 text-xs">
                      <p className="font-semibold text-gray-900">
                        What this means:
                      </p>
                      <p className="mt-1 text-gray-700">
                        {simp.simple_explanation_en}
                      </p>
                      {simp.why_it_matters && (
                        <p className="mt-1 italic text-gray-600">
                          Why it matters: {simp.why_it_matters}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
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



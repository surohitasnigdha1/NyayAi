from typing import Any, Dict

from utils.llm import call_llm


DISCLAIMER = (
    "This tool provides informational assistance only and is not a substitute "
    "for professional legal advice. For any important decision, please consult "
    "a qualified legal professional."
)


def run(
    document_info: Dict[str, Any],
    legal_mapping: Dict[str, Any] | None = None,
    risk_info: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Rights & Next-Steps Agent

    Responsibilities:
    - Suggest basic rights and possible next steps in very general terms.
    - MUST include a clear disclaimer that this is NOT legal advice.

    Inputs:
    - document_info: output of document_agent.run
    - legal_mapping: output of legal_agent.run (optional but helpful)
    - risk_info: output of risk_agent.run (optional but helpful)
    """
    doc_type = document_info.get("document_type", "")
    clauses = document_info.get("clauses", [])

    laws = []
    if legal_mapping is not None:
        laws = legal_mapping.get("laws", [])

    risks = []
    if risk_info is not None:
        risks = risk_info.get("risks", [])

    prompt = f"""
You are a legal information assistant for Indian users.
You are NOT a lawyer and MUST NOT give legal advice.
You can only provide general, high-level information and possible next steps.

Based on:
- The type of document: {doc_type}
- The clauses (summarised below)
- Any high-level law mappings and risk flags

Suggest basic rights and possible next steps a typical user might consider.

Return STRICT JSON with this structure:
{{
  "next_steps": [
    "Short, neutral, informational suggestion 1",
    "Short, neutral, informational suggestion 2"
  ],
  "disclaimer": "{DISCLAIMER}"
}}

Guidelines:
- Do NOT say things like "You should sign" or "You must do X".
- Use language like "You may want to", "You could consider", "In many cases people...".
- Keep it very general and informational.
- Always keep the disclaimer EXACTLY as provided above.

Clauses (summary):
\"\"\"
"""

    for clause in clauses:
        cid = clause.get("id", "")
        title = clause.get("title", "")
        text = clause.get("text", "")
        prompt += f"Clause {cid} - {title}:\n{text[:400]}\n\n"

    prompt += "\"\"\"\n\n"

    if laws:
        prompt += "High-level law mappings:\n"
        for item in laws[:10]:
            cid = item.get("clause_id", "")
            rel = item.get("related_laws", [])
            prompt += f"- Clause {cid}: {rel}\n"

    if risks:
        prompt += "\nRisk flags:\n"
        for r in risks[:10]:
            cid = r.get("clause_id", "")
            level = r.get("risk_level", "")
            reason = r.get("reason", "")
            prompt += f"- Clause {cid}: {level} risk – {reason}\n"

    raw = call_llm(prompt=prompt)

    import json

    try:
        data = json.loads(raw)
        if "next_steps" not in data or not isinstance(data["next_steps"], list):
            raise ValueError("Missing or invalid 'next_steps' key")
        # Ensure disclaimer is present / override if changed
        data["disclaimer"] = DISCLAIMER
    except Exception:
        data = {
            "next_steps": [
                "Read the full document carefully and make sure you understand each clause.",
                "If you feel unsure about any clause, especially high-risk ones, consider talking to a qualified lawyer.",
                "Keep copies of important communications and signed documents for your records.",
            ],
            "disclaimer": DISCLAIMER,
        }

    return data

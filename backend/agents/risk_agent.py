from typing import Any, Dict, List

from utils.llm import call_llm


def _risk_for_one_clause(clause_id: str, text: str) -> Dict[str, Any]:
    """
    Call the LLM once for a single clause and classify its risk.
    """
    prompt = f"""
You are a risk analysis assistant for legal-style documents for Indian users.
You are NOT a lawyer and must not give legal advice.

For the clause below, identify potential risks and red flags.

Return STRICT JSON with this structure and nothing else:
{{
  "risk_level": "Low",
  "reason": "Short explanation of why this risk level was chosen",
  "flags": ["one-sided obligation", "excessive penalty"]
}}

Allowed risk_level values: "Low", "Medium", "High".

Examples of flags:
- "unfair term"
- "one-sided obligation"
- "excessive penalty"
- "missing consumer protection"
- "vague or unclear language"
- "broad indemnity"

Do NOT tell the user what they should do. Only describe risks in neutral language.

Clause text:
\"\"\"
{text}
\"\"\"
"""
    raw = call_llm(prompt=prompt)

    import json

    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            raise ValueError("Not a dict")
        if "risk_level" not in data or "reason" not in data or "flags" not in data:
            raise ValueError("Missing keys")
        if data["risk_level"] not in ["Low", "Medium", "High"]:
            raise ValueError("Invalid risk_level")
        if not isinstance(data.get("flags", []), list):
            raise ValueError("flags must be list")
        return data
    except Exception:
        return {
            "risk_level": "Low",
            "reason": "Automatic analysis failed; no specific risks identified.",
            "flags": [],
        }


def run(document_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Risk & Red-Flag Agent

    Responsibilities:
    - Scan clauses for unfair terms, one-sided obligations, excessive penalties,
      missing protections, etc.
    - Classify risk level per clause: Low / Medium / High.

    Expected input: output of document_agent.run (document_info).
    """
    clauses: List[Dict[str, Any]] = document_info.get("clauses", [])

    risks: List[Dict[str, Any]] = []

    for clause in clauses:
        cid = clause.get("id", "")
        text = clause.get("text", "") or ""

        res = _risk_for_one_clause(cid, text)

        risks.append(
            {
                "clause_id": cid,
                "risk_level": res.get("risk_level", "Low"),
                "reason": res.get("reason", ""),
                "flags": res.get("flags", []),
            }
        )

    return {"risks": risks}

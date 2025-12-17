from typing import Any, Dict, List

from utils.llm import call_llm


def _simplify_one_clause(clause_id: str, text: str) -> Dict[str, str]:
    """
    Call the LLM once for a single clause and return simple explanations.
    This keeps prompts and outputs small so they are more reliable.
    """
    prompt = f"""
You are a legal language simplification assistant for Indian users.
You are NOT a lawyer and must not give legal advice.

For the clause below, produce a simple explanation.

Return STRICT JSON with this structure and nothing else:
{{
  "simple_explanation_en": "plain, everyday English explanation",
  "simple_explanation_hi": "1-2 sentence explanation in simple Hindi (Roman script is okay)",
  "why_it_matters": "1-2 sentences explaining why this clause is important"
}}

Clause text:
\"\"\"
{text}
\"\"\"
"""
    raw = call_llm(prompt=prompt)

    import json

    # Light cleaning in case the model adds fences
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            raise ValueError("Not a dict")
        for key in ["simple_explanation_en", "simple_explanation_hi", "why_it_matters"]:
            if key not in data:
                raise ValueError("Missing key")
        return data
    except Exception:
        return {
            "simple_explanation_en": "Could not simplify automatically.",
            "simple_explanation_hi": "",
            "why_it_matters": "",
        }


def run(document_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simplification Agent

    Responsibilities:
    - For each clause, generate a simple explanation in everyday English
      (and optionally a short Hindi explanation).
    - Avoid giving legal advice; only explain meaning and why it matters.

    Expected input: output of document_agent.run (document_info).
    """
    clauses: List[Dict[str, Any]] = document_info.get("clauses", [])

    simplified: List[Dict[str, Any]] = []

    for clause in clauses:
        cid = clause.get("id", "")
        original = clause.get("text", "") or ""

        res = _simplify_one_clause(cid, original)

        simplified.append(
            {
                "clause_id": cid,
                "original": original,
                "simple_explanation_en": res.get("simple_explanation_en", ""),
                "simple_explanation_hi": res.get("simple_explanation_hi", ""),
                "why_it_matters": res.get("why_it_matters", ""),
            }
        )

    return {"simplified_clauses": simplified}

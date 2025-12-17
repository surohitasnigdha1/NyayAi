from typing import Any, Dict, List

from utils.llm import call_llm


def run(document_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Legal Mapping Agent

    Responsibilities:
    - Map each clause to high-level Indian laws/acts/sections that might apply.
    - Output is intentionally basic and informational, not formal legal advice.

    Expected input: output of document_agent.run (document_info).
    """
    clauses: List[Dict[str, Any]] = document_info.get("clauses", [])

    # Build a compact representation of clauses for the model
    clauses_text = []
    for clause in clauses:
        cid = clause.get("id", "")
        title = clause.get("title", "")
        text = clause.get("text", "")
        clauses_text.append(f"Clause {cid} - {title}:\n{text}")

    joined_clauses = "\n\n".join(clauses_text) if clauses_text else ""

    prompt = f"""
You are a legal assistant focused on INDIAN law. You are NOT a lawyer and must not give legal advice.

Given these clauses from a document, do a simple, high-level mapping to Indian laws.

Return STRICT JSON with this structure:
{{
  "laws": [
    {{
      "clause_id": "clause_1",
      "related_laws": [
        {{
          "act": "Indian Contract Act, 1872",
          "section": "Section 73",
          "summary": "Very short, plain-language explanation of how this section is relevant."
        }}
      ]
    }}
  ]
}}

Guidelines:
- Only mention a FEW major acts at a basic level, for example:
  - "Indian Contract Act, 1872"
  - "Consumer Protection Act, 2019"
  - "Rent control law of the relevant state" (if clearly about tenancy)
  - "Labour laws" in very general terms for employment agreements
- It is okay to leave related_laws as an empty list [] if nothing is obvious.
- Do NOT say anything like "this is legal advice". This is only informational mapping.

Clauses:
\"\"\"
{joined_clauses}
\"\"\"
"""

    raw = call_llm(prompt=prompt)

    # Light validation / fallback
    import json

    try:
        data = json.loads(raw)
        if "laws" not in data or not isinstance(data["laws"], list):
            raise ValueError("Missing or invalid 'laws' key")
    except Exception:
        # Fallback: attach an empty mapping so the API does not fail
        data = {"laws": []}

    return data

import json
from typing import Any, Dict

from utils.llm import call_llm


SYSTEM_PROMPT = (
    "You are a legal document understanding assistant for Indian users. "
    "You are NOT a lawyer and must not give legal advice. "
    "You only analyze and summarize documents."
)


def run(text: str) -> Dict[str, Any]:
    """
    Document Understanding Agent

    Responsibilities:
    - Identify document type (rental agreement, employment offer, notice, consumer complaint, etc.)
    - Extract key elements: parties involved, dates, obligations, penalties
    - Split content into clauses
    - Output structured JSON that downstream agents can consume
    """
    prompt = f"""
Read the following legal or semi-legal document text (for an Indian context) and extract structured information.

Return STRICT JSON with this exact structure and keys only (no comments, no extra text):
{{
  "document_type": "",
  "parties": [
    {{
      "name": "",
      "role": ""
    }}
  ],
  "dates": {{
    "start_date": "",
    "end_date": "",
    "signature_date": ""
  }},
  "clauses": [
    {{
      "id": "clause_1",
      "title": "",
      "text": "",
      "obligations": [],
      "penalties": []
    }}
  ],
  "summary": ""
}}

Guidelines:
- Infer the document_type in simple English, e.g. "rental_agreement", "employment_offer", "legal_notice", "consumer_complaint".
- Include all clearly identifiable parties with simple roles like "landlord", "tenant", "employer", "employee", "service_provider", "customer".
- Dates can be in ISO format (YYYY-MM-DD) or as they appear if ambiguous.
- Split the document into reasonably sized clauses; each clause should have a short title and the full original text.
- Obligations: list simple sentences like "Tenant must pay rent on time".
- Penalties: list simple sentences like "If tenant is late, a penalty of X is charged".
- If some field is unknown, keep it as an empty string "" or an empty list [] as appropriate.

Document text:
\"\"\"
{text}
\"\"\"
"""

    raw = call_llm(prompt=prompt, system_prompt=SYSTEM_PROMPT)

    # The model should return pure JSON; try to parse and fall back safely.
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Very defensive fallback: wrap in a minimal structure so the API does not crash.
        data = {
            "document_type": "",
            "parties": [],
            "dates": {
                "start_date": "",
                "end_date": "",
                "signature_date": "",
            },
            "clauses": [
                {
                    "id": "clause_1",
                    "title": "Full document",
                    "text": text,
                    "obligations": [],
                    "penalties": [],
                }
            ],
            "summary": raw.strip()[:1000],
        }

    return data

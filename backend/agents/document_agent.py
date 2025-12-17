import json
import re
from typing import Any, Dict

from utils.llm import call_llm


SYSTEM_PROMPT = (
    "You are a legal document understanding assistant for Indian users. "
    "You are NOT a lawyer and must not give legal advice. "
    "You only analyze and summarize documents."
)


def _extract_json_content(raw: str) -> str:
    """
    Extract JSON from a model response.
    - Prefer fenced ```json ... ``` blocks.
    - Fallback to the first {...} block.
    """
    fence = re.search(r"```json\s*(\{.*\})\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        return fence.group(1)
    brace = re.search(r"(\{.*\})", raw, re.DOTALL)
    if brace:
        return brace.group(1)
    return raw


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

Respond with ONLY the JSON object (no Markdown, no code fences, no commentary).
Use ASCII double quotes only. No smart quotes.
Use this exact structure and keys only:
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

    # Try multiple parsing strategies
    attempts = []
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    attempts.append(cleaned)
    attempts.append(_extract_json_content(cleaned))
    attempts.append(_extract_json_content(raw))

    data = None
    for candidate in attempts:
        if not candidate:
            continue
        start = candidate.find("{")
        end = candidate.rfind("}")
        snippet = candidate[start : end + 1] if start != -1 and end != -1 and end > start else candidate
        try:
            data = json.loads(snippet)
            if isinstance(data, dict):
                break
        except Exception:
            continue

    if not isinstance(data, dict):
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

    # Last-resort fix: sometimes the model puts the REAL JSON inside the summary string.
    # If summary looks like JSON with our keys, try to parse and replace the whole structure.
    summary = data.get("summary")
    if isinstance(summary, str) and "document_type" in summary and "clauses" in summary:
        try:
            inner = _extract_json_content(summary)
            parsed_inner = json.loads(inner)
            if isinstance(parsed_inner, dict) and "document_type" in parsed_inner:
                data = parsed_inner
        except Exception:
            # If this fails, just keep the existing fallback structure.
            pass

    return data

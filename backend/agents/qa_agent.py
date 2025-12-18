from typing import Any, Dict, Optional
from utils.openrouter import call_deepseek


def run(
    question: str,
    document_info: Dict[str, Any],
    language: str = "en"
) -> Dict[str, Any]:
    """
    Q&A Agent - Answers questions about the legal document using Gemini API.
    
    Responsibilities:
    - Answer user questions about the uploaded legal document
    - Support multiple languages (English, Hindi, Telugu)
    - Provide context-aware responses based on document analysis
    
    Args:
        question: User's question
        document_info: Output from document_agent containing document structure
        language: Target language for response ('en', 'hi', 'te')
        
    Returns:
        Dictionary with answer and metadata
    """
    language_names = {
        'en': 'English',
        'hi': 'Hindi',
        'te': 'Telugu'
    }
    lang_name = language_names.get(language, 'English')
    
    # Build context from document
    doc_type = document_info.get("document_type", "legal document")
    summary = document_info.get("summary", "")
    parties = document_info.get("parties", [])
    clauses = document_info.get("clauses", [])
    
    # Create context string
    context_parts = [f"Document Type: {doc_type}"]
    
    if summary:
        context_parts.append(f"Summary: {summary}")
    
    if parties:
        parties_str = ", ".join([f"{p.get('name', '')} ({p.get('role', '')})" for p in parties])
        context_parts.append(f"Parties: {parties_str}")
    
    if clauses:
        context_parts.append("\nClauses:")
        for clause in clauses[:10]:  # Limit to first 10 clauses
            clause_text = clause.get("text", "")[:300]  # Limit clause text
            context_parts.append(f"- {clause.get('title', '')}: {clause_text}")
    
    context = "\n".join(context_parts)
    
    system_prompt = f"""You are a helpful legal document assistant for Indian users. 
You are NOT a lawyer and must NOT provide legal advice.

Your role:
- Answer questions about the uploaded legal document based on the context provided
- Use simple, clear language in {lang_name}
- If the question cannot be answered from the document, say so clearly
- Always include disclaimers that this is informational only, not legal advice
- Respond entirely in {lang_name} language

Guidelines:
- Be concise and helpful
- If information is not in the document, acknowledge it
- Do not make legal recommendations or advice
- Focus on explaining what is in the document
"""

    prompt = f"""Based on the following legal document information, answer the user's question.

Document Information:
{context}

User Question: {question}

Please provide a helpful answer in {lang_name} based on the document information above. 
Remember: This is informational only, not legal advice."""

    try:
        answer = call_deepseek(prompt, system_prompt=system_prompt, temperature=0.7)
        
        return {
            "answer": answer,
            "language": language,
            "question": question
        }
    except Exception as e:
        error_msg = "I apologize, but I encountered an error processing your question. Please try again."
        if language == 'hi':
            error_msg = "मुझे खेद है, लेकिन आपके प्रश्न को संसाधित करते समय एक त्रुटि हुई। कृपया पुनः प्रयास करें।"
        elif language == 'te':
            error_msg = "క్షమించండి, కానీ మీ ప్రశ్నను ప్రాసెస్ చేయడంలో లోపం సంభవించింది. దయచేసి మళ్లీ ప్రయత్నించండి."
        
        return {
            "answer": error_msg,
            "language": language,
            "question": question,
            "error": str(e)
        }


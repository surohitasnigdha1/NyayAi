import os
from typing import Optional, List, Dict
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables")


def call_gemini(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_output_tokens: int = 2048,
) -> str:
    """
    Call Google Gemini API for chat completion.
    
    Args:
        prompt: User prompt/question
        system_prompt: Optional system instruction
        temperature: Sampling temperature (0.0-1.0)
        max_output_tokens: Maximum tokens in response
        
    Returns:
        Response text from Gemini
    """
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set. "
            "Set your Gemini API key in the .env file."
        )
    
    try:
        # Use gemini-pro (most stable and widely available)
        model = genai.GenerativeModel('gemini-pro')
        
        # Combine system prompt and user prompt
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        # Generate content with simplified config
        response = model.generate_content(full_prompt)
        
        # Handle response - check multiple ways to get text
        text = None
        if hasattr(response, 'text') and response.text:
            text = response.text
        elif hasattr(response, 'parts') and len(response.parts) > 0:
            # Alternative way to get text from response parts
            text = getattr(response.parts[0], 'text', None)
        elif hasattr(response, 'candidates') and len(response.candidates) > 0:
            # Another way - through candidates
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                if len(candidate.content.parts) > 0:
                    text = getattr(candidate.content.parts[0], 'text', None)
        
        if not text:
            error_info = f"Response object: {type(response)}, attributes: {dir(response)}"
            raise RuntimeError(f"Gemini API returned empty response. {error_info}")
        
        return text
        
    except Exception as e:
        error_msg = str(e)
        # Print error for debugging
        print(f"Gemini API error details: {error_msg}")
        print(f"Error type: {type(e).__name__}")
        raise RuntimeError(f"Gemini API error: {error_msg}")


def translate_text(text: str, target_language: str, source_language: Optional[str] = None) -> str:
    """
    Translate text to target language using Gemini.
    
    Args:
        text: Text to translate
        target_language: Target language code ('en', 'hi', 'te')
        source_language: Optional source language code
        
    Returns:
        Translated text
    """
    language_names = {
        'en': 'English',
        'hi': 'Hindi',
        'te': 'Telugu'
    }
    
    target = language_names.get(target_language, 'English')
    source = language_names.get(source_language, 'auto-detect') if source_language else 'auto-detect'
    
    prompt = f"""Translate the following text to {target}. 
Keep the meaning and tone exactly the same. Only return the translated text, no explanations.

Text to translate:
{text}

Translated text:"""
    
    return call_gemini(prompt, temperature=0.3)


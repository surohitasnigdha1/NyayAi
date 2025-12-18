import os
from typing import Optional
from dotenv import load_dotenv
import requests

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model to use - DeepSeek R1 or DeepSeek Chat
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek/deepseek-chat")  # or "deepseek/deepseek-r1"


def call_deepseek(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Call DeepSeek via OpenRouter API for chat completion.
    
    Args:
        prompt: User prompt/question
        system_prompt: Optional system instruction
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens in response
        
    Returns:
        Response text from DeepSeek
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError(
            "OPENROUTER_API_KEY environment variable is not set. "
            "Set your OpenRouter API key in the .env file."
        )
    
    try:
        # Build messages array
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # Make direct HTTP request to OpenRouter API
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/yourusername/nyayai",  # Optional
            "X-Title": "NyayAI Legal Assistant",  # Optional
        }
        
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        response = requests.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,
        )
        
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        
        if not data.get("choices") or len(data["choices"]) == 0:
            raise RuntimeError("OpenRouter API returned empty response")
        
        return data["choices"][0]["message"]["content"].strip()
        
    except Exception as e:
        error_msg = str(e)
        print(f"OpenRouter API error details: {error_msg}")
        print(f"Error type: {type(e).__name__}")
        raise RuntimeError(f"OpenRouter API error: {error_msg}")


def translate_text(text: str, target_language: str, source_language: Optional[str] = None) -> str:
    """
    Translate text to target language using DeepSeek via OpenRouter.
    
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
    
    prompt = f"""Translate the following text to {target}. Keep the meaning and tone exactly the same. Only return the translated text, no explanations.

Text to translate:
{text}

Translated text:"""
    
    return call_deepseek(prompt, temperature=0.3)

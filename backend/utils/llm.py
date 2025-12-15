import os
from typing import Optional

from huggingface_hub import InferenceClient


HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")


def _get_client() -> InferenceClient:
    """
    Create a Hugging Face InferenceClient for the configured model.

    Expects HUGGINGFACEHUB_API_TOKEN to be set in the environment.
    """
    token = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    if not token:
        raise RuntimeError(
            "HUGGINGFACEHUB_API_TOKEN environment variable is not set. "
            "Create a Hugging Face access token and set it before starting the backend."
        )
    return InferenceClient(model=HF_MODEL_NAME, token=token)


def call_llm(
    prompt: str,
    max_new_tokens: int = 1024,
    temperature: float = 0.2,
    system_prompt: Optional[str] = None,
) -> str:
    """
    Call the configured Qwen model as a conversational/chat model.

    Uses the Hugging Face InferenceClient.chat_completion API, which is
    the supported interface for Qwen2.5-7B-Instruct on the Inference API.
    """
    client = _get_client()

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    completion = client.chat_completion(
        messages=messages,
        max_tokens=max_new_tokens,
        temperature=temperature,
    )

    # completion.choices[0].message is a dict like {"role": "assistant", "content": "..."}
    message = completion.choices[0].message
    # Support both dict-style and attribute-style depending on library version
    if isinstance(message, dict):
        return message.get("content", "")
    return getattr(message, "content", "")



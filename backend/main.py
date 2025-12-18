import os
from dotenv import load_dotenv
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import pdfplumber
from gtts import gTTS

# Import all agents
from agents.document_agent import run as document_agent
from agents.legal_agent import run as legal_agent
from agents.simplify_agent import run as simplify_agent
from agents.risk_agent import run as risk_agent
from agents.next_steps_agent import run as next_agent
from agents.qa_agent import run as qa_agent
from utils.openrouter import translate_text

load_dotenv()

HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

if not HUGGINGFACEHUB_API_TOKEN:
    raise RuntimeError("HUGGINGFACEHUB_API_TOKEN not found in environment or .env")


app = FastAPI(
    title="Legal Document Analyzer",
    description="Backend API with PDF extraction and multi-agent analysis",
    version="1.0.0"
)

# Allow frontend (Next.js / React dev server) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def root():
    return {"status": "backend running"}

# PDF upload + text extraction
@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    text = ""
    with pdfplumber.open(file.file) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return {"extracted_text": text}

# Multi-agent analysis endpoint
@app.post("/analyze")
async def analyze(document: dict):
    if "text" not in document:
        return {"error": "Missing 'text' field in JSON body"}

    text = document["text"]

    # Run all agents in sequence
    doc_info = document_agent(text)
    law_info = legal_agent(doc_info)
    simple_info = simplify_agent(doc_info)
    risk_info = risk_agent(doc_info)
    next_info = next_agent(doc_info)

    return {
        "document_info": doc_info,
        "legal_mapping": law_info,
        "simplified": simple_info,
        "risks": risk_info,
        "next_steps": next_info,
        "disclaimer": "Informational only, not legal advice."
    }


# Chat/QA endpoint
class ChatRequest(BaseModel):
    question: str
    document_info: dict
    language: str = "en"


@app.post("/chat")
async def chat(request: ChatRequest):
    """Answer questions about the legal document"""
    try:
        result = qa_agent(
            question=request.question,
            document_info=request.document_info,
            language=request.language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


# Translation endpoint
class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: str = None


@app.post("/translate")
async def translate(request: TranslateRequest):
    """Translate text to target language"""
    try:
        translated = translate_text(
            text=request.text,
            target_language=request.target_language,
            source_language=request.source_language
        )
        return {"translated_text": translated, "target_language": request.target_language}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


# Text-to-Speech endpoint
class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@app.post("/text-to-speech")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using gTTS"""
    try:
        # Map language codes to gTTS language codes
        lang_map = {
            "en": "en",
            "hi": "hi",
            "te": "te"
        }
        gtts_lang = lang_map.get(request.language, "en")
        
        tts = gTTS(text=request.text, lang=gtts_lang, slow=False)
        
        # Save to BytesIO buffer
        audio_buffer = BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")

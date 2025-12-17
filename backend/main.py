import os
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber

# Import all agents
from agents.document_agent import run as document_agent
from agents.legal_agent import run as legal_agent
from agents.simplify_agent import run as simplify_agent
from agents.risk_agent import run as risk_agent
from agents.next_steps_agent import run as next_agent

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

import os
from dotenv import load_dotenv
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import pdfplumber
from gtts import gTTS
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import HexColor
from datetime import datetime

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


# PDF Download endpoint
class PDFRequest(BaseModel):
    document_info: dict
    legal_mapping: dict = None
    simplified: dict = None
    risks: dict = None
    next_steps: dict = None


@app.post("/download-pdf")
async def download_pdf(request: dict):
    """Generate and download PDF report of analysis"""
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=HexColor('#dc2626'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=HexColor('#991b1b'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        normal_style = styles['Normal']
        normal_style.fontSize = 10
        normal_style.leading = 14
        
        story = []
        
        # Title
        story.append(Paragraph("NyayAI Legal Document Analysis Report", title_style))
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Document Summary
        doc_info = request.get('document_info', {})
        if doc_info:
            story.append(Paragraph("Document Summary", heading_style))
            if doc_info.get('summary'):
                story.append(Paragraph(doc_info['summary'], normal_style))
            if doc_info.get('document_type'):
                story.append(Paragraph(f"<b>Document Type:</b> {doc_info['document_type']}", normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Risk Assessment
        risks = request.get('risks', {})
        if risks and risks.get('overall_risk'):
            story.append(Paragraph("Risk Assessment", heading_style))
            story.append(Paragraph(f"<b>Overall Risk Level:</b> {risks['overall_risk']}", normal_style))
            if risks.get('risk_factors'):
                story.append(Paragraph("<b>Risk Factors:</b>", normal_style))
                for factor in risks['risk_factors']:
                    story.append(Paragraph(f"• {factor}", normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Simplified Clauses
        simplified = request.get('simplified', {})
        if simplified and simplified.get('simplified_clauses'):
            story.append(Paragraph("Simplified Explanations", heading_style))
            for clause in simplified['simplified_clauses']:
                if clause.get('simple_explanation_en'):
                    story.append(Paragraph(f"<b>Clause {clause.get('clause_id', 'N/A')}:</b>", normal_style))
                    story.append(Paragraph(clause['simple_explanation_en'], normal_style))
                    if clause.get('why_it_matters'):
                        story.append(Paragraph(f"<b>Why it matters:</b> {clause['why_it_matters']}", normal_style))
                    story.append(Spacer(1, 0.15*inch))
            story.append(Spacer(1, 0.2*inch))
        
        # Next Steps
        next_steps = request.get('next_steps', {})
        if next_steps and next_steps.get('next_steps'):
            story.append(Paragraph("Recommended Next Steps", heading_style))
            for i, step in enumerate(next_steps['next_steps'], 1):
                story.append(Paragraph(f"{i}. {step}", normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Legal Mapping
        legal_mapping = request.get('legal_mapping', {})
        if legal_mapping and legal_mapping.get('mapped_laws'):
            story.append(Paragraph("Relevant Laws", heading_style))
            for item in legal_mapping['mapped_laws']:
                if item.get('clause_id'):
                    story.append(Paragraph(f"<b>Clause {item['clause_id']}:</b>", normal_style))
                if item.get('related_laws'):
                    for law in item['related_laws']:
                        story.append(Paragraph(f"• {law}", normal_style))
            story.append(Spacer(1, 0.2*inch))
        
        # Disclaimer
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("<i>This is an informational report only and does not constitute legal advice.</i>", normal_style))
        
        doc.build(story)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=NyayAI-Report-{datetime.now().strftime('%Y%m%d')}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

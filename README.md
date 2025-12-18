# NyayAI – Legal Document Intelligence System

NyayAI is a **multi‑agent AI system** designed to help users understand legal documents **before signing them**. It analyzes legal PDFs, simplifies complex clauses, detects risks, and enables **multilingual, voice‑enabled question answering** over the document.

Built for real‑world **Indian legal contexts**, NyayAI focuses on **accessibility, prevention, and informed consent**.

---

## Problem Statement

Legal documents in India are often:

* Written in complex, lawyer‑centric language
* Mostly available only in English
* Expensive to interpret through professional consultation
* Signed under pressure due to power imbalance

As a result, individuals frequently sign documents **without understanding hidden obligations, financial liabilities, or legal risks**.

---

## Solution Overview

NyayAI acts as a **first‑level legal intelligence layer**.

Instead of giving legal advice, it:

* Explains documents in **plain language**
* Flags **risky or one‑sided clauses**
* Allows users to ask **natural‑language questions**
* Supports **regional languages and voice input**

The system is designed to be **assistive, modular, and scalable**, not a replacement for lawyers.

---

## Core Features

* 📄 Legal PDF Upload & Parsing
* 🧠 Plain‑Language Document Summary
* ⚠️ Important Clause & Risk Detection
* 💬 Context‑Aware Q/A Chat Interface
* 🌐 Multilingual Support (English, Hindi, Telugu)
* 🎙️ Voice‑Based Interaction (STT & TTS)
* 🤖 Multi‑Agent AI Architecture
* 🗂️ PDF Report Download

---

## Technical Architecture

NyayAI is built using a **multi‑agent pipeline**, where each agent has a clearly defined responsibility.

### Agent Breakdown

* **Document Parsing Agent**
  Extracts and structures text from uploaded legal PDFs.

* **Legal Understanding Agent**
  Interprets clauses, obligations, roles, and legal intent.

* **Risk Detection Agent**
  Identifies potentially risky, one‑sided, or critical clauses (e.g., termination, penalties).

* **Q/A Agent**
  Handles user questions by retrieving relevant context and generating accurate responses.

* **Language & Voice Agent**
  Manages translation, speech‑to‑text (STT), and text‑to‑speech (TTS).

This modular design improves **accuracy, maintainability, and scalability**.

---

## Tech Stack

### Backend & APIs

* FastAPI (Python) — API framework and orchestration
* Uvicorn — ASGI server

### AI & NLP

* LLMs (via OpenRouter) — Legal understanding, summarization, Q/A
* Multi‑Agent Architecture — Task‑specific AI agents

### Document Processing

* pdfplumber
* pdfminer

### Multilingual & Voice

* SpeechRecognition — Speech‑to‑Text (STT)
* gTTS — Text‑to‑Speech (TTS)
* Translation APIs

### Frontend

* React.js
* Tailwind CSS

---

## Setup & Installation

### Prerequisites

* Python 3.9+
* Git
* Virtual environment (recommended)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/surohitasnigdha1/NyayAI.git
cd NyayAI
```

### 2️⃣ Create & Activate Virtual Environment

```bash
python -m venv venv
venv\Scripts\activate
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣ Environment Variables

Create a `.env` file and add:

```env
HUGGINGFACEHUB_API_TOKEN = your_token_here
OPENROUTER_API_KEY= your_api_key_here
DEEPSEEK_MODEL=deepseek/deepseek-chat
```

### 5️⃣ Run the Backend

```bash
uvicorn main:app --reload
```

Backend will be available at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### 6️⃣ Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Example Use Cases

* Reviewing rental agreements
* Checking employment offer letters
* Understanding gig‑worker contracts
* Evaluating vendor or partnership terms
* First‑time legal document signing

---

## ⚠️ Disclaimer

NyayAI is an **assistive legal awareness tool**.

It does **not provide legal advice** and should not replace professional legal consultation.

---

## Team & Hackathon

Built for **Vibehacks 2.0**
**Team:** The Drowning Duo

Focused on **real‑world impact, accessibility, and technical depth**.

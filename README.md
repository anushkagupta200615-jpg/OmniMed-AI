# 🩺 OmniMed AI

OmniMed AI is a next-generation medical analysis platform designed to bridge the gap between patient symptoms and complex medical data. Utilizing a multi-agent AI architecture powered by Google Gemini, the platform provides interactive symptom triage, automates the extraction of clinical findings from medical scans, and generates comprehensive, easy-to-understand clinical reports.

**🌍 Live Demo:** [https://omnimed-ai-omnimed-frontend.onrender.com](https://omnimed-ai-omnimed-frontend.onrender.com)
*(Backend API hosted at: https://omnimed-ai-omnimed-backend.onrender.com)*

## ✨ Key Features

* **💬 Interactive AI Consultation (Voice Enabled):** A triage interface that listens to your symptoms via microphone and speaks back in multiple languages.
* **🌍 Global Multi-Language Support:** Full translation and localization across 5 languages (English, Spanish, Hindi, Chinese, French) for both voice and generated reports.
* **🤖 Multi-Agent Architecture:** A system of FOUR specialized AI agents working together to extract, analyze, validate, and plan medical data.
* **📚 RAG Knowledge Base:** Train the AI on custom medical textbooks (PDFs). The Chat Assistant uses Retrieval-Augmented Generation to search this database and provide highly accurate answers.
* **🥦 Lifestyle & Treatment Planner:** A dedicated agent that generates personalized dietary, exercise, and precaution plans based on the final diagnosis.
* **🔐 Patient History Database:** An integrated SQLite database that permanently saves all generated reports for future reference.
* **📄 Automated Clinical Reports:** Instantly generates a clean, readable dashboard with risk scores, identified conditions, and recommended next steps.
* **🎨 Premium UI/UX:** Built with a modern, responsive, and accessible glassmorphic design system.

## 🏛️ Architecture

```mermaid
flowchart TD
    User([User]) -->|"Symptoms (Voice/Text)"| Triage[AI Triage Chatbot]
    Triage -->|Uploads PDF/Image| Frontend[React Frontend]
    
    Frontend -->|Multipart Form Data| Backend[Flask API]
    
    Backend --> Extractor[Agent 1: Extractor]
    Extractor -->|Extracts Text & Findings| Analyst[Agent 2: Analyst]
    Analyst -->|Generates Clinical Report| Validator[Agent 3: Validator]
    Validator -->|Checks for Hallucinations| Planner[Agent 4: Lifestyle Planner]
    Planner -->|Creates Diet/Exercise Plan| Backend
    
    Backend -->|Streams NDJSON| Frontend
    Backend -->|Saves to SQLite| Database[(History DB)]
    
    Frontend -->|Renders| ReportUI[Clinical Report Viewer]
    ReportUI -->|Exports| PDF[PDF Download]
    
    KnowledgeBase([Knowledge Base]) -->|Upload PDF| Backend
    Backend -->|Generates Embeddings| VectorDB[(SQLite Vector Store)]
    User -->|Asks Question| Chatbot[AI Chat Assistant]
    Chatbot -->|Cosine Similarity Search| VectorDB
    VectorDB -->|Retrieves Textbooks| Chatbot
```

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Vanilla CSS (Light Mode / Glassmorphism)
* `lucide-react` (Icons)
* `html2pdf.js` (Report Export)

**Backend:**
* Python (Flask)
* `google-genai` (Gemini 2.5 Flash API & text-embedding-004)
* `PyPDF2` (Document Parsing for Scans and Knowledge Base)
* `numpy` (Cosine Similarity for Vector Search)
* `sqlite3` (Patient History & Vector Database)
* `flask-cors` (API Routing)

## 🚀 Getting Started

### 1. Start the Backend
Navigate to the backend directory, install the Python dependencies, and add your Google Gemini API key to a `.env` file (`GEMINI_API_KEY=your_key`).
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2. Start the Frontend
Navigate to the frontend directory, install the Node dependencies, and run the development server.
```bash
cd frontend
npm install
npm run dev
```

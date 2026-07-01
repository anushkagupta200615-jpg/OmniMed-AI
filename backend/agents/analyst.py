import os
import json
import google.genai as genai
import traceback

try:
    from agents.rag import search_knowledge_base
except ImportError:
    try:
        from .rag import search_knowledge_base
    except ImportError:
        search_knowledge_base = None

def get_client():
    return genai.Client()

def triage_symptoms(symptoms, language="English"):
    """Analyzes symptoms to recommend needed scans/documents."""
    try:
        client = get_client()
        prompt = f"""You are a Medical Triage AI. Analyze these symptoms: "{symptoms}"
Please provide your entire response in {language}.
Determine:
1. Suspected category (e.g. Hematology, Pulmonology)
2. Required files (e.g. blood_report_pdf, chest_xray). Leave empty if you don't have enough information.
3. Follow-up questions. IMPORTANT: If the user just says a greeting (like "hello"), or if the symptoms are too vague, you MUST provide at least one follow-up question asking them to describe their symptoms in detail. DO NOT recommend files if you don't know the symptoms.
Return ONLY valid JSON:
{{
  "suspected_category": "string",
  "required_files": ["string"],
  "follow_up_questions": ["string"],
  "reasoning": "string"
}}"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        
        return json.loads(text.strip())
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

def analyze_scan(extracted_text, patient_data, language="English"):
    """Generates the clinical report from extracted text."""
    try:
        client = get_client()
        prompt = f"""You are an Expert Medical Analyst.
Review the extracted findings and patient data, and generate a comprehensive clinical report.
Please provide your entire response in {language}.

Patient Data: {json.dumps(patient_data)}
Extracted Findings: {extracted_text}

Provide output as JSON matching this structure:
{{
  "image_type": "string",
  "body_region": "string",
  "findings": ["string"],
  "cancer_risk": {{
    "risk_score": 0-100,
    "risk_level": "Low/Medium/High",
    "suspected_type": "string",
    "reasoning": "string"
  }},
  "conditions": ["string"],
  "next_steps": ["string"]
}}"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        
        report = json.loads(text.strip())
        return {"success": True, "report": report}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def get_chat_response(message, context, language="English"):
    """Provides a chat response based on context and RAG."""
    import time
    try:
        # RAG: Only search if knowledge base actually has data (avoids wasting API quota on embeddings)
        kb_context = ""
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'database.db')
            conn = sqlite3.connect(db_path)
            count = conn.execute("SELECT COUNT(*) FROM knowledge_base").fetchone()[0]
            conn.close()
            if count > 0 and callable(search_knowledge_base):
                kb_results = search_knowledge_base(message, top_k=3)
                if kb_results:
                    kb_context = "\n\nVerified Medical Knowledge:\n" + "\n".join(kb_results)
        except Exception:
            kb_context = ""

        client = get_client()
        prompt = f"""You are OmniMed AI, a highly capable medical assistant built by Anushka Gupta.
You MUST answer every question the user asks. You are a helpful medical AI that can discuss any health topic.
You can understand questions in any language, Romanized text (like Hinglish), and text with typos.

RULES:
1. Always reply in {language}.
2. If the user writes in Hindi (even Roman script like "mujhe pet me dard hai"), reply in Hindi.
3. Understand typos and spelling errors — never refuse to answer because of them.
4. If asked who built you: "I was developed by Anushka Gupta."
5. Answer ALL medical and health questions with detailed, helpful information.
6. Be empathetic, clear and helpful. Give actionable advice.
{kb_context}

Report Context: {context}

User: {message}"""
        # Try lightest model first (most available), then scale up
        response = None
        last_error = ""
        for model in ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash']:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                break
            except Exception as e:
                last_error = str(e)
                time.sleep(1)  # small delay before retry to avoid rate limit
                continue

        if response is None:
            raise Exception(f"All models unavailable. Last API error: {last_error}")
        return response.text.strip()
    except Exception as e:
        import traceback
        traceback.print_exc()
        # TEMPORARY DEBUG: return the exact error message to the user
        return f"DEBUG ERROR: {str(e)}"

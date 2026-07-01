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
    try:
        # 1. Search Knowledge Base (RAG) - fail gracefully if unavailable
        kb_context = "No relevant medical textbooks found in local database."
        try:
            if search_knowledge_base:
                kb_results = search_knowledge_base(message, top_k=3)
                if kb_results:
                    kb_context = "\n".join(kb_results)
        except Exception:
            pass  # RAG failure should never block the chat

        client = get_client()
        prompt = f"""You are OmniMed AI, a medical assistant built by Anushka Gupta.
Answer the user's question clearly, empathetically and helpfully using the context below.
Please provide your ENTIRE response in {language} — this is very important.
If the user asks who made you, who trained you, or who your developer is, say: "I was developed and trained by Anushka Gupta."
If the user types in Hindi or any other language, reply in that same language.

Verified Medical Knowledge:
{kb_context}

Report Context: {context}

User Question: {message}"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        traceback.print_exc()
        return "I apologize, but I am unable to process your request at the moment."

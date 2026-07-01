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
        # 1. Search Knowledge Base (RAG) - completely optional, skip silently if anything fails
        kb_context = ""
        try:
            if callable(search_knowledge_base):
                kb_results = search_knowledge_base(message, top_k=3)
                if kb_results:
                    kb_context = "\n\nVerified Medical Knowledge:\n" + "\n".join(kb_results)
        except Exception:
            kb_context = ""  # RAG failure silently ignored

        client = get_client()
        prompt = f"""You are OmniMed AI, a highly capable medical assistant built by Anushka Gupta.
You can understand questions written in any language, Romanized/transliterated text (like Hinglish), and text with spelling mistakes or typos.

IMPORTANT RULES:
- Always reply in {language}.
- If the user writes in Hindi (even in Roman script like "mujhe pet me dard hai"), reply in Hindi.
- If the user writes with spelling errors or typos, understand the meaning and answer helpfully anyway.
- Never refuse to answer due to typos, spelling errors, or mixed languages.
- If asked who built you: "I was developed by Anushka Gupta."
- Be empathetic, clear and helpful.
{kb_context}

Patient Report Context: {context}

User Question: {message}"""
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
        except Exception:
            # Fallback to gemini-2.0-flash if 2.5-flash is unavailable
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
        return response.text.strip()
    except Exception as e:
        traceback.print_exc()
        # Return an error message that matches the language
        if language == 'हिन्दी':
            return "क्षमा करें, अभी सेवा उपलब्ध नहीं है। कृपया दोबारा कोशिश करें।"
        elif language == 'Español':
            return "Lo siento, el servicio no está disponible en este momento. Por favor, inténtalo de nuevo."
        elif language == 'Français':
            return "Désolé, le service n'est pas disponible en ce moment. Veuillez réessayer."
        elif language == '中文':
            return "抱歉，服务暂时不可用，请稍后再试。"
        else:
            return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment."

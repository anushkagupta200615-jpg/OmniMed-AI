import os
import json
import google.genai as genai
import traceback

def get_client():
    return genai.Client()

def triage_symptoms(symptoms):
    """Analyzes symptoms to recommend needed scans/documents."""
    try:
        client = get_client()
        prompt = f"""You are a Medical Triage AI. Analyze these symptoms: "{symptoms}"
Determine:
1. Suspected category (e.g. Hematology, Pulmonology)
2. Required files (e.g. blood_report_pdf, chest_xray)
3. Follow-up questions
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

def analyze_scan(extracted_text, patient_data):
    """Generates the clinical report from extracted text."""
    try:
        client = get_client()
        prompt = f"""You are an Expert Medical Analyst.
Review the extracted findings and patient data, and generate a comprehensive clinical report.

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

def get_chat_response(message, context):
    """Provides a chat response based on context. Stub for RAG."""
    try:
        client = get_client()
        prompt = f"""You are OmniMed AI, a medical assistant. 
Use the following report context to answer the user's question clearly and empathetically.

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

import os
import json
import google.genai as genai
import traceback

def get_client():
    return genai.Client()

def validate_report(report):
    """Validates the generated report to check for AI hallucinations."""
    try:
        client = get_client()
        prompt = f"""You are a Medical Validator AI.
Review this generated clinical report for logical consistency and potential AI hallucinations.
Assess a confidence score (0-100) based on how reliable the findings and risk assessment appear.

Report: {json.dumps(report)}

Return ONLY valid JSON matching this structure:
{{
  "reliability_score": 0-100,
  "flagged_issues": ["string"],
  "validation_notes": "string"
}}"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        
        validation = json.loads(text.strip())
        return {"success": True, "validation": validation}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

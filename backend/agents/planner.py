import os
import json
import google.genai as genai
import traceback

def get_client():
    return genai.Client()

def generate_lifestyle_plan(report, language="English"):
    """Generates a lifestyle and treatment plan based on the clinical report."""
    try:
        client = get_client()
        prompt = f"""You are a Medical Lifestyle and Treatment Planner AI.
Review the following clinical report and generate a personalized, actionable lifestyle, diet, and exercise plan.
Write the response in {language}.

Clinical Report:
{json.dumps(report)}

Provide output as JSON matching this exact structure:
{{
  "dietary_recommendations": ["string"],
  "exercise_plan": ["string"],
  "lifestyle_changes": ["string"],
  "precautions": ["string"],
  "weekly_schedule": [
    {{
      "day": "string (e.g., Monday)",
      "morning_routine": "string",
      "afternoon_routine": "string",
      "evening_routine": "string"
    }}
  ],
  "recommended_specialist": "string (e.g. Cardiologist, Dermatologist, General Physician)",
  "summary": "string"
}}"""
        # Using gemini-2.0-flash as it's the standard for v1beta API
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.endswith("```"): text = text[:-3]
        
        plan = json.loads(text.strip())
        return {"success": True, "plan": plan}
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

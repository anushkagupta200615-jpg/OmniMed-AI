import os
import google.genai as genai
from google.genai import types
import traceback

def get_client():
    # Will use default credentials if set, or just API key
    return genai.Client()

def extract_from_image(image_bytes):
    """Uses Gemini Vision to extract findings from an image scan."""
    try:
        client = get_client()
        
        prompt = """You are a highly skilled Medical Imaging Extractor AI.
Analyze this medical image (X-Ray, MRI, CT, or visual scan) and extract clinical findings.
DO NOT provide a diagnosis. Only extract structural observations, anomalies, measurements, and visible characteristics.
Structure your output clearly."""

        # Assuming the image is a jpeg for simplicity in this mock
        image_part = types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, image_part]
        )
        
        return {
            "success": True,
            "extracted_text": response.text.strip()
        }
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def extract_from_pdf(pdf_bytes):
    """Uses Gemini to extract findings from a PDF report."""
    try:
        client = get_client()
        
        prompt = """You are a highly skilled Medical Data Extractor AI.
Extract all clinical values, test results, and noted anomalies from this medical document.
Structure your output clearly with key-value pairs where possible."""

        pdf_part = types.Part.from_bytes(data=pdf_bytes, mime_type='application/pdf')
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, pdf_part]
        )
        
        return {
            "success": True,
            "extracted_text": response.text.strip()
        }
    except Exception as e:
        traceback.print_exc()
        return {"success": False, "error": str(e)}

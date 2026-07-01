import os
import json
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

from agents.extractor import extract_from_image, extract_from_pdf
from agents.analyst import analyze_scan, get_chat_response
from agents.validator import validate_report

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "OmniMed AI API",
        "version": "1.0.0"
    })

@app.route('/api/triage', methods=['POST'])
def triage():
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', '')
        if not symptoms:
            return jsonify({"success": False, "error": "No symptoms provided"}), 400
            
        # Simplified triage logic calling Gemini (mocked for now, will implement in analyst)
        # Using the unified analyst agent to handle this
        from agents.analyst import triage_symptoms
        result = triage_symptoms(symptoms)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    # Similar generator streaming approach as CancerLens-AI
    try:
        if 'scan_file' not in request.files:
            return jsonify({"success": False, "error": "No scan file provided"}), 400
            
        scan_file = request.files['scan_file']
        patient_data = request.form.to_dict()
        
        file_bytes = scan_file.read()
        is_pdf = scan_file.filename.lower().endswith('.pdf')
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

    def generate():
        try:
            extracted_text = ""
            yield json.dumps({"status": "extracting", "message": "Agent 1: Extracting clinical data..."}) + "\n"
            
            if is_pdf:
                extract_res = extract_from_pdf(file_bytes)
            else:
                extract_res = extract_from_image(file_bytes)
                
            if not extract_res['success']:
                yield json.dumps({"success": False, "error": extract_res.get('error')}) + "\n"
                return
                
            extracted_text = extract_res['extracted_text']
            
            yield json.dumps({"status": "analyzing", "message": "Agent 2: Generating clinical report..."}) + "\n"
            analyst_res = analyze_scan(extracted_text, patient_data)
            
            if not analyst_res['success']:
                yield json.dumps({"success": False, "error": analyst_res.get('error')}) + "\n"
                return
                
            report = analyst_res['report']
            
            yield json.dumps({"status": "validating", "message": "Agent 3: Validating report findings..."}) + "\n"
            validator_res = validate_report(report)
            
            yield json.dumps({
                "success": True,
                "status": "complete",
                "extractor_output": extracted_text,
                "report": report,
                "validation": validator_res.get('validation', {})
            }) + "\n"
            
        except Exception as e:
            yield json.dumps({"success": False, "error": str(e)}) + "\n"

    return Response(generate(), mimetype='application/x-ndjson')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        context = data.get('context', '')
        
        if not message:
            return jsonify({"success": False, "error": "No message provided"}), 400
            
        reply = get_chat_response(message, context)
        return jsonify({"success": True, "reply": reply})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)

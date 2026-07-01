import os
import json
import sqlite3
import datetime
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

from agents.extractor import extract_from_image, extract_from_pdf
from agents.analyst import analyze_scan, get_chat_response, triage_symptoms
from agents.validator import validate_report
from agents.planner import generate_lifestyle_plan
from agents.rag import add_to_knowledge_base
import PyPDF2
import io

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  report TEXT,
                  validation TEXT,
                  lifestyle_plan TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS knowledge_base
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT,
                  content TEXT,
                  embedding TEXT)''')
    conn.commit()
    conn.close()

init_db()

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
        language = data.get('language', 'English')
        if not symptoms:
            return jsonify({"success": False, "error": "No symptoms provided"}), 400
            
        result = triage_symptoms(symptoms, language)
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
        language = request.form.get('language', 'English')
        
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
            analyst_res = analyze_scan(extracted_text, patient_data, language)
            
            if not analyst_res['success']:
                yield json.dumps({"success": False, "error": analyst_res.get('error')}) + "\n"
                return
                
            report = analyst_res['report']
            
            yield json.dumps({"status": "validating", "message": "Agent 3: Validating report findings..."}) + "\n"
            validator_res = validate_report(report)

            yield json.dumps({"status": "planning", "message": "Agent 4: Generating lifestyle plan..."}) + "\n"
            planner_res = generate_lifestyle_plan(report, language)
            plan = planner_res.get('plan', {}) if planner_res['success'] else {}
            
            yield json.dumps({
                "success": True,
                "status": "complete",
                "extractor_output": extracted_text,
                "report": report,
                "validation": validator_res.get('validation', {}),
                "lifestyle_plan": plan
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
        language = data.get('language', 'English')
        
        if not message:
            return jsonify({"success": False, "error": "No message provided"}), 400
            
        reply = get_chat_response(message, context, language)
        return jsonify({"success": True, "reply": reply})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/history', methods=['GET', 'POST'])
def history():
    try:
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        
        if request.method == 'POST':
            data = request.get_json()
            timestamp = datetime.datetime.now().isoformat()
            report = json.dumps(data.get('report', {}))
            validation = json.dumps(data.get('validation', {}))
            lifestyle_plan = json.dumps(data.get('lifestyle_plan', {}))
            
            c.execute("INSERT INTO history (timestamp, report, validation, lifestyle_plan) VALUES (?, ?, ?, ?)",
                      (timestamp, report, validation, lifestyle_plan))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Saved to history"})
            
        elif request.method == 'GET':
            c.execute("SELECT id, timestamp, report, validation, lifestyle_plan FROM history ORDER BY timestamp DESC")
            rows = c.fetchall()
            conn.close()
            
            history_list = []
            for row in rows:
                history_list.append({
                    "id": row[0],
                    "timestamp": row[1],
                    "report": json.loads(row[2]),
                    "validation": json.loads(row[3]),
                    "lifestyle_plan": json.loads(row[4])
                })
            return jsonify({"success": True, "history": history_list})
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/knowledge/upload', methods=['POST'])
def upload_knowledge():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file part"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No selected file"}), 400
            
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"success": False, "error": "Only PDFs are supported for knowledge base"}), 400

        # Read PDF
        file_bytes = file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"

        # Chunk the text (approx 500 characters per chunk)
        # We'll split by double newline first to preserve paragraphs, then chunk.
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            if len(current_chunk) + len(p) < 1000:
                current_chunk += p + "\n\n"
            else:
                chunks.append(current_chunk.strip())
                current_chunk = p + "\n\n"
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        # Save to DB
        success = add_to_knowledge_base(file.filename, chunks)
        
        if success:
            return jsonify({"success": True, "message": f"Successfully processed {len(chunks)} knowledge chunks from {file.filename}."})
        else:
            return jsonify({"success": False, "error": "Failed to process embeddings."}), 500
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)

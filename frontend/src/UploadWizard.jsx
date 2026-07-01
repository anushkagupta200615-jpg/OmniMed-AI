import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, ChevronRight, Activity, File, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import ReportViewer from './ReportViewer'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = SpeechRecognition ? new SpeechRecognition() : null
if (recognition) {
  recognition.continuous = false
  recognition.interimResults = false
}

function UploadWizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [triageMessages, setTriageMessages] = useState([
    { role: 'assistant', content: "Let's get started. Tell me what brings you in today." }
  ])
  const [triageInput, setTriageInput] = useState('')
  const [isTriaging, setIsTriaging] = useState(false)
  const [showUploadButton, setShowUploadButton] = useState(false)
  
  // Voice states
  const [isListening, setIsListening] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  
  // Analysis state
  const [analysisStatus, setAnalysisStatus] = useState("Initializing...")
  const [reportData, setReportData] = useState(null)
  const [validationData, setValidationData] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (ttsEnabled && step === 1) {
      speakMessage(triageMessages[triageMessages.length - 1].content)
    }
  }, [triageMessages, ttsEnabled, step])

  const speakMessage = (text) => {
    if (!window.speechSynthesis || !ttsEnabled) return
    window.speechSynthesis.cancel() // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    window.speechSynthesis.speak(utterance)
  }

  const toggleListen = () => {
    if (!recognition) return alert("Your browser doesn't support speech recognition.")
    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setTriageInput(prev => prev ? prev + ' ' + transcript : transcript)
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
    }
  }

  const handleTriageSend = async () => {
    if (!triageInput.trim()) return
    window.speechSynthesis.cancel() // Stop speaking if user interrupts
    
    const userMsg = triageInput
    setTriageMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setTriageInput('')
    setIsTriaging(true)

    try {
      const allSymptoms = triageMessages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ') + ' ' + userMsg

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_BASE}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: allSymptoms })
      })
      const data = await res.json()
      
      if (data.success && data.data) {
        const triageResult = data.data
        if (triageResult.follow_up_questions && triageResult.follow_up_questions.length > 0 && triageMessages.length < 5) {
          // Ask follow up
          setTriageMessages(prev => [...prev, { role: 'assistant', content: triageResult.follow_up_questions[0] }])
        } else {
          // Conclude and show button
          const filesText = (triageResult.required_files || ['medical documents']).join(' and ').replace(/_/g, ' ')
          setTriageMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Great! I've understood your symptoms. Based on what you've told me, I recommend uploading ${filesText} for a comprehensive analysis. Click the button below when you're ready to proceed.` 
          }])
          setShowUploadButton(true)
        }
      } else {
        setTriageMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble analyzing that. Click proceed when you are ready to upload your files." }])
        setShowUploadButton(true)
      }
    } catch (e) {
      setTriageMessages(prev => [...prev, { role: 'assistant', content: "I couldn't reach the server. Let's proceed to uploads." }])
      setShowUploadButton(true)
    } finally {
      setIsTriaging(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    if (!file) return
    window.speechSynthesis.cancel()
    setStep(3)
    setAnalysisStatus("Uploading file to secure server...")

    const allSymptoms = triageMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')

    const formData = new FormData()
    formData.append('scan_file', file)
    formData.append('symptoms', allSymptoms)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: formData
      })
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        
        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line)
            if (parsed.message) {
              setAnalysisStatus(parsed.message)
            }
            if (parsed.success === false) {
              setAnalysisStatus("Error: " + parsed.error)
              return
            }
            if (parsed.status === 'complete') {
              setReportData(parsed.report)
              setValidationData(parsed.validation)
              setStep(4)
              if (onComplete) onComplete(parsed.report)
            }
          }
        }
      }
    } catch (e) {
      setAnalysisStatus("Failed to connect to server: " + e.message)
    }
  }

  if (step === 4) {
    return <ReportViewer report={reportData} validation={validationData} onChat={() => alert('Chat integration ready!')} />
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ color: step >= 1 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>1. Symptoms</div>
        <div style={{ color: step >= 2 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>2. Upload</div>
        <div style={{ color: step >= 3 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>3. Analysis</div>
      </div>
      
      {step === 1 && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
            <h2 style={{ margin: 0 }}>AI Clinical Consultation</h2>
            <button 
              onClick={() => {
                setTtsEnabled(!ttsEnabled)
                if (ttsEnabled) window.speechSynthesis.cancel()
              }}
              style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: ttsEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              title="Toggle AI Voice"
            >
              {ttsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {triageMessages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '12px',
                maxWidth: '80%',
                border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
              }}>
                {msg.content}
              </div>
            ))}
            {isTriaging && (
              <div style={{ alignSelf: 'flex-start', padding: '12px 16px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div className="loader" style={{ width: '16px', height: '16px', borderTopColor: 'var(--text-secondary)' }}></div>
              </div>
            )}
            
            {showUploadButton && (
              <button 
                className="btn-primary" 
                style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                onClick={() => setStep(2)}
              >
                Proceed to Upload Documents
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
            <button 
              onClick={toggleListen}
              className="btn-secondary"
              style={{ 
                padding: '12px', 
                borderRadius: '50%', 
                background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                color: isListening ? 'var(--danger)' : 'var(--text-secondary)',
                border: isListening ? '1px solid var(--danger)' : '1px solid var(--border-color)'
              }}
              title="Dictate Symptoms"
            >
              {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
            </button>
            <input 
              type="text" 
              className="input-field" 
              placeholder={isListening ? "Listening..." : "Type your response..."}
              value={triageInput}
              onChange={(e) => setTriageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTriageSend()}
              disabled={showUploadButton}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleTriageSend} disabled={isTriaging || showUploadButton || (!triageInput.trim() && !isListening)}>
              Send
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="animate-fade-in">
          <h2 style={{ marginBottom: '16px' }}>Upload Medical Documents</h2>
          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed var(--accent-primary)', 
              borderRadius: '12px', 
              padding: '60px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(37, 99, 235, 0.02)'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept=".png,.jpg,.jpeg,.pdf"
            />
            {!file ? (
              <>
                <Upload size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
                <h3>Click to browse or drag & drop</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Supports JPG, PNG, PDF</p>
              </>
            ) : (
              <>
                <File size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
                <h3 style={{ color: 'var(--text-primary)' }}>{file.name}</h3>
                <p style={{ color: 'var(--success)' }}>Ready to analyze</p>
              </>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" onClick={handleAnalyze} disabled={!file}>
              Analyze Now <Activity size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="loader" style={{ margin: '0 auto 32px auto', width: '64px', height: '64px', borderTopColor: 'var(--accent-primary)' }}></div>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>{analysisStatus}</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            OmniMed AI uses a multi-agent system to extract, analyze, and validate your medical data against clinical guidelines.
          </p>
        </div>
      )}
    </div>
  )
}

export default UploadWizard

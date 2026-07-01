import { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Activity, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = SpeechRecognition ? new SpeechRecognition() : null
if (recognition) {
  recognition.continuous = false
  recognition.interimResults = false
}

function ChatAssistant({ reportContext, language, languageCode }) {
  const greetings = {
    'English': {
      withReport: 'Hello! I am OmniMed AI, your clinical consultation assistant. I have reviewed your report. How can I help you understand your results today?',
      standalone: 'Hello! I am OmniMed AI, your clinical consultation assistant. How can I help you with your health questions today?'
    },
    'Español': {
      withReport: '¡Hola! Soy OmniMed AI, tu asistente de consulta clínica. He revisado tu informe. ¿Cómo puedo ayudarte a entender tus resultados hoy?',
      standalone: '¡Hola! Soy OmniMed AI, tu asistente de consulta clínica. ¿Cómo puedo ayudarte con tus preguntas de salud hoy?'
    },
    'हिन्दी': {
      withReport: 'नमस्ते! मैं OmniMed AI हूँ, आपका क्लिनिकल सहायक। मैंने आपकी रिपोर्ट पढ़ ली है। आज मैं आपके परिणामों को समझने में कैसे मदद कर सकता हूँ?',
      standalone: 'नमस्ते! मैं OmniMed AI हूँ, आपका स्वास्थ्य सहायक। आज मैं आपकी स्वास्थ्य संबंधी किसी भी समस्या में कैसे मदद कर सकता हूँ?'
    },
    '中文': {
      withReport: '您好！我是 OmniMed AI，您的临床咨询助手。我已阅读您的报告。今天我如何帮助您理解您的结果？',
      standalone: '您好！我是 OmniMed AI，您的健康咨询助手。今天我如何帮助您解答健康问题？'
    },
    'Français': {
      withReport: 'Bonjour ! Je suis OmniMed AI, votre assistant de consultation clinique. J\'ai examiné votre rapport. Comment puis-je vous aider à comprendre vos résultats aujourd\'hui ?',
      standalone: 'Bonjour ! Je suis OmniMed AI, votre assistant de santé. Comment puis-je vous aider avec vos questions de santé aujourd\'hui ?'
    }
  }

  const langGreetings = greetings[language] || greetings['English']
  const initialMessage = reportContext ? langGreetings.withReport : langGreetings.standalone

  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialMessage }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  
  // Voice states
  const [isListening, setIsListening] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (ttsEnabled && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      speakMessage(messages[messages.length - 1].content)
    }
  }, [messages, ttsEnabled])

  useEffect(() => {
    if (recognition) recognition.lang = languageCode || 'en-US'
  }, [languageCode])

  // Reset conversation with correct greeting whenever language changes
  useEffect(() => {
    const langGreets = greetings[language] || greetings['English']
    const newGreeting = reportContext ? langGreets.withReport : langGreets.standalone
    setMessages([{ role: 'assistant', content: newGreeting }])
  }, [language])


  const speakMessage = (text) => {
    if (!window.speechSynthesis || !ttsEnabled) return
    window.speechSynthesis.cancel() // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageCode || 'en-US'
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
        setInput(prev => prev ? prev + ' ' + transcript : transcript)
        setIsListening(false)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    window.speechSynthesis.cancel() // stop talking

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: reportContext || 'No report context provided yet.',
          language: language || 'English'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to the server.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '600px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity color="var(--accent-primary)" />
          <h2 style={{ margin: 0 }}>AI Clinical Consultation</h2>
        </div>
        <button 
          onClick={() => {
            setTtsEnabled(!ttsEnabled)
            if (ttsEnabled) window.speechSynthesis.cancel()
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: ttsEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
          title="Toggle AI Voice"
        >
          {ttsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            gap: '12px',
            alignItems: 'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '50%', 
              background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
              flexShrink: 0
            }}>
              {msg.role === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="var(--accent-primary)" />}
            </div>
            <div style={{
              background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              padding: '12px 16px',
              borderRadius: '12px',
              maxWidth: '75%',
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <Bot size={20} color="var(--accent-primary)" />
            </div>
            <div style={{ background: 'rgba(0,0,0,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div className="loader" style={{ width: '16px', height: '16px', borderTopColor: 'var(--text-secondary)' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center' }}>
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
          title="Dictate Message"
        >
          {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
        </button>
        <input 
          type="text" 
          className="input-field" 
          placeholder={isListening ? "Listening..." : "Ask a question about your health or report..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" onClick={handleSend} disabled={isLoading || (!input.trim() && !isListening)}>
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}

export default ChatAssistant

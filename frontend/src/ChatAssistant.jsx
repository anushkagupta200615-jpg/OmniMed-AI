import { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, Activity } from 'lucide-react'

function ChatAssistant({ reportContext }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am OmniMed AI, your clinical consultation assistant. I have reviewed your report. How can I help you understand your results today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: reportContext || 'No report context provided yet.'
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
      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Activity color="var(--accent-primary)" />
        <h2 style={{ margin: 0 }}>AI Clinical Consultation</h2>
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
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
            }}>
              {msg.role === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="var(--accent-primary)" />}
            </div>
            <div style={{
              background: msg.role === 'user' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
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

      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ask a question about your health or report..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-primary" onClick={handleSend} disabled={isLoading}>
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}

export default ChatAssistant

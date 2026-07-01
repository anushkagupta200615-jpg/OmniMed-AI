import { useState } from 'react'
import { Database, UploadCloud, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

function KnowledgeBase() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setStatus(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const res = await fetch(`${API_BASE}/api/knowledge/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.success) {
        setStatus('success')
        setMessage(data.message)
        setFile(null)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to upload knowledge base.')
      }
    } catch (err) {
      setStatus('error')
      setMessage('Network error while uploading.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '60vh', padding: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Database color="var(--accent-primary)" size={32} />
        <h2 style={{ margin: 0 }}>RAG Knowledge Base</h2>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '40px' }}>
        Upload medical textbooks, guidelines, or research papers (PDF format) to train the AI's internal medical knowledge.
        Once uploaded, the Chat Assistant will automatically search through these documents to answer your questions.
      </p>

      <div 
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '16px',
          padding: '60px 40px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.3s ease',
          marginBottom: '30px'
        }}
      >
        <UploadCloud size={64} color={file ? "var(--success)" : "var(--accent-primary)"} style={{ marginBottom: '20px' }} />
        
        {file ? (
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{file.name}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Select a Medical PDF</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>Max file size: 50MB</p>
          </div>
        )}

        <input
          type="file"
          id="kb-file-upload"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <div style={{ marginTop: '24px' }}>
          <label htmlFor="kb-file-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block', marginRight: '16px' }}>
            Choose File
          </label>
          
          <button 
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{ opacity: (!file || uploading) ? 0.5 : 1 }}
          >
            {uploading ? 'Processing & Embedding...' : 'Train AI Database'}
          </button>
        </div>
      </div>

      {status === 'success' && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <CheckCircle color="var(--success)" />
          <span style={{ color: 'var(--success)' }}>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle color="var(--danger)" />
          <span style={{ color: 'var(--danger)' }}>{message}</span>
        </div>
      )}
    </div>
  )
}

export default KnowledgeBase

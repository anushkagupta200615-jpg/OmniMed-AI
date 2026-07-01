import { useState } from 'react'
import { Activity, Upload, FileText, MessageSquare, Shield, Clock } from 'lucide-react'

function Dashboard({ setView }) {
  return (
    <div className="animate-fade-in">
      <div className="glass-panel" style={{ marginBottom: '40px', textAlign: 'center', padding: '60px 20px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', background: 'linear-gradient(to right, var(--text-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Intelligent Medical Triage & Analysis
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Upload your medical scans or blood work reports for an instant AI-powered comprehensive clinical analysis and risk assessment.
        </p>
        <button className="btn-primary" onClick={() => setView('upload')} style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
          <Upload size={24} />
          Start Analysis
        </button>
      </div>

      <h2 style={{ marginBottom: '24px' }}>Platform Features</h2>
      <div className="dashboard-grid">
        <div className="glass-panel">
          <Activity size={32} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Smart Triage</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Instantly analyzes your symptoms to recommend the required medical documents for diagnosis.</p>
        </div>
        <div className="glass-panel">
          <FileText size={32} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Multi-Modal AI</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Extracts critical data from both visual imaging scans (X-Rays, MRIs) and PDF blood reports.</p>
        </div>
        <div className="glass-panel">
          <Shield size={32} color="var(--success)" style={{ marginBottom: '16px' }} />
          <h3>AI Validation</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Built-in hallucination checks ensure high reliability and clinical accuracy of generated reports.</p>
        </div>
        <div className="glass-panel">
          <MessageSquare size={32} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h3>Contextual Assistant</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Chat with OmniMed about your specific results for clear, empathetic explanations.</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

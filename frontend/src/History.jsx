import { useState, useEffect } from 'react'
import { Clock, ChevronRight, Activity } from 'lucide-react'
import ReportViewer from './ReportViewer'

function History({ setView }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        const res = await fetch(`${API_BASE}/api/history`)
        const data = await res.json()
        if (data.success) {
          setHistory(data.history)
        }
      } catch (err) {
        console.error("Failed to load history", err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  if (selectedReport) {
    return (
      <div>
        <button 
          className="btn-secondary" 
          onClick={() => setSelectedReport(null)} 
          style={{ margin: '20px 0', marginLeft: 'auto', marginRight: 'auto', display: 'block', maxWidth: '900px' }}
        >
          &larr; Back to History
        </button>
        <ReportViewer 
          report={selectedReport.report} 
          validation={selectedReport.validation} 
          lifestylePlan={selectedReport.lifestyle_plan}
          onChat={() => setView('chat')} 
        />
      </div>
    )
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '60vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <Clock color="var(--accent-primary)" size={28} />
        <h2 style={{ margin: 0 }}>Patient History</h2>
      </div>

      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Activity className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            Loading historical reports...
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <p>No past reports found.</p>
            <button className="btn-primary" onClick={() => setView('upload')} style={{ marginTop: '16px' }}>
              Run a New Analysis
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => (
              <div 
                key={item.id} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '20px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedReport(item)}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                    {item.report.image_type || 'Clinical Scan'} ({item.report.body_region || 'Unknown Region'})
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                    <span style={{ color: item.report.cancer_risk?.risk_level?.toLowerCase() === 'high' ? 'var(--danger)' : 'inherit' }}>
                      Risk: {item.report.cancer_risk?.risk_level || 'Unknown'}
                    </span>
                  </div>
                </div>
                <ChevronRight color="var(--text-secondary)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default History

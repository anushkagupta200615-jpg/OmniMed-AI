import { useState } from 'react'
import Dashboard from './Dashboard'
import UploadWizard from './UploadWizard'
import ChatAssistant from './ChatAssistant'
import History from './History'
import KnowledgeBase from './KnowledgeBase'
import { Activity } from 'lucide-react'

function App() {
  const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'es-ES', name: 'Español' },
    { code: 'hi-IN', name: 'हिन्दी' },
    { code: 'zh-CN', name: '中文' },
    { code: 'fr-FR', name: 'Français' }
  ]
  const [view, setView] = useState('dashboard')
  const [language, setLanguage] = useState(languages[0])

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
          <Activity color="var(--accent-primary)" size={28} />
          OmniMed AI
        </div>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <select 
            value={language.code} 
            onChange={(e) => setLanguage(languages.find(l => l.code === e.target.value) || languages[0])}
            style={{ padding: '8px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => setView('dashboard')}>Dashboard</button>
          <button className="btn-secondary" onClick={() => setView('history')}>History</button>
          <button className="btn-secondary" onClick={() => setView('knowledge')}>Knowledge Base</button>
          <button className="btn-secondary" onClick={() => setView('chat')}>Consult AI</button>
          <button className="btn-primary" onClick={() => setView('upload')}>New Analysis</button>
        </nav>
      </header>

      <main>
        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'upload' && <UploadWizard onComplete={() => setView('history')} language={language.name} languageCode={language.code} />}
        {view === 'history' && <History setView={setView} />}
        {view === 'knowledge' && <KnowledgeBase />}
        {view === 'chat' && <ChatAssistant reportContext="" language={language.name} languageCode={language.code} />}
      </main>
    </div>
  )
}

export default App

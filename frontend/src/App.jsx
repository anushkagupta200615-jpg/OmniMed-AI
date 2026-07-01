import { useState } from 'react'
import Dashboard from './Dashboard'
import UploadWizard from './UploadWizard'
import ChatAssistant from './ChatAssistant'
import { Activity } from 'lucide-react'

function App() {
  const [view, setView] = useState('dashboard')

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo" onClick={() => setView('dashboard')} style={{ cursor: 'pointer' }}>
          <Activity color="var(--accent-primary)" size={28} />
          OmniMed AI
        </div>
        <nav style={{ display: 'flex', gap: '20px' }}>
          <button className="btn-secondary" onClick={() => setView('dashboard')}>Dashboard</button>
          <button className="btn-secondary" onClick={() => setView('chat')}>Consult AI</button>
          <button className="btn-primary" onClick={() => setView('upload')}>New Analysis</button>
        </nav>
      </header>

      <main>
        {view === 'dashboard' && <Dashboard setView={setView} />}
        {view === 'upload' && <UploadWizard onComplete={() => setView('dashboard')} />}
        {view === 'chat' && <ChatAssistant reportContext="" />}
      </main>
    </div>
  )
}

export default App

import { useState, useEffect } from 'react';
import { LayoutDashboard, CloudUpload, MessageSquare, BarChart3, HelpCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';
import EvaluationPage from './pages/EvaluationPage';
import FeedbackPage from './pages/FeedbackPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'chat' | 'evaluation' | 'feedback'>('chat');
  const [serverStatus, setServerStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [groqMode, setGroqMode] = useState<string>('Detecting...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const data = await res.json();
          setServerStatus('ONLINE');
          setGroqMode(data.groqMockMode ? 'Simulated Mock Mode' : 'Live Groq API Connected');
        } else {
          setServerStatus('OFFLINE');
          setGroqMode('Offline');
        }
      } catch (err) {
        setServerStatus('OFFLINE');
        setGroqMode('Offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check health every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <UploadPage />;
      case 'chat':
        return <ChatPage />;
      case 'evaluation':
        return <EvaluationPage />;
      case 'feedback':
        return <FeedbackPage />;
    }
  };

  return (
    <div className="app-container">
      {/* Premium Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo">⚡</div>
          <div className="brand-name">Adaptive RAG</div>
        </div>

        <ul className="nav-links">
          <li>
            <div
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={18} />
              <span>RAG Chatbot</span>
            </div>
          </li>
          <li>
            <div
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Metrics Stats</span>
            </div>
          </li>
          <li>
            <div
              className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <CloudUpload size={18} />
              <span>Ingest Engine</span>
            </div>
          </li>
          <li>
            <div
              className={`nav-item ${activeTab === 'evaluation' ? 'active' : ''}`}
              onClick={() => setActiveTab('evaluation')}
            >
              <BarChart3 size={18} />
              <span>RAG Evaluation</span>
            </div>
          </li>
          <li>
            <div
              className={`nav-item ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <HelpCircle size={18} />
              <span>Feedback Database</span>
            </div>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Groq LLM Engine:</span>
            <span style={{
              fontSize: '11px',
              color: groqMode.includes('Live') ? 'var(--success)' : 'var(--warning)',
              fontWeight: 500
            }}>
              {groqMode}
            </span>
          </div>
          <div style={{ marginTop: '16px', fontSize: '10px' }}>v1.0.0 • E-commerce Assistant</div>
        </div>
      </aside>

      {/* Main content display chassis */}
      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>
              {activeTab === 'chat' && 'Adaptive RAG Product Assistant'}
              {activeTab === 'dashboard' && 'Ingested Context Overview'}
              {activeTab === 'upload' && 'Document Ingestion Console'}
              {activeTab === 'evaluation' && 'Accurate Performance Diagnostics'}
              {activeTab === 'feedback' && 'Feedback Vector Searching'}
            </h1>
          </div>
          <div className="server-status">
            <span className="status-dot" style={{
              backgroundColor: serverStatus === 'ONLINE' ? 'var(--success)' : 'var(--danger)',
              boxShadow: serverStatus === 'ONLINE' ? '0 0 8px var(--success)' : '0 0 8px var(--danger)'
            }} />
            <span>API Server: {serverStatus}</span>
          </div>
        </header>

        <div className="tab-panel">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}

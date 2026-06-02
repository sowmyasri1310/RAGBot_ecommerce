import React, { useState, useRef, useEffect } from 'react';
import { Send, Eye, Network, RefreshCw, ShieldCheck, Copy, Check } from 'lucide-react';

interface Source {
  id: string;
  filename: string;
  product_name: string;
  collection: string;
  similarity: number;
  text: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  confidenceScore?: number;
  confidenceExplanation?: string;
  classification?: string;
  rewrittenQuery?: string;
  sourcesUsed?: Source[];
  traceId?: string;
}

interface SessionSummary {
  sessionId: string;
  title: string;
  created_at: string;
  updated_at: string;
  questions: string[];
  products: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your domain-specific Adaptive RAG E-commerce Product Assistant. Ask me anything about our product specs, user manuals, warranties, FAQ articles, or return/shipping guidelines!',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Keep track of the active/selected trace diagnostics to display in the right sidebar
  const [activeTrace, setActiveTrace] = useState<Message | null>(null);
  
  // Source modal state
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  // Chat History Sidebar State
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionsList, setSessionsList] = useState<SessionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        setSessionsList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  useEffect(() => {
    const initialId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setActiveSessionId(initialId);
    fetchHistory();
  }, []);

  const handleNewChat = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    setActiveSessionId(newId);
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I am your domain-specific Adaptive RAG E-commerce Product Assistant. Ask me anything about our product specs, user manuals, warranties, FAQ articles, or return/shipping guidelines!',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    setActiveTrace(null);
  };

  const loadSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/history/${sessionId}`);
      if (!res.ok) throw new Error('Failed to load chat history');
      
      const data = await res.json();
      if (data.session && data.session.messages) {
        setActiveSessionId(sessionId);
        
        const mappedMessages: Message[] = data.session.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).toLocaleTimeString(),
          confidenceScore: m.confidenceScore,
          sourcesUsed: m.sources,
          confidenceExplanation: m.role === 'assistant' ? (m.confidenceExplanation || 'Retrieved from history') : undefined,
          classification: m.role === 'assistant' ? (m.classification || 'RESOLVED') : undefined,
          rewrittenQuery: m.role === 'assistant' ? (m.rewrittenQuery || m.content) : undefined,
          traceId: m.traceId
        }));
        
        setMessages(mappedMessages);
        
        const assistantMsgs = mappedMessages.filter(m => m.role === 'assistant');
        if (assistantMsgs.length > 0) {
          setActiveTrace(assistantMsgs[assistantMsgs.length - 1]);
        } else {
          setActiveTrace(null);
        }
      }
    } catch (err: any) {
      alert(`Failed to load chat session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      const res = await fetch(`/api/chat/history/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to delete ALL previous conversations? This action cannot be undone.')) return;
    
    try {
      const res = await fetch('/api/chat/history', { method: 'DELETE' });
      if (res.ok) {
        handleNewChat();
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const filteredSessions = sessionsList.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titleMatch = s.title.toLowerCase().includes(query);
    const questionsMatch = s.questions.some(q => q.toLowerCase().includes(query));
    const productsMatch = s.products.some(p => p.toLowerCase().includes(query));
    
    return titleMatch || questionsMatch || productsMatch;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    setInputText('');
    
    const userMsg: Message = {
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMsgText,
          sessionId: activeSessionId
        })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch chatbot response.');
      }

      const data = await res.json();
      
      const botMsg: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString(),
        confidenceScore: data.confidenceScore,
        confidenceExplanation: data.confidenceExplanation,
        classification: data.classification,
        rewrittenQuery: data.rewrittenQuery,
        sourcesUsed: data.sourcesUsed,
        traceId: data.traceId
      };

      setMessages((prev) => [...prev, botMsg]);
      setActiveTrace(botMsg);
      // Refresh sidebar list to reflect new/updated conversation
      fetchHistory();
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${err.message || 'I encountered an issue processing your request. Ensure the backend server is running and database is ingested.'}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'var(--success)';
    if (score >= 0.5) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="chat-page-layout">
      {/* SIDEBAR PANEL: Chat History */}
      <aside className="history-sidebar glass-card" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', height: '100%', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', color: 'white', fontWeight: 700 }}>Chat Sessions</h3>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '11px', minWidth: 'auto', border: '1px solid var(--border-glass-glow)', background: 'rgba(255,255,255,0.03)' }}
            onClick={handleNewChat}
          >
            + New Chat
          </button>
        </div>

        {/* Search Input */}
        <input 
          type="text" 
          className="input-control" 
          placeholder="Search chats, Qs, products..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)' }}
        />

        {/* Sessions list */}
        <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {filteredSessions.length === 0 ? (
            <div style={{ color: 'var(--text-disabled)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
              No chats found.
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.sessionId === activeSessionId;
              return (
                <div 
                  key={session.sessionId}
                  onClick={() => loadSession(session.sessionId)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? 'linear-gradient(135deg, var(--primary-glow), rgba(200, 70, 250, 0.03))' : 'rgba(255,255,255,0.01)',
                    border: isActive ? '1px solid var(--border-glass-glow)' : '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'var(--transition-smooth)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '12.5px',
                      color: isActive ? '#ffffff' : 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '80%'
                    }}>
                      {session.title}
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.sessionId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-disabled)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition-smooth)'
                      }}
                      title="Delete chat"
                    >
                      &times;
                    </button>
                  </div>
                  {session.products && session.products.length > 0 && (
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      🏷️ {session.products.join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: '9px', color: 'var(--text-disabled)', textAlign: 'right' }}>
                    {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sessionsList.length > 0 && (
          <button 
            className="btn btn-danger" 
            style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
            onClick={handleClearAllHistory}
          >
            Clear All History
          </button>
        )}
      </aside>

      {/* CENTER COLUMN: Main Chat Container */}
      <section className="chat-panel glass-card" style={{ padding: '24px' }}>
        <div className="messages-scroller">
          {messages.map((msg, index) => {
            const isBot = msg.role === 'assistant';
            return (
              <div key={index} className={`msg-wrapper ${!isBot ? 'msg-user' : ''}`}>
                <div className={`msg-avatar ${isBot ? 'avatar-assistant' : 'avatar-user'}`}>
                  {isBot ? '🤖' : '👤'}
                </div>
                
                <div className={`msg-bubble ${isBot ? 'bubble-assistant' : 'bubble-user'}`}>
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
                  
                  {isBot && msg.confidenceScore !== undefined && (
                    <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                      {/* Confidence badge */}
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          background: `${getConfidenceColor(msg.confidenceScore)}12`,
                          border: `1px solid ${getConfidenceColor(msg.confidenceScore)}30`,
                          color: getConfidenceColor(msg.confidenceScore),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Confidence: {(msg.confidenceScore * 100).toFixed(0)}%
                      </span>

                      {/* Diagnostic trace pill */}
                      {msg.traceId && (
                        <button 
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setActiveTrace(msg)}
                        >
                          <Network size={10} />
                          <span>View Trace Diagnostics</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Sources display */}
                  {isBot && msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Sources Used:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {msg.sourcesUsed.map((source, sIdx) => (
                          <div 
                            key={sIdx} 
                            style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid var(--border-glass)', 
                              borderRadius: '4px', 
                              padding: '2px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-main)'
                            }}
                            onClick={() => setSelectedSource(source)}
                          >
                            <Eye size={10} color="var(--primary)" />
                            <span>{source.filename} ({(source.similarity * 100).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="msg-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}
          
          {loading && (
            <div className="msg-wrapper">
              <div className="msg-avatar avatar-assistant">🤖</div>
              <div className="msg-bubble bubble-assistant" style={{ minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={14} style={{ animation: 'spin 2s linear infinite' }} />
                  <span>Thinking (Adaptive RAG active)...</span>
                </span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-input-row">
          <input 
            type="text" 
            className="input-control"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a product question... e.g. Which laptop supports 32GB RAM? or What is the return policy?"
            disabled={loading}
            style={{ borderRadius: 'var(--radius-md)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !inputText.trim()}>
            <Send size={16} />
          </button>
        </form>
      </section>

      {/* RIGHT COLUMN: RAG Trace Diagnostics Panel */}
      <aside className="trace-panel glass-card" style={{ padding: '24px' }}>
        <h3 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Network size={18} color="var(--primary)" />
          <span>RAG Pipeline Diagnostics</span>
        </h3>

        {!activeTrace ? (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 10px', color: 'var(--text-disabled)' }}>
            <Network size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>No active trace selected</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Ask a question to see step-by-step adaptive RAG logs here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Step 1: Classification & Resolved Product */}
            <div>
              <div className="trace-section-header">1. Query Analysis & Memory</div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-disabled)', fontWeight: 500 }}>Detected Query Type:</span>
                  <span style={{ color: '#ffffff', fontWeight: 700 }}>{activeTrace.classification}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Resolved Product:</span>
                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>{(activeTrace as any).resolvedProduct || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Query Rewrite */}
            <div>
              <div className="trace-section-header">2. Query Rewriter</div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-disabled)', display: 'block' }}>Original Query</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>"{messages[messages.indexOf(activeTrace) - 1]?.content}"</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--primary)', display: 'block' }}>Rewritten Query</span>
                  <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 500 }}>"{activeTrace.rewrittenQuery}"</span>
                </div>
              </div>
            </div>

            {/* Step 3: Vector retrieval */}
            <div>
              <div className="trace-section-header">3. Vector Search & Depth</div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target Collections:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>
                    {activeTrace.sourcesUsed && [...new Set(activeTrace.sourcesUsed.map(s => s.collection))].join(', ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dynamic Top K Limit:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>
                    {activeTrace.classification === 'PRODUCT_COMPARE' ? '20' : activeTrace.classification === 'PRODUCT_RECOMMEND' ? '25' : activeTrace.classification === 'PRODUCT_CATALOG' ? '15 (Bypassed)' : '15'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Chunks Kept:</span>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{activeTrace.sourcesUsed?.length} chunks</span>
                </div>
              </div>
            </div>

            {/* Step 4: Confidence Score */}
            <div>
              <div className="trace-section-header">4. Confidence Score</div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <ShieldCheck size={16} color={getConfidenceColor(activeTrace.confidenceScore || 0.8)} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    {((activeTrace.confidenceScore || 0.8) * 100).toFixed(0)}% Match Confidence
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {activeTrace.confidenceExplanation}
                </div>
              </div>
            </div>

            {/* Step 5: LangSmith trace */}
            {activeTrace.traceId && (
              <div>
                <div className="trace-section-header">5. LangSmith Integration</div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-disabled)', display: 'block' }}>Run Log ID</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{activeTrace.traceId}</span>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
                    onClick={() => copyToClipboard(activeTrace.traceId || '', 'trace')}
                  >
                    {copied === 'trace' ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}
      </aside>

      {/* FLOAT MODAL: Display Source Chunk Text */}
      {selectedSource && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.75)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '600px', maxWidth: '90%', padding: '28px', background: 'var(--bg-surface-opaque)', border: '1px solid var(--border-glass-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <div>
                <h4 style={{ color: 'white', fontSize: '16px' }}>{selectedSource.filename}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Collection: {selectedSource.collection} • Similarity: {(selectedSource.similarity * 100).toFixed(1)}%</span>
              </div>
              <button 
                style={{ fontSize: '20px', background: 'transparent', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer' }}
                onClick={() => setSelectedSource(null)}
              >
                &times;
              </button>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-glass)' }}>
              {selectedSource.text}
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSource(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

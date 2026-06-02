import { useState, useEffect } from 'react';
import { Database, FolderHeart, FileSpreadsheet, Layers, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface DocumentRecord {
  id: string;
  filename: string;
  product_name: string;
  category: string;
  source_type: string;
  upload_date: string;
  chunk_count: number;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    descriptions: 0,
    manuals: 0,
    faqs: 0,
    warranty: 0,
    returns: 0,
    shipping: 0
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        const docs: DocumentRecord[] = data.documents || [];
        setDocuments(docs);
        
        // Calculate collection breakdowns
        const newStats = {
          descriptions: docs.filter(d => d.category === 'product_descriptions').length,
          manuals: docs.filter(d => d.category === 'manuals').length,
          faqs: docs.filter(d => d.category === 'faqs').length,
          warranty: docs.filter(d => d.category === 'warranty').length,
          returns: docs.filter(d => d.category === 'returns').length,
          shipping: docs.filter(d => d.category === 'shipping').length
        };
        setStats(newStats);
      }
    } catch (err) {
      console.error('Failed to fetch documents listing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'? This deletes all associated chunks from ChromaDB.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Document deleted successfully.');
        fetchDocuments();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || 'Failed to delete document'}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Dynamic Summary Cards */}
      <section className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon">
            <Database size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{documents.length}</span>
            <span className="stat-label">Total Documents</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <Layers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalChunks}</span>
            <span className="stat-label">Vector Chunks</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <FolderHeart size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">6</span>
            <span className="stat-label">Designated Collections</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon">
            <FileSpreadsheet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">50+</span>
            <span className="stat-label">Dataset Goal</span>
          </div>
        </div>
      </section>

      {/* Collection Details Breakdowns */}
      <section className="glass-card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#ffffff' }}>Collections Chunk Distributions</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Product Descriptions</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.descriptions}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: product_descriptions</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>User Manuals</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.manuals}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: manuals</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>FAQ Articles</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.faqs}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: faqs</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Warranty Terms</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.warranty}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: warranty</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Return Policies</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.returns}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: returns</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Shipping Rules</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{stats.shipping}</span>
              <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Collection: shipping</span>
            </div>
          </div>
        </div>
      </section>

      {/* Ingestion Listing Table */}
      <section className="glass-card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#ffffff' }}>Ingested Knowledge Database</h3>
        
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading documents database...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No documents found in database. Go to the **Ingest Engine** page to upload files from our generated e-commerce test dataset.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 16px' }}>Filename</th>
                  <th style={{ padding: '12px 16px' }}>Collection Category</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Chunks Count</th>
                  <th style={{ padding: '12px 16px' }}>Upload Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', fontSize: '14px', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff' }}>{doc.filename}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '4px 8px', 
                        borderRadius: '12px',
                        background: 'rgba(100, 80, 250, 0.08)',
                        border: '1px solid rgba(100, 80, 250, 0.15)',
                        color: 'var(--text-main)'
                      }}>
                        {doc.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textTransform: 'uppercase', fontSize: '12px', color: 'var(--text-muted)' }}>{doc.source_type}</td>
                    <td style={{ padding: '16px', color: '#ffffff', fontWeight: 600 }}>{doc.chunk_count}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(doc.upload_date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '8px 12px' }}
                        onClick={() => handleDelete(doc.id, doc.filename)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

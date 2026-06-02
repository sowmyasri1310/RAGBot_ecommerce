import { useState, useEffect } from 'react';
import { Search, Plus, Tag } from 'lucide-react';

interface FeedbackItem {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  created_at: string;
  score?: number;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [tagCloud, setTagCloud] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'hybrid' | 'similarity' | 'tags'>('hybrid');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FeedbackItem[] | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // New feedback form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newTags, setNewTags] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchAllFeedback = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
        setTagCloud(data.tagCloud || []);
      }
    } catch (err) {
      console.error('Failed to fetch feedback logs:', err);
    }
  };

  useEffect(() => {
    fetchAllFeedback();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      // We pass query and searchMode structure
      const res = await fetch('/api/feedback/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), mode: searchMode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.matchFound) {
          // If synthesized answer exists, we map it into a clean display result
          const matched = data.matchedFeedbacks.map((f: any) => ({
            id: `match_${Math.random()}`,
            question: f.question,
            answer: f.answer,
            tags: f.tags,
            score: f.score,
            created_at: new Date().toISOString()
          }));
          setSearchResults(matched);
        } else {
          setSearchResults([]);
        }
      }
    } catch (err) {
      console.error('Feedback search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      alert('Question and Answer are required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const res = await fetch('/api/feedback/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          tags: newTags.trim() || undefined
        })
      });

      if (res.ok) {
        alert('Feedback record indexed successfully.');
        setNewQuestion('');
        setNewAnswer('');
        setNewTags('');
        fetchAllFeedback();
      }
    } catch (err) {
      console.error('Failed to add feedback record:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this feedback item from the database?')) {
      return;
    }
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllFeedback();
        if (searchResults) {
          setSearchResults(searchResults.filter(f => f.id !== id));
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Filter feedbacks locally if a tag is selected
  const displayedFeedbacks = selectedTag 
    ? feedbacks.filter(f => f.tags.includes(selectedTag))
    : feedbacks;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', height: '100%' }}>
      
      {/* Left Column: Search Panel and Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Search Control Card */}
        <section className="glass-card">
          <h3 style={{ marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} color="var(--primary)" />
            <span>Search Feedback Database</span>
          </h3>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                className="input-control"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                placeholder="Enter feedback question or topic keywords to search..."
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Search
              </button>
            </div>

            {/* Switch search tiers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Search Mode:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  className={`btn ${searchMode === 'hybrid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setSearchMode('hybrid')}
                >
                  Hybrid Ranking (Recommended)
                </button>
                <button 
                  type="button"
                  className={`btn ${searchMode === 'similarity' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setSearchMode('similarity')}
                >
                  Cosine Similarity
                </button>
                <button 
                  type="button"
                  className={`btn ${searchMode === 'tags' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setSearchMode('tags')}
                >
                  Tag Matching
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Results List */}
        <section className="glass-card" style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'white' }}>
              {searchResults !== null ? `Search Results (${searchResults.length})` : selectedTag ? `Filtered by tag: #${selectedTag} (${displayedFeedbacks.length})` : `All Verified Feedbacks (${feedbacks.length})`}
            </h3>
            {(searchResults !== null || selectedTag !== null) && (
              <button 
                style={{ fontSize: '11px', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setSearchResults(null);
                  setSelectedTag(null);
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-disabled)' }}>Running vector comparisons...</div>
            ) : (searchResults !== null ? searchResults : displayedFeedbacks).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-disabled)', fontSize: '13px' }}>
                "I don't have that information in the database." (No matching feedbacks found).
              </div>
            ) : (
              (searchResults !== null ? searchResults : displayedFeedbacks).map((item) => (
                <div key={item.id} style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                  <div style={{ paddingRight: '40px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>Question:</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{item.question}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>Verified Answer:</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>{item.answer}</div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="tag-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '10px' }}>#{t}</span>
                    ))}
                  </div>

                  {/* Similarity Score indicator */}
                  {item.score !== undefined && (
                    <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '11px', fontWeight: 600, color: 'var(--success)' }}>
                      Match: {(item.score * 100).toFixed(0)}%
                    </span>
                  )}

                  {!item.id.includes('match') && (
                    <button 
                      style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer' }}
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* Right Column: Tag Cloud & Manual Additions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Tag Cloud Card */}
        <section className="glass-card">
          <h3 style={{ marginBottom: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={16} color="var(--primary)" />
            <span>Descriptive Tag Cloud</span>
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Click on any keyword bubble extracted from stored Q&A records to filter feedbacks instantly:
          </p>

          <div className="tag-cloud-wrapper">
            {tagCloud.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text-disabled)' }}>No tags generated yet.</span>
            ) : (
              tagCloud.map((tag, idx) => (
                <span 
                  key={idx} 
                  className={`tag-badge ${selectedTag === tag ? 'active' : ''}`}
                  style={{ 
                    cursor: 'pointer', 
                    background: selectedTag === tag ? 'var(--primary)' : 'rgba(100, 80, 250, 0.08)',
                    borderColor: selectedTag === tag ? 'var(--primary)' : 'var(--border-glass-glow)',
                    color: selectedTag === tag ? '#ffffff' : 'var(--text-main)'
                  }}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  #{tag}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Manual Add Card */}
        <section className="glass-card">
          <h3 style={{ marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="var(--success)" />
            <span>Index Verified Q&A Node</span>
          </h3>

          <form onSubmit={handleAddFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>Customer Question:</label>
              <input 
                type="text"
                className="input-control"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. Which laptop supports 32GB RAM?"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>Verified Factual Answer:</label>
              <textarea 
                className="input-control"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="e.g. Dell XPS 15 supports up to 32GB RAM."
                rows={3}
                required
                style={{ resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>Custom Tags (Optional, comma-separated):</label>
              <input 
                type="text"
                className="input-control"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g. laptop, dell, xps, ram"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={formLoading}>
              {formLoading ? 'Generating Embeddings & Tagging...' : 'Add Verified Entry'}
            </button>
          </form>
        </section>
        
      </div>
    </div>
  );
}

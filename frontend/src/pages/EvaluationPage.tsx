import { useState, useEffect } from 'react';
import { BarChart3, LineChart, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface MetricAverages {
  precision: number;
  recall: number;
  mrr: number;
  contextRelevance: number;
  faithfulness: number;
  answerRelevance: number;
  groundedness: number;
  correctness: number;
  intentAccuracy?: number;
  intentConfidence?: number;
}

interface EvaluationLog {
  id: string;
  query: string;
  answer: string;
  classification: string;
  confidence: number;
  date: string;
  metrics: {
    precision: number;
    recall: number;
    mrr: number;
    contextRelevance: number;
    faithfulness: number;
    answerRelevance: number;
    groundedness: number;
    correctness: number;
  };
  traceId: string;
  verifierScore?: number;
  verificationStatus?: string;
  regeneratedCount?: number;
  intentAccuracy?: number;
  normalizationApplied?: boolean;
  intentConfidence?: number;
  originalQuery?: string;
  normalizedQuery?: string;
  resolvedQuery?: string;
  detectedIntent?: string;
  finalRoutedIntent?: string;
}

export default function EvaluationPage() {
  const [averages, setAverages] = useState<MetricAverages>({
    precision: 0,
    recall: 0,
    mrr: 0,
    contextRelevance: 0,
    faithfulness: 0,
    answerRelevance: 0,
    groundedness: 0,
    correctness: 0,
    intentAccuracy: 0,
    intentConfidence: 0
  });
  const [history, setHistory] = useState<EvaluationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/metrics`);
      if (res.ok) {
        const data = await res.json();
        setAverages(data.averages || {});
        setHistory(data.history || []);
        setTotal(data.totalEvaluations || 0);
      }
    } catch (err) {
      console.error('Failed to fetch evaluation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to clear all historical evaluation logs? This resets aggregate statistics.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/metrics/reset`, { method: 'DELETE' });
      if (res.ok) {
        alert('Evaluation metrics reset successfully.');
        fetchMetrics();
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const getPercentage = (val: number) => `${(val * 100).toFixed(0)}%`;

  // Standard labels and scores list for the Bar chart
  const barChartLabels = ['Precision@K', 'Recall@K', 'MRR', 'Context Rel.', 'Faithfulness', 'Answer Rel.', 'Groundedness', 'Correctness', 'Intent Accuracy', 'Intent Conf.'];
  const barScores = [
    averages.precision,
    averages.recall,
    averages.mrr,
    averages.contextRelevance,
    averages.faithfulness,
    averages.answerRelevance,
    averages.groundedness,
    averages.correctness,
    averages.intentAccuracy || 0,
    averages.intentConfidence || 0
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Metrics overview summary cards */}
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="stat-info">
            <span className="stat-value">{getPercentage(averages.faithfulness)}</span>
            <span className="stat-label">Avg Faithfulness</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="stat-info">
            <span className="stat-value">{getPercentage(averages.groundedness)}</span>
            <span className="stat-label">Avg Groundedness</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
          <div className="stat-info">
            <span className="stat-value">{getPercentage(averages.precision)}</span>
            <span className="stat-label">Avg Precision@K</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-info">
            <span className="stat-value">{averages.mrr.toFixed(2)}</span>
            <span className="stat-label">Avg MRR Score</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div className="stat-info">
            <span className="stat-value">{getPercentage(averages.intentAccuracy || 0)}</span>
            <span className="stat-label">Avg Intent Accuracy</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid #06b6d4' }}>
          <div className="stat-info">
            <span className="stat-value">{getPercentage(averages.intentConfidence || 0)}</span>
            <span className="stat-label">Avg Intent Conf.</span>
          </div>
        </div>
      </section>

      {/* SVG Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
        
        {/* Dynamic Vector Bar Chart */}
        <section className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--primary)" />
              <span>Aggregate Metrics Averages (N = {total})</span>
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>Rating scale 0% - 100%</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {barChartLabels.map((label, idx) => {
              const score = barScores[idx] || 0;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ width: '110px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                  <div style={{ flexGrow: 1, height: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '7px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${score * 100}%`,
                        background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                        boxShadow: '0 0 8px rgba(100, 80, 250, 0.4)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} 
                    />
                  </div>
                  <span style={{ width: '40px', fontSize: '12px', fontWeight: 700, color: 'white', textAlign: 'right' }}>
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic Vector Timeline Line Chart */}
        <section className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LineChart size={18} color="var(--secondary)" />
              <span>Pipeline Grounding Over Time</span>
            </h3>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={fetchMetrics} disabled={loading}>
              <RefreshCw size={10} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {history.length < 2 ? (
            <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', fontSize: '12px', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
              <span>Not enough chronological log history.</span>
              <span style={{ fontSize: '10px', marginTop: '4px' }}>Please perform at least 2 chat responses to draw a timeline chart.</span>
            </div>
          ) : (
            <div className="svg-chart-container" style={{ position: 'relative' }}>
              {/* Responsive SVG Line Chart */}
              <svg viewBox="0 0 350 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Horizontal Grid lines */}
                <line x1="20" y1="20" x2="330" y2="20" className="chart-grid-line" />
                <line x1="20" y1="70" x2="330" y2="70" className="chart-grid-line" />
                <line x1="20" y1="120" x2="330" y2="120" className="chart-grid-line" />
                <line x1="20" y1="170" x2="330" y2="170" className="chart-grid-line" />
                
                {/* Y-axis Labels */}
                <text x="5" y="24" className="chart-label">1.0</text>
                <text x="5" y="74" className="chart-label">0.7</text>
                <text x="5" y="124" className="chart-label">0.4</text>
                <text x="5" y="174" className="chart-label">0.1</text>

                {/* Generate paths for Faithfulness and Groundedness */}
                {(() => {
                  const points = history.slice(-6); // plot last 6 runs
                  const intervalX = 310 / (points.length - 1);
                  
                  // Map scores into SVG coordinate systems (Y goes from 20 to 170)
                  const mapY = (val: number) => 170 - (val * 150);
                  
                  const faithfulnessPointsStr = points
                    .map((pt, idx) => `${20 + idx * intervalX},${mapY(pt.metrics.faithfulness)}`)
                    .join(' ');

                  const groundednessPointsStr = points
                    .map((pt, idx) => `${20 + idx * intervalX},${mapY(pt.metrics.groundedness)}`)
                    .join(' ');

                  return (
                    <>
                      {/* Faithfulness Line (Glowing Turquoise) */}
                      <polyline 
                        fill="none" 
                        stroke="var(--success)" 
                        strokeWidth="3" 
                        points={faithfulnessPointsStr}
                        style={{ filter: 'drop-shadow(0px 0px 4px rgba(10, 220, 160, 0.4))' }}
                      />
                      {/* Groundedness Line (Glowing Violet) */}
                      <polyline 
                        fill="none" 
                        stroke="var(--secondary)" 
                        strokeWidth="3" 
                        points={groundednessPointsStr}
                        style={{ filter: 'drop-shadow(0px 0px 4px rgba(200, 70, 250, 0.4))' }}
                      />

                      {/* Timeline Markers */}
                      {points.map((pt, idx) => (
                        <circle 
                          key={idx}
                          cx={20 + idx * intervalX}
                          cy={mapY(pt.metrics.faithfulness)}
                          r="4"
                          fill="#ffffff"
                          stroke="var(--success)"
                          strokeWidth="2"
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '3px', background: 'var(--success)' }} />
                  <span>Faithfulness</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '3px', background: 'var(--secondary)' }} />
                  <span>Groundedness (No Hallucinations)</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Historical logs table */}
      <section className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--primary)" />
            <span>Detailed Evaluation Log Database</span>
          </h3>
          {history.length > 0 && (
            <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={handleReset}>
              <Trash2 size={12} />
              <span>Reset Evaluation Logs</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '13px' }}>
            No evaluation logs recorded yet. Visit the Chat Page and ask a query to trigger automatic RAG auditing.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Original Query</th>
                  <th style={{ padding: '12px 16px' }}>Normalized Query</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Norm. Applied?</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Intent Conf.</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Intent Acc.</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Precision@K</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>MRR</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Faithfulness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Groundedness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Verifier Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Regens</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Trace ID</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13px' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{new Date(log.date).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px', color: '#ffffff', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.query}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.normalizedQuery || log.query}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: log.normalizationApplied ? 'var(--warning)' : 'var(--text-disabled)' }}>
                      {log.normalizationApplied ? 'Yes' : 'No'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: 'white' }}>
                      {log.intentConfidence !== undefined ? `${(log.intentConfidence * 100).toFixed(0)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: log.intentAccuracy !== undefined ? (log.intentAccuracy >= 0.8 ? 'var(--success)' : 'var(--warning)') : 'var(--text-disabled)' }}>
                      {log.intentAccuracy !== undefined ? `${(log.intentAccuracy * 100).toFixed(0)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-muted)'
                      }}>
                        {log.classification}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: log.metrics.precision >= 0.7 ? 'var(--success)' : 'var(--warning)' }}>
                      {(log.metrics.precision * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: 'white' }}>
                      {log.metrics.mrr.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: log.metrics.faithfulness >= 0.8 ? 'var(--success)' : 'var(--warning)' }}>
                      {(log.metrics.faithfulness * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: log.metrics.groundedness >= 0.8 ? 'var(--success)' : 'var(--warning)' }}>
                      {(log.metrics.groundedness * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: log.verifierScore !== undefined ? (log.verifierScore >= 75 ? 'var(--success)' : 'var(--warning)') : 'var(--text-disabled)' }}>
                      {log.verifierScore !== undefined ? `${log.verifierScore}` : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        background: log.verificationStatus === 'passed' ? 'rgba(10, 220, 160, 0.1)' : log.verificationStatus === 'regenerated' ? 'rgba(255, 180, 0, 0.1)' : log.verificationStatus === 'failed' ? 'rgba(255, 70, 70, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        color: log.verificationStatus === 'passed' ? 'var(--success)' : log.verificationStatus === 'regenerated' ? 'var(--warning)' : log.verificationStatus === 'failed' ? '#ff4646' : 'var(--text-disabled)'
                      }}>
                        {log.verificationStatus || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: log.regeneratedCount ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {log.regeneratedCount !== undefined ? log.regeneratedCount : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-disabled)' }}>
                      {log.traceId}
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

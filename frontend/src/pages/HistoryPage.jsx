import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  History,
  Trash2,
  ExternalLink,
  GitCompare,
  TrendingUp,
  AlertCircle,
  Calendar,
  Award,
  CheckCircle,
  X
} from 'lucide-react';

export default function HistoryPage({ onSelectAnalysis }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistoryItems(data.items || []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this speech evaluation record?")) {
      try {
        await api.deleteAnalysis(id);
        setHistoryItems(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        alert("Failed to delete record: " + err.message);
      }
    }
  };

  const toggleSelectForCompare = (id, e) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(x => x !== id));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], id]);
      } else {
        setSelectedForCompare([...selectedForCompare, id]);
      }
    }
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length !== 2) return;
    setComparing(true);
    try {
      const result = await api.compareAnalyses(selectedForCompare[0], selectedForCompare[1]);
      setComparisonResult(result);
    } catch (err) {
      alert("Comparison failed: " + err.message);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.7rem' }}>Speech Evaluation History</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Permanent record of completed analyses stored in SQLite. Select any two attempts to evaluate forensic improvement deltas.
          </p>
        </div>

        {selectedForCompare.length === 2 && (
          <button
            onClick={handleRunComparison}
            disabled={comparing}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <GitCompare size={16} /> Compare Selected 2 Attempts
          </button>
        )}
      </div>

      {/* Comparison Modal */}
      {comparisonResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 10, 20, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}>
                <GitCompare size={20} color="var(--cyan-bright)" />
                Comparative Attempt Delta Analysis
              </h3>
              <button
                onClick={() => setComparisonResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: comparisonResult.improvement_detected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${comparisonResult.improvement_detected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: comparisonResult.improvement_detected ? '#34D399' : '#FBBF24' }}>
                {comparisonResult.improvement_detected ? "Measurable Progress Detected!" : "Performance Consistency / Regressed Dimension"}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                Overall delivery score shifted by <strong>{comparisonResult.score_deltas.overall > 0 ? `+${comparisonResult.score_deltas.overall}%` : `${comparisonResult.score_deltas.overall}%`}</strong> ({comparisonResult.attempt_1.scores.overall}% → {comparisonResult.attempt_2.scores.overall}%)
              </div>
            </div>

            {/* Delta Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>Category</th>
                  <th style={{ padding: '8px 10px' }}>Attempt 1</th>
                  <th style={{ padding: '8px 10px' }}>Attempt 2</th>
                  <th style={{ padding: '8px 10px' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparisonResult.score_deltas).map(([cat, delta]) => {
                  const s1 = comparisonResult.attempt_1.scores[cat];
                  const s2 = comparisonResult.attempt_2.scores[cat];
                  return (
                    <tr key={cat} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', textTransform: 'capitalize', fontWeight: 600, color: '#fff' }}>{cat.replace('_', ' ')}</td>
                      <td style={{ padding: '10px' }}>{s1}%</td>
                      <td style={{ padding: '10px' }}>{s2}%</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: delta > 0 ? 'var(--success)' : (delta < 0 ? 'var(--danger)' : 'var(--text-muted)') }}>
                        {delta > 0 ? `+${delta}%` : `${delta}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={() => setComparisonResult(null)} className="btn btn-secondary">
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Items List */}
      {historyItems.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <History size={48} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>No Evaluation History Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Completed speech recordings and their temporal flaw groundings will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {historyItems.map((item) => {
            const isSelected = selectedForCompare.includes(item.id);

            return (
              <div
                key={item.id}
                className="glass-panel"
                onClick={() => onSelectAnalysis(item.id)}
                style={{
                  padding: '18px 24px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--cyan-bright)' : 'var(--border-subtle)',
                  boxShadow: isSelected ? '0 0 16px var(--cyan-glow)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Compare checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => toggleSelectForCompare(item.id, e)}
                      title="Select for comparison"
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cyan-bright)' }}
                    />

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                          {item.filename}
                        </span>
                        {item.is_contrastive && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '2px 6px', borderRadius: '4px' }}>
                            Contrastive
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {item.id}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        "{item.transcript}"
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {item.flaw_count} flaws detected • Recorded on {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Score & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        color: item.overall_score >= 80 ? '#10B981' : (item.overall_score >= 65 ? '#38BDF8' : '#F59E0B')
                      }}>
                        {item.overall_score}%
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Overall Score
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="btn btn-danger"
                        style={{ padding: '8px', borderRadius: '6px' }}
                        title="Delete evaluation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

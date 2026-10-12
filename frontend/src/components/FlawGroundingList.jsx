import React, { useState } from 'react';
import { AlertCircle, Clock, TrendingUp, CheckCircle, Lightbulb, Filter, ArrowUpDown } from 'lucide-react';

export default function FlawGroundingList({
  flaws = [],
  activeFlaw = null,
  onSelectFlaw = null
}) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp' | 'severity'

  if (!flaws || flaws.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <CheckCircle size={42} color="var(--success)" style={{ margin: '0 auto 12px' }} />
        <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '6px' }}>Flawless Delivery</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          No acoustic anomalies or rubric deviations were grounded in this speech interval.
        </p>
      </div>
    );
  }

  // Filter
  const filtered = flaws.filter((f) => {
    if (filterSeverity === 'all') return true;
    return f.severity === filterSeverity;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'timestamp') return a.start_time - b.start_time;
    const rank = { severe: 3, moderate: 2, mild: 1 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0);
  });

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="panel-title">
            <AlertCircle size={20} color="var(--danger)" />
            Temporal Flaw Grounding ({flaws.length} Detected)
          </h3>
          <p className="panel-subtitle" style={{ marginBottom: 0 }}>
            Click any flaw below to instantly jump the audio player and inspect mathematical proof
          </p>
        </div>

        {/* Filter and Sort Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="select-input"
            style={{ padding: '6px 12px', fontSize: '0.82rem', width: 'auto' }}
          >
            <option value="all">All Severities</option>
            <option value="severe">Severe Only</option>
            <option value="moderate">Moderate Only</option>
            <option value="mild">Mild Only</option>
          </select>

          <button
            onClick={() => setSortBy(sortBy === 'timestamp' ? 'severity' : 'timestamp')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <ArrowUpDown size={14} /> Sort: {sortBy === 'timestamp' ? 'Time' : 'Severity'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
        {sorted.map((flaw, idx) => {
          const isSelected = activeFlaw && activeFlaw.start_time === flaw.start_time;

          return (
            <div
              key={idx}
              className={`flaw-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectFlaw && onSelectFlaw(flaw)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`severity-pill severity-${flaw.severity}`}>
                    {flaw.severity}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>
                    {flaw.category}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--cyan-bright)' }}>
                  <Clock size={14} />
                  {flaw.start_time.toFixed(2)}s – {flaw.end_time.toFixed(2)}s ({flaw.duration.toFixed(2)}s)
                </div>
              </div>

              {/* Mathematical Evidence */}
              <div style={{
                background: 'rgba(7, 12, 24, 0.6)',
                borderRadius: '6px',
                padding: '8px 12px',
                margin: '8px 0',
                fontSize: '0.82rem',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Measured: </span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{flaw.measured_value} {flaw.unit}</span>
                </div>
                {flaw.reference_value !== null && flaw.reference_value !== undefined && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Baseline: </span>
                    <span style={{ fontWeight: 600, color: '#38BDF8' }}>{flaw.reference_value} {flaw.unit}</span>
                  </div>
                )}
                {flaw.delta !== null && flaw.delta !== undefined && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Acoustic Delta: </span>
                    <span style={{ fontWeight: 600, color: flaw.delta > 0 ? '#F87171' : '#FBBF24' }}>
                      {flaw.delta > 0 ? `+${flaw.delta}` : flaw.delta} {flaw.unit}
                    </span>
                  </div>
                )}
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence: </span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(flaw.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Causal Explanation */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                {flaw.explanation}
              </p>

              {/* Actionable Suggestion */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#6EE7B7', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: '4px' }}>
                <Lightbulb size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Actionable Coaching:</strong> {flaw.suggestion}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Mic,
  Upload,
  Database,
  History,
  TrendingUp,
  AlertTriangle,
  Award,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Play
} from 'lucide-react';

export default function HomeDashboard({ onNavigate, onSelectAnalysis }) {
  const [stats, setStats] = useState({
    total_analyses: 0,
    latest_score: null,
    average_score: null,
    frequent_flaws: [],
    items: []
  });
  const [datasetCount, setDatasetCount] = useState(8);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const histData = await api.getHistory();
      setStats(histData);
      const ds = await api.getDataset();
      setDatasetCount(ds.length);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Welcome Banner */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(14, 22, 40, 0.95), rgba(37, 99, 235, 0.2))',
        border: '1px solid var(--border-glow)',
        marginBottom: '28px',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="brand-badge" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
              Multimodal AI Hackathon 2026 • Track C
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Team: Ranjeet Kumar & Deepak Kumar
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '14px' }}>
            Contrastive Speech Analytics & <br />
            <span style={{ background: 'linear-gradient(90deg, #38BDF8, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Temporal Flaw Grounding
            </span>
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Eliminating subjective judging in competitive forensics and oratory. SpeechCoach AI pairs participant speech with ideal delivery baselines, pins rhetorical delivery flaws to precise audio timestamps, and produces mathematically reproducible rubric scores.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('analyze')}
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Mic size={18} /> Analyze Speech Now
            </button>
            <button
              onClick={() => onNavigate('dataset')}
              className="btn btn-secondary"
              style={{ padding: '12px 22px', fontSize: '0.95rem' }}
            >
              <Database size={18} /> Explore Paired Dataset ({datasetCount} Samples)
            </button>
          </div>
        </div>

        {/* Ambient background blur */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          bottom: '-40px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Metric Cards Row */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="score-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="score-label">Total Analyses</span>
            <Award size={20} color="var(--cyan-bright)" />
          </div>
          <div className="score-value" style={{ color: '#fff' }}>
            {stats.total_analyses}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Stored runs in reproducible SQLite record
          </p>
        </div>

        <div className="score-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="score-label">Latest Speech Score</span>
            <TrendingUp size={20} color="#10B981" />
          </div>
          <div className="score-value" style={{ color: stats.latest_score !== null ? (stats.latest_score >= 75 ? '#10B981' : '#F59E0B') : 'var(--text-muted)' }}>
            {stats.latest_score !== null ? `${stats.latest_score}%` : 'N/A'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {stats.latest_score !== null ? 'Recent evaluation score' : 'No recorded analysis yet'}
          </p>
        </div>

        <div className="score-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="score-label">Average Score</span>
            <Sparkles size={20} color="#F59E0B" />
          </div>
          <div className="score-value" style={{ color: '#F59E0B' }}>
            {stats.average_score !== null ? `${stats.average_score}%` : 'N/A'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Historical student forensic baseline
          </p>
        </div>

        <div className="score-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="score-label">Flaw Categories</span>
            <AlertTriangle size={20} color="#EF4444" />
          </div>
          <div className="score-value" style={{ color: '#EF4444' }}>
            8
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Track C contrastive flaw taxonomy
          </p>
        </div>
      </div>

      {/* Main Grid: Frequent Flaws & Recent Attempts */}
      <div className="grid-2">
        {/* Most Frequently Detected Flaws */}
        <div className="glass-panel">
          <h3 className="panel-title">
            <AlertTriangle size={18} color="var(--warning)" />
            Most Frequently Grounded Delivery Flaws
          </h3>
          <p className="panel-subtitle">
            Acoustic defects identified across speaker submissions
          </p>

          {stats.frequent_flaws.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No speech flaws logged yet. Perform an analysis to view detection frequencies.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.frequent_flaws.slice(0, 5).map((f, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono)' }}>
                      0{i + 1}
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#fff' }}>
                      {f.flaw}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#F87171',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {f.count} instances
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Analysis History */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 className="panel-title">
              <History size={18} color="var(--cyan-bright)" />
              Recent Speech Evaluations
            </h3>
            <button
              onClick={() => onNavigate('history')}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <p className="panel-subtitle">
            Latest saved performance evaluations and scores
          </p>

          {stats.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No evaluations found. Start your first contrastive evaluation!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectAnalysis(item.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cyan-bright)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                        {item.filename}
                      </span>
                      {item.is_contrastive && (
                        <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '1px 6px', borderRadius: '3px' }}>
                          Contrastive
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {item.flaw_count} flaws grounded • {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: item.overall_score >= 80 ? '#10B981' : (item.overall_score >= 65 ? '#38BDF8' : '#F59E0B')
                    }}>
                      {item.overall_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Award, Gauge, PauseCircle, Music, Zap, Volume2 } from 'lucide-react';

export default function ScoreBreakdownCards({ scores }) {
  if (!scores) return null;

  const categories = [
    {
      key: 'pacing',
      name: 'Pacing',
      score: scores.pacing,
      weight: scores.weights?.pacing ? `${(scores.weights.pacing * 100).toFixed(0)}%` : '25%',
      icon: <Gauge size={20} color="#38BDF8" />,
      color: '#38BDF8',
      desc: 'Tempo balance, speech rate stability, WPM bounds'
    },
    {
      key: 'pause_management',
      name: 'Pause Management',
      score: scores.pause_management,
      weight: scores.weights?.pause_management ? `${(scores.weights.pause_management * 100).toFixed(0)}%` : '20%',
      icon: <PauseCircle size={20} color="#10B981" />,
      color: '#10B981',
      desc: 'Rhetorical breathing, pause duration & placement'
    },
    {
      key: 'pitch_variation',
      name: 'Pitch Variation',
      score: scores.pitch_variation,
      weight: scores.weights?.pitch_variation ? `${(scores.weights.pitch_variation * 100).toFixed(0)}%` : '20%',
      icon: <Music size={20} color="#F59E0B" />,
      color: '#F59E0B',
      desc: 'Tonal inflection, avoidance of monotone prosody'
    },
    {
      key: 'vocal_energy',
      name: 'Vocal Energy',
      score: scores.vocal_energy,
      weight: scores.weights?.vocal_energy ? `${(scores.weights.vocal_energy * 100).toFixed(0)}%` : '15%',
      icon: <Zap size={20} color="#EF4444" />,
      color: '#EF4444',
      desc: 'Dynamic range, power consistency, projection'
    },
    {
      key: 'articulation',
      name: 'Articulation',
      score: scores.articulation,
      weight: scores.weights?.articulation ? `${(scores.weights.articulation * 100).toFixed(0)}%` : '20%',
      icon: <Volume2 size={20} color="#A855F7" />,
      color: '#A855F7',
      desc: 'Consonant clarity, spectral centroid presence'
    }
  ];

  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#38BDF8';
    if (score >= 55) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div>
      {/* Overall Score Banner */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(6, 182, 212, 0.15))',
        border: '1px solid var(--border-glow)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--blue-primary), var(--cyan-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px var(--cyan-glow)'
          }}>
            <Award size={36} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                Overall Delivery Score
              </h2>
              <span className="status-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                Weighted Rubric Standard
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              Reproducible composite score calculated across five acoustic dimensions
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3.4rem',
            fontWeight: 800,
            lineHeight: 1,
            color: getScoreColor(scores.overall),
            textShadow: `0 0 30px ${getScoreColor(scores.overall)}40`
          }}>
            {scores.overall}
            <span style={{ fontSize: '1.4rem', color: 'var(--text-muted)', fontWeight: 500 }}>/100</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {scores.overall >= 85 ? 'Superior Forensic Standard' : (scores.overall >= 70 ? 'Proficient Delivery' : 'Needs Targeted Coaching')}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid-5">
        {categories.map((cat) => (
          <div key={cat.key} className="score-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              {cat.icon}
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                Weight: {cat.weight}
              </span>
            </div>

            <div className="score-label" style={{ marginTop: '6px' }}>{cat.name}</div>
            <div className="score-value" style={{ color: getScoreColor(cat.score) }}>
              {cat.score}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>%</span>
            </div>

            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{
                  width: `${cat.score}%`,
                  backgroundColor: cat.color,
                  boxShadow: `0 0 10px ${cat.color}60`
                }}
              />
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.3 }}>
              {cat.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import { Activity, Volume2, Music, Sparkles } from 'lucide-react';

export default function AcousticContourCharts({
  timeSeries = [],
  flaws = [],
  activeFlaw = null,
  isContrastive = false,
  currentTime = null,
  onSeek = null
}) {
  const [activeTab, setActiveTab] = useState('energy'); // 'energy' | 'pitch' | 'clarity'

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No time-series feature data available.</p>
      </div>
    );
  }

  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#0B132B',
          border: '1px solid var(--border-glow)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: '0.82rem',
        }}>
          <p style={{ color: 'var(--cyan-bright)', fontWeight: 600, marginBottom: '6px' }}>
            Timestamp: {Number(label).toFixed(2)}s
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
              {entry.name}: <span style={{ fontWeight: 600 }}>{entry.value !== null ? entry.value : 'Unvoiced'}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="panel-title">
            <Activity size={20} color="var(--cyan-bright)" />
            Acoustic Signal Contours & Contrastive Overlay
          </h3>
          <p className="panel-subtitle" style={{ marginBottom: 0 }}>
            {isContrastive 
              ? "Time-aligned comparison between participant speech and ideal delivery baseline" 
              : "Continuous acoustic trajectory and detected temporal anomalies"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(14, 22, 40, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('energy')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'energy' ? 'var(--blue-primary)' : 'transparent',
              color: activeTab === 'energy' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Volume2 size={14} /> RMS Energy
          </button>
          <button
            onClick={() => setActiveTab('pitch')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'pitch' ? 'var(--blue-primary)' : 'transparent',
              color: activeTab === 'pitch' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Music size={14} /> Pitch (F0 / Semitones)
          </button>
          <button
            onClick={() => setActiveTab('clarity')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'clarity' ? 'var(--blue-primary)' : 'transparent',
              color: activeTab === 'clarity' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles size={14} /> Spectral Centroid
          </button>
        </div>
      </div>

      <div style={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeSeries}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            onClick={(e) => {
              if (e && e.activeLabel !== undefined && onSeek) {
                onSeek(parseFloat(e.activeLabel));
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="time"
              stroke="#64748B"
              fontSize={11}
              tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
            />
            <YAxis stroke="#64748B" fontSize={11} />
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />

            {/* Active Flaw Highlight Area */}
            {activeFlaw && (
              <ReferenceArea
                x1={activeFlaw.start_time}
                x2={activeFlaw.end_time}
                stroke="rgba(239, 68, 68, 0.8)"
                strokeOpacity={0.8}
                fill="rgba(239, 68, 68, 0.15)"
              />
            )}

            {activeTab === 'energy' && (
              <>
                <Line
                  type="monotone"
                  dataKey="participant_energy"
                  name="Participant Energy (%)"
                  stroke="#38BDF8"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#38BDF8' }}
                />
                {isContrastive && (
                  <Line
                    type="monotone"
                    dataKey="reference_energy"
                    name="Ideal Baseline Energy (%)"
                    stroke="#10B981"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </>
            )}

            {activeTab === 'pitch' && (
              <>
                <Line
                  type="monotone"
                  dataKey="participant_semitones"
                  name="Participant Inflection (Semitones)"
                  stroke="#F59E0B"
                  strokeWidth={2.2}
                  connectNulls={false}
                  dot={false}
                  activeDot={{ r: 5, fill: '#F59E0B' }}
                />
                {isContrastive && (
                  <Line
                    type="monotone"
                    dataKey="reference_semitones"
                    name="Ideal Inflection (Semitones)"
                    stroke="#10B981"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    connectNulls={false}
                    dot={false}
                  />
                )}
              </>
            )}

            {activeTab === 'clarity' && (
              <>
                <Line
                  type="monotone"
                  dataKey="participant_centroid"
                  name="Participant Centroid (Hz)"
                  stroke="#A855F7"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#A855F7' }}
                />
                {isContrastive && (
                  <Line
                    type="monotone"
                    dataKey="reference_centroid"
                    name="Ideal Centroid (Hz)"
                    stroke="#10B981"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

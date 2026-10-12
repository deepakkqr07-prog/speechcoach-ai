import React from 'react';
import { AlignLeft, Clock } from 'lucide-react';

export default function WordAlignmentViewer({
  words = [],
  currentTime = 0,
  flaws = [],
  onSeek = null
}) {
  if (!words || words.length === 0) return null;

  return (
    <div className="glass-panel" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 className="panel-title">
          <AlignLeft size={20} color="var(--cyan-bright)" />
          Temporally Aligned Transcript ({words.length} Words)
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Click any word to seek playback
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        maxHeight: '180px',
        overflowY: 'auto',
        padding: '12px',
        background: 'rgba(10, 16, 30, 0.6)',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}>
        {words.map((w, idx) => {
          const isCurrent = currentTime >= w.start_time && currentTime <= w.end_time;
          
          // Check if word falls inside a flaw interval
          const wordFlaw = flaws.find(f => 
            (w.start_time >= f.start_time && w.start_time <= f.end_time) ||
            (w.end_time >= f.start_time && w.end_time <= f.end_time)
          );

          let borderStyle = '1px solid transparent';
          let textColor = 'var(--text-secondary)';
          let bgColor = 'rgba(255, 255, 255, 0.03)';

          if (isCurrent) {
            bgColor = 'var(--blue-primary)';
            textColor = '#fff';
            borderStyle = '1px solid var(--cyan-bright)';
          } else if (wordFlaw) {
            bgColor = wordFlaw.severity === 'severe' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.18)';
            textColor = wordFlaw.severity === 'severe' ? '#FCA5A5' : '#FCD34D';
            borderStyle = wordFlaw.severity === 'severe' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)';
          }

          return (
            <span
              key={idx}
              onClick={() => onSeek && onSeek(w.start_time)}
              title={`${w.word} [${w.start_time.toFixed(2)}s - ${w.end_time.toFixed(2)}s] ${wordFlaw ? `(Flaw: ${wordFlaw.category})` : ''}`}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.86rem',
                cursor: 'pointer',
                background: bgColor,
                color: textColor,
                border: borderStyle,
                transition: 'all 0.15s ease'
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

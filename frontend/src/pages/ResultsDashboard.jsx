import React, { useState } from 'react';
import { api } from '../services/api';
import AudioWaveformPlayer from '../components/AudioWaveformPlayer';
import ScoreBreakdownCards from '../components/ScoreBreakdownCards';
import AcousticContourCharts from '../charts/AcousticContourCharts';
import FlawGroundingList from '../components/FlawGroundingList';
import WordAlignmentViewer from '../components/WordAlignmentViewer';
import {
  Download,
  Share2,
  FileSpreadsheet,
  FileCode,
  ArrowLeft,
  Layers,
  Award,
  Sparkles
} from 'lucide-react';

export default function ResultsDashboard({ analysisData, onBack }) {
  const [activeFlaw, setActiveFlaw] = useState(null);
  const [seekTime, setSeekTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeAudioSource, setActiveAudioSource] = useState('participant'); // 'participant' | 'reference'

  if (!analysisData) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No analysis selected.</p>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const {
    analysis_id,
    created_at,
    filename,
    audio_url,
    reference_audio_url,
    transcript,
    is_contrastive,
    scores,
    flaws = [],
    time_series = [],
    words_alignment = [],
    summary_metrics = {}
  } = analysisData;

  const currentAudioUrl = activeAudioSource === 'reference' && reference_audio_url
    ? api.getAudioUrl(reference_audio_url)
    : api.getAudioUrl(audio_url);

  // Handle clicking a flaw card
  const handleSelectFlaw = (flaw) => {
    setActiveFlaw(flaw);
    setSeekTime(flaw.start_time);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysisData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `speechcoach_report_${analysis_id}.json`);
    dlAnchor.click();
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = "category,start_time,end_time,duration,severity,confidence,measured,reference,delta,explanation,suggestion\n";
    flaws.forEach(f => {
      csv += `"${f.category}",${f.start_time},${f.end_time},${f.duration},"${f.severity}",${f.confidence},${f.measured_value},"${f.reference_value || ''}","${f.delta || ''}","${f.explanation.replace(/"/g, '""')}","${f.suggestion.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", url);
    dlAnchor.setAttribute("download", `speechcoach_flaws_${analysis_id}.csv`);
    dlAnchor.click();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="page-title" style={{ fontSize: '1.45rem', marginBottom: 0 }}>
                {filename}
              </h2>
              {is_contrastive ? (
                <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  Contrastive Baseline Evaluation
                </span>
              ) : (
                <span className="status-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                  Standalone Rubric Evaluation
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Analysis ID: {analysis_id} • Evaluated {created_at}
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportJSON} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <FileCode size={14} /> Export JSON
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <FileSpreadsheet size={14} /> Export Flaws CSV
          </button>
        </div>
      </div>

      {/* 1. Score Summary Cards */}
      <ScoreBreakdownCards scores={scores} />

      {/* 2. WaveSurfer Audio Player */}
      <div className="glass-panel" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="panel-title" style={{ marginBottom: 0 }}>
            Interactive Waveform & Temporal Player
          </h3>

          {/* Toggle between Participant and Reference audio if contrastive */}
          {is_contrastive && reference_audio_url && (
            <div style={{ display: 'flex', background: 'rgba(10, 16, 30, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveAudioSource('participant')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeAudioSource === 'participant' ? 'var(--blue-primary)' : 'transparent',
                  color: activeAudioSource === 'participant' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Participant Audio
              </button>
              <button
                onClick={() => setActiveAudioSource('reference')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeAudioSource === 'reference' ? 'var(--success)' : 'transparent',
                  color: activeAudioSource === 'reference' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Ideal Reference Baseline
              </button>
            </div>
          )}
        </div>

        <AudioWaveformPlayer
          audioUrl={currentAudioUrl}
          flaws={activeAudioSource === 'participant' ? flaws : []}
          activeFlaw={activeAudioSource === 'participant' ? activeFlaw : null}
          seekTime={seekTime}
          onTimeUpdate={(t) => setCurrentTime(t)}
          label={activeAudioSource === 'participant' ? "Participant Delivery Audio" : "Ideal Delivery Baseline Audio"}
        />
      </div>

      {/* 3. Recharts Acoustic Contours */}
      <AcousticContourCharts
        timeSeries={timeSeries}
        flaws={flaws}
        activeFlaw={activeFlaw}
        isContrastive={is_contrastive}
        currentTime={currentTime}
        onSeek={(t) => setSeekTime(t)}
      />

      {/* 4. Word-Level Alignment Transcript */}
      <WordAlignmentViewer
        words={words_alignment}
        currentTime={currentTime}
        flaws={flaws}
        onSeek={(t) => setSeekTime(t)}
      />

      {/* 5. Flaw Timeline Cards */}
      <FlawGroundingList
        flaws={flaws}
        activeFlaw={activeFlaw}
        onSelectFlaw={handleSelectFlaw}
      />
    </div>
  );
}

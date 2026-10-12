import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Database,
  Download,
  Filter,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  Tag
} from 'lucide-react';

export default function DatasetExplorer({ onAnalyzeSample }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSplit, setSelectedSplit] = useState('all');
  const [playingAudio, setPlayingAudio] = useState(null); // { id, type: 'ideal' | 'flawed' }
  const audioRef = React.useRef(new Audio());

  useEffect(() => {
    loadDataset();
    return () => {
      audioRef.current.pause();
    };
  }, []);

  const loadDataset = async () => {
    setLoading(true);
    try {
      const data = await api.getDataset();
      setSamples(data);
    } catch (err) {
      console.error("Error loading dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (sampleId, type, path) => {
    if (playingAudio && playingAudio.id === sampleId && playingAudio.type === type) {
      audioRef.current.pause();
      setPlayingAudio(null);
    } else {
      audioRef.current.pause();
      audioRef.current.src = api.getAudioUrl(path);
      audioRef.current.play();
      setPlayingAudio({ id: sampleId, type });
      audioRef.current.onended = () => setPlayingAudio(null);
    }
  };

  // Filter
  const filtered = samples.filter(s => {
    if (selectedCategory !== 'all' && s.flaw_category !== selectedCategory) return false;
    if (selectedSplit !== 'all' && s.split !== selectedSplit) return false;
    return true;
  });

  const uniqueCategories = Array.from(new Set(samples.map(s => s.flaw_category)));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 className="page-title" style={{ fontSize: '1.7rem' }}>Contrastive Speech Dataset</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Paired "Ideal" vs "Flawed" speech recordings engineered for Track C evaluation with exact temporal ground truth
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={api.getExportDatasetUrl('json')}
            download
            className="btn btn-secondary"
            style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <FileCode size={14} /> Export JSON
          </a>
          <a
            href={api.getExportDatasetUrl('csv')}
            download
            className="btn btn-secondary"
            style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <FileSpreadsheet size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--cyan-bright)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Filter By:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All 8 Flaw Categories</option>
            {uniqueCategories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedSplit}
            onChange={(e) => setSelectedSplit(e.target.value)}
            className="select-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All Splits (Train/Val/Test)</option>
            <option value="train">Train Split</option>
            <option value="validation">Validation Split</option>
            <option value="test">Test Split</option>
          </select>

          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {samples.length} paired samples
          </span>
        </div>
      </div>

      {/* Dataset Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.map((item) => {
          const isPlayingIdeal = playingAudio && playingAudio.id === item.sample_id && playingAudio.type === 'ideal';
          const isPlayingFlawed = playingAudio && playingAudio.id === item.sample_id && playingAudio.type === 'flawed';

          return (
            <div key={item.sample_id} className="glass-panel" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--cyan-bright)' }}>
                      {item.sample_id}
                    </span>
                    <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', background: 'rgba(37,99,235,0.15)', color: '#60A5FA', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.split}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {item.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`severity-pill severity-${item.severity}`}>
                    {item.severity} severity
                  </span>
                  <button
                    onClick={() => onAnalyzeSample(item.sample_id)}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    <Sparkles size={14} /> Analyze Pair
                  </button>
                </div>
              </div>

              {/* Transcript */}
              <div style={{
                background: 'rgba(10, 16, 30, 0.5)',
                padding: '10px 14px',
                borderRadius: '6px',
                margin: '10px 0',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                fontStyle: 'italic'
              }}>
                "{item.transcript}"
              </div>

              {/* Flaw Details & Audio Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '12px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Ground Truth Flaw: </span>
                  {item.flaw_category} ({item.flaw_start}s – {item.flaw_end}s) • {item.annotation_notes}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handlePlayAudio(item.sample_id, 'ideal', item.ideal_audio_path)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderColor: isPlayingIdeal ? 'var(--success)' : 'var(--border-subtle)' }}
                  >
                    {isPlayingIdeal ? <Pause size={14} /> : <Play size={14} />}
                    Play Ideal Baseline
                  </button>

                  <button
                    onClick={() => handlePlayAudio(item.sample_id, 'flawed', item.flawed_audio_path)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', borderColor: isPlayingFlawed ? 'var(--danger)' : 'var(--border-subtle)' }}
                  >
                    {isPlayingFlawed ? <Pause size={14} /> : <Play size={14} />}
                    Play Flawed Mirror
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

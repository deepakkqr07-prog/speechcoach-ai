import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import HomeDashboard from './pages/HomeDashboard';
import AnalyzeSpeech from './pages/AnalyzeSpeech';
import ResultsDashboard from './pages/ResultsDashboard';
import DatasetExplorer from './pages/DatasetExplorer';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';
import {
  LayoutDashboard,
  Mic,
  Database,
  History,
  Info,
  Sparkles,
  Award,
  Activity,
  Layers
} from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting'); // 'online' | 'offline' | 'connecting'

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      await api.getHealth();
      setBackendStatus('online');
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  const handleAnalysisComplete = (result) => {
    setActiveAnalysis(result);
    setCurrentPage('results');
  };

  const handleSelectHistoryItem = async (analysisId) => {
    try {
      const detail = await api.getAnalysisDetail(analysisId);
      setActiveAnalysis(detail);
      setCurrentPage('results');
    } catch (err) {
      alert("Failed to load analysis: " + err.message);
    }
  };

  const handleAnalyzeDatasetSample = async (sampleId) => {
    try {
      const sample = await api.getSampleDetail(sampleId);
      // Fetch audio file from server and execute analysis directly
      const flawedUrl = api.getAudioUrl(sample.flawed_audio_path);
      const res = await fetch(flawedUrl);
      const blob = await res.blob();
      const file = new File([blob], `${sample.sample_id}_submission.wav`, { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('audio_file', file);
      formData.append('transcript', sample.transcript);
      formData.append('reference_sample_id', sample.sample_id);
      formData.append('speaker_id', sample.speaker_id);

      const analysisResult = await api.analyzeSpeech(formData);
      setActiveAnalysis(analysisResult);
      setCurrentPage('results');
    } catch (err) {
      alert("Error analyzing sample: " + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <Activity size={22} color="#fff" />
          </div>
          <div>
            <div className="brand-title">SpeechCoach AI</div>
            <span className="brand-badge">Track C • Forensics</span>
          </div>
        </div>

        <ul className="nav-links">
          <li
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>

          <li
            className={`nav-item ${currentPage === 'analyze' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analyze')}
          >
            <Mic size={18} />
            <span>Analyze Speech</span>
          </li>

          {activeAnalysis && (
            <li
              className={`nav-item ${currentPage === 'results' ? 'active' : ''}`}
              onClick={() => setCurrentPage('results')}
            >
              <Sparkles size={18} color="var(--cyan-bright)" />
              <span style={{ color: 'var(--cyan-bright)', fontWeight: 600 }}>Active Report</span>
            </li>
          )}

          <li
            className={`nav-item ${currentPage === 'dataset' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dataset')}
          >
            <Database size={18} />
            <span>Dataset</span>
          </li>

          <li
            className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentPage('history')}
          >
            <History size={18} />
            <span>History</span>
          </li>

          <li
            className={`nav-item ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => setCurrentPage('about')}
          >
            <Info size={18} />
            <span>About & Rubric</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="status-dot" style={{ backgroundColor: backendStatus === 'online' ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {backendStatus === 'online' ? "Acoustic AI Engine" : "Connecting..."}
            </span>
          </div>
          <div>FastAPI • Librosa • Whisper • YIN</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Platform:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
              Multimodal Speech Evaluator
            </span>
          </div>

          <div className="topbar-actions">
            <div className="status-badge">
              <span className="status-dot" />
              <span>Reproducible Scoring Active</span>
            </div>
          </div>
        </header>

        <div className="content-body">
          {currentPage === 'dashboard' && (
            <HomeDashboard
              onNavigate={(page) => setCurrentPage(page)}
              onSelectAnalysis={handleSelectHistoryItem}
            />
          )}

          {currentPage === 'analyze' && (
            <AnalyzeSpeech
              onAnalysisComplete={handleAnalysisComplete}
            />
          )}

          {currentPage === 'results' && (
            <ResultsDashboard
              analysisData={activeAnalysis}
              onBack={() => setCurrentPage('dashboard')}
            />
          )}

          {currentPage === 'dataset' && (
            <DatasetExplorer
              onAnalyzeSample={handleAnalyzeDatasetSample}
            />
          )}

          {currentPage === 'history' && (
            <HistoryPage
              onSelectAnalysis={handleSelectHistoryItem}
            />
          )}

          {currentPage === 'about' && (
            <AboutPage />
          )}
        </div>
      </main>
    </div>
  );
}

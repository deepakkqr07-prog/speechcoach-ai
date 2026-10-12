import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Upload,
  Mic,
  Square,
  FileText,
  Sliders,
  Sparkles,
  Layers,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

export default function AnalyzeSpeech({ onAnalysisComplete }) {
  // Input modes
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [speakerId, setSpeakerId] = useState('SPEAKER_01');
  const [selectedReferenceSample, setSelectedReferenceSample] = useState('');
  const [customRefAudio, setCustomRefAudio] = useState(null);
  
  // Audio playback preview
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  // Microphone recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Dataset reference list
  const [datasetSamples, setDatasetSamples] = useState([]);

  // Rubric configuration
  const [showRubricConfig, setShowRubricConfig] = useState(false);
  const [rubricWeights, setRubricWeights] = useState({
    pacing: 0.25,
    pause_management: 0.20,
    pitch_variation: 0.20,
    vocal_energy: 0.15,
    articulation: 0.20
  });

  // Processing state
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadDatasetSamples();
  }, []);

  const loadDatasetSamples = async () => {
    try {
      const data = await api.getDataset();
      setDatasetSamples(data);
    } catch (err) {
      console.error("Could not fetch dataset samples for reference:", err);
    }
  };

  // Microphone recording functions
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], `recorded_speech_${Date.now()}.wav`, { type: 'audio/wav' });
        setAudioFile(file);
        setAudioPreviewUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg("Microphone permission denied or device unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Handle file drop/change
  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleTranscriptFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTranscript(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Prepopulate from a dataset sample for instant test
  const handleLoadDemoSample = (sampleId) => {
    const sample = datasetSamples.find(s => s.sample_id === sampleId);
    if (sample) {
      setSelectedReferenceSample(sampleId);
      setTranscript(sample.transcript);
      // Fetch flawed audio as audioFile
      const flawedUrl = api.getAudioUrl(sample.flawed_audio_path);
      fetch(flawedUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `${sample.sample_id}_submission.wav`, { type: 'audio/wav' });
          setAudioFile(file);
          setAudioPreviewUrl(URL.createObjectURL(blob));
        })
        .catch(err => console.error("Error loading sample audio:", err));
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) {
      setErrorMsg("Please upload or record an audio file first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setProcessingStep("1/4 Loading & Validating Acoustic Signal...");

    try {
      const formData = new FormData();
      formData.append('audio_file', audioFile);
      if (transcript.trim()) {
        formData.append('transcript', transcript.trim());
      }
      formData.append('speaker_id', speakerId);

      if (selectedReferenceSample) {
        formData.append('reference_sample_id', selectedReferenceSample);
      } else if (customRefAudio) {
        formData.append('reference_audio', customRefAudio);
      }

      // Append custom rubric weights
      formData.append('custom_rubric', JSON.stringify({
        weights: rubricWeights
      }));

      setTimeout(() => setProcessingStep("2/4 Transcribing & Aligning Temporal Words..."), 700);
      setTimeout(() => setProcessingStep("3/4 Extracting MFCC, F0 Pitch, RMS & Formants..."), 1400);
      setTimeout(() => setProcessingStep("4/4 Grounding Temporal Flaws & Calculating Rubric Scores..."), 2200);

      const result = await api.analyzeSpeech(formData);
      setLoading(false);
      onAnalysisComplete(result);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || "Speech analysis failed.");
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 className="page-title" style={{ fontSize: '1.7rem' }}>Analyze Speech Delivery</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Compare participant speech against ideal rhetorical baselines, extract time-aligned acoustic features, and temporally ground flaws.
        </p>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#FCA5A5',
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Demonstration Preset Picker */}
      <div className="glass-panel" style={{
        marginBottom: '24px',
        background: 'rgba(14, 22, 40, 0.7)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        padding: '16px 20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="var(--cyan-bright)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
              Instant Hackathon Demo: Load Contrastive Sample Pair
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {datasetSamples.slice(0, 4).map((s) => (
              <button
                key={s.sample_id}
                onClick={() => handleLoadDemoSample(s.sample_id)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {s.flaw_category.split(' ')[0]} ({s.sample_id})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Column: Audio Source */}
        <div className="glass-panel">
          <h3 className="panel-title">
            <Mic size={20} color="var(--cyan-bright)" />
            1. Participant Audio Input
          </h3>
          <p className="panel-subtitle">Upload speech audio file (WAV, MP3, M4A) or record live</p>

          {/* Upload Drop Area */}
          <div style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px 16px',
            textAlign: 'center',
            marginBottom: '16px',
            background: 'rgba(10, 16, 30, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => document.getElementById('audio-upload-input').click()}
          >
            <input
              id="audio-upload-input"
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleAudioUpload}
            />
            <Upload size={32} color="var(--cyan-bright)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '4px' }}>
              {audioFile ? audioFile.name : "Click to select or drag audio file"}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Supports WAV, MP3, FLAC, M4A (Max 50MB)
            </div>
          </div>

          {/* Browser Microphone Recording */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                Browser Microphone
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isRecording ? `Recording active: ${recordingSeconds}s` : "Record speech live"}
              </div>
            </div>

            {isRecording ? (
              <button onClick={stopRecording} className="btn btn-danger recording-active" style={{ padding: '8px 16px' }}>
                <Square size={16} /> Stop Recording
              </button>
            ) : (
              <button onClick={startRecording} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                <Mic size={16} /> Start Recording
              </button>
            )}
          </div>

          {/* Audio Preview Player */}
          {audioPreviewUrl && (
            <div style={{ marginTop: '14px' }}>
              <span className="input-label">Audio Preview:</span>
              <audio controls src={audioPreviewUrl} style={{ width: '100%', height: '40px', borderRadius: '6px' }} />
            </div>
          )}

          {/* Speaker ID */}
          <div className="input-group" style={{ marginTop: '16px' }}>
            <label className="input-label">Speaker / Competitor ID:</label>
            <input
              type="text"
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value)}
              className="text-input"
              placeholder="e.g. DEBATER_04 or ANON"
            />
          </div>
        </div>

        {/* Right Column: Reference & Transcript */}
        <div className="glass-panel">
          <h3 className="panel-title">
            <Layers size={20} color="var(--cyan-bright)" />
            2. Contrastive Reference & Transcript
          </h3>
          <p className="panel-subtitle">Select an ideal delivery benchmark or analyze standalone</p>

          {/* Reference Audio Selector */}
          <div className="input-group">
            <label className="input-label">Ideal Delivery Baseline (Contrastive):</label>
            <select
              value={selectedReferenceSample}
              onChange={(e) => setSelectedReferenceSample(e.target.value)}
              className="select-input"
            >
              <option value="">Standalone Mode (No Reference / Rubric Thresholds)</option>
              {datasetSamples.map((sample) => (
                <option key={sample.sample_id} value={sample.sample_id}>
                  {sample.sample_id}: {sample.title} ({sample.flaw_category})
                </option>
              ))}
            </select>
          </div>

          {/* Transcript input */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>
                Speech Transcript (Text or upload .txt):
              </label>
              <button
                onClick={() => document.getElementById('txt-upload-input').click()}
                style={{ background: 'none', border: 'none', color: 'var(--cyan-bright)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={12} /> Upload .txt
              </button>
              <input
                id="txt-upload-input"
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={handleTranscriptFileUpload}
              />
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="textarea-input"
              placeholder="Enter speech text manually. If left empty, OpenAI Whisper will automatically transcribe your recording."
            />
          </div>

          {/* Editable Rubric Weights Toggle */}
          <div>
            <button
              onClick={() => setShowRubricConfig(!showRubricConfig)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '10px'
              }}
            >
              <Sliders size={14} /> {showRubricConfig ? "Hide Configurable Rubric Weights" : "Customize Rubric Weights (5 Categories)"}
            </button>

            {showRubricConfig && (
              <div style={{
                background: 'rgba(10, 16, 30, 0.6)',
                padding: '14px',
                borderRadius: '8px',
                marginTop: '10px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label>Pacing (Default 25%):</label>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="60"
                      value={rubricWeights.pacing * 100}
                      onChange={(e) => setRubricWeights({ ...rubricWeights, pacing: parseFloat(e.target.value) / 100 })}
                      className="text-input"
                      style={{ padding: '6px' }}
                    />
                  </div>
                  <div>
                    <label>Pause Mgmt (Default 20%):</label>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="60"
                      value={rubricWeights.pause_management * 100}
                      onChange={(e) => setRubricWeights({ ...rubricWeights, pause_management: parseFloat(e.target.value) / 100 })}
                      className="text-input"
                      style={{ padding: '6px' }}
                    />
                  </div>
                  <div>
                    <label>Pitch Variation (Default 20%):</label>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="60"
                      value={rubricWeights.pitch_variation * 100}
                      onChange={(e) => setRubricWeights({ ...rubricWeights, pitch_variation: parseFloat(e.target.value) / 100 })}
                      className="text-input"
                      style={{ padding: '6px' }}
                    />
                  </div>
                  <div>
                    <label>Vocal Energy (Default 15%):</label>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="60"
                      value={rubricWeights.vocal_energy * 100}
                      onChange={(e) => setRubricWeights({ ...rubricWeights, vocal_energy: parseFloat(e.target.value) / 100 })}
                      className="text-input"
                      style={{ padding: '6px' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button & Progress Indicator */}
      <div style={{ marginTop: '28px', textAlign: 'center' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading || !audioFile}
          className="btn btn-primary"
          style={{ padding: '14px 42px', fontSize: '1.05rem', minWidth: '280px' }}
        >
          {loading ? (
            <>
              <Loader size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              Processing Analysis...
            </>
          ) : (
            <>
              <Sparkles size={20} /> Ground Flaws & Compute Scores
            </>
          )}
        </button>

        {loading && (
          <div style={{ marginTop: '14px', color: 'var(--cyan-bright)', fontSize: '0.88rem', fontWeight: 500 }}>
            {processingStep}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

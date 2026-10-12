import React from 'react';
import { Award, Code2, Users, Layers, ShieldCheck, Cpu, Activity, BarChart2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="brand-badge">Multimodal AI Hackathon 2026 • Track C</span>
        </div>
        <h2 className="page-title" style={{ fontSize: '1.9rem' }}>
          About SpeechCoach AI
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem' }}>
          An Explainable AI Speech Coach Grounding Delivery Flaws at Precise Audio Timestamps
        </p>
      </div>

      {/* Team Card */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.1))',
        border: '1px solid var(--border-glow)',
        marginBottom: '24px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Users size={20} color="var(--cyan-bright)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Hackathon Team</h3>
        </div>

        <div className="grid-2">
          <div style={{ background: 'rgba(10, 16, 30, 0.6)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cyan-bright)', fontWeight: 700 }}>Team Leader</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>Ranjeet Kumar</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Architecture, Signal Processing & Contrastive Engine
            </p>
          </div>

          <div style={{ background: 'rgba(10, 16, 30, 0.6)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cyan-bright)', fontWeight: 700 }}>Team Member</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>Deepak Kumar</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Full-Stack UI/UX, Temporal Visualizations & Dataset Engineering
            </p>
          </div>
        </div>
      </div>

      {/* Problem & Motivation */}
      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h3 className="panel-title">
          <Award size={18} color="var(--cyan-bright)" />
          The Forensic Oratory Challenge
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
          Evaluating competitive spoken performances—such as <em>Interpretive Reading, Declamation, Extemporaneous Speaking, and Persuasive Oratory</em>—is inherently subjective. Human judges balance vocal delivery (tone, cadence, volume, pauses) with textual content quality, often producing inconsistent scoring. Participants receive vague comments ("improve delivery") without knowing <strong>what went wrong</strong>, <strong>at what exact timestamp</strong>, or <strong>what acoustic evidence supports the criticism</strong>.
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          SpeechCoach AI solves this by engineering a custom contrastive framework that pairs participant speech with ideal delivery baselines of the exact same text, mathematically pinning acoustic deviations to temporal coordinates.
        </p>
      </div>

      {/* System Architecture */}
      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h3 className="panel-title">
          <Cpu size={18} color="var(--cyan-bright)" />
          Technical Pipeline Architecture
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.2)', color: 'var(--cyan-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              01
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>Audio Preprocessing & Signal Verification</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Signals are normalized to 16,000 Hz mono. Clipping detection identifies digital saturation (amplitude ≥ 0.995). The noise floor and speech energy percentiles estimate SNR without distorting intrinsic dynamic range.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.2)', color: 'var(--cyan-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              02
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>ASR & Forced Word Alignment</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Transcribes speech via OpenAI Whisper with word-level timestamps. When transcripts are supplied by competitors, a pause-aware acoustic alignment algorithm maps words across syllabic nuclei and energy peaks.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.2)', color: 'var(--cyan-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              03
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>Acoustic Feature Extraction</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Extracts 13-coefficient MFCC matrices, YIN algorithm fundamental frequency (F0), short-time RMS energy contours, voice activity detection (VAD), pause intervals, and spectral centroid (timbral brightness).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.2)', color: 'var(--cyan-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              04
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>Speaker-Agnostic Normalization</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                To avoid penalizing biological pitch differences (baritone vs soprano) or native accents, pitch is mapped to semitones relative to each speaker's median F0: <code>12 * log2(F0 / Median_F0)</code>. Energy is evaluated by relative dynamic range rather than raw loudness.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.2)', color: 'var(--cyan-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              05
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>Temporal Flaw Grounding & Rubric Scoring</h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Mathematical deltas isolate the start/end timestamps of delivery defects across 8 distinct categories. A 5-dimension weighted rubric (totaling 100%) produces reproducible scores on a 0–100 scale.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Breakdown */}
      <div className="glass-panel">
        <h3 className="panel-title">
          <BarChart2 size={18} color="var(--cyan-bright)" />
          Standard 5-Category Forensic Rubric
        </h3>

        <div className="grid-5" style={{ marginTop: '14px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38BDF8' }}>25%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>Pacing</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>125–165 target WPM</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10B981' }}>20%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>Pause Mgmt</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>14–26% pause ratio</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F59E0B' }}>20%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>Pitch Variation</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>3.0–7.0 st range</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#EF4444' }}>15%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>Vocal Energy</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>12–24 dB dynamic range</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#A855F7' }}>20%</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', marginTop: '4px' }}>Articulation</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>1600–3200 Hz centroid</div>
          </div>
        </div>
      </div>
    </div>
  );
}

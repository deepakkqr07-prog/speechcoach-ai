import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw, Volume2, VolumeX, FastForward } from 'lucide-react';

export default function AudioWaveformPlayer({
  audioUrl,
  flaws = [],
  activeFlaw = null,
  onTimeUpdate = null,
  seekTime = null,
  label = "Speech Audio Playback"
}) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(56, 189, 248, 0.45)',
      progressColor: '#06B6D4',
      cursorColor: '#F8FAFC',
      cursorWidth: 2,
      height: 75,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      url: audioUrl,
    });

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      setIsReady(true);
    });

    ws.on('audioprocess', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('seeking', () => {
      const time = ws.getCurrentTime();
      setCurrentTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  // Handle external seek requests (e.g. clicking a flaw card)
  useEffect(() => {
    if (seekTime !== null && wavesurferRef.current && isReady) {
      wavesurferRef.current.setTime(seekTime);
      setCurrentTime(seekTime);
    }
  }, [seekTime, isReady]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleRestart = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setTime(0);
      wavesurferRef.current.play();
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      const nextMute = !isMuted;
      wavesurferRef.current.setMuted(nextMute);
      setIsMuted(nextMute);
    }
  };

  const cycleSpeed = () => {
    if (wavesurferRef.current) {
      const speeds = [1.0, 0.75, 1.25, 1.5];
      const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
      const nextSpeed = speeds[nextIdx];
      wavesurferRef.current.setPlaybackRate(nextSpeed);
      setPlaybackRate(nextSpeed);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = (secs % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${rem.padStart(5, '0')}`;
  };

  return (
    <div className="waveform-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          {activeFlaw && (
            <span className={`severity-pill severity-${activeFlaw.severity}`} style={{ fontSize: '0.7rem' }}>
              Active Grounding: {activeFlaw.category} ({activeFlaw.start_time.toFixed(2)}s – {activeFlaw.end_time.toFixed(2)}s)
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--cyan-bright)' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div ref={containerRef} style={{ width: '100%', cursor: 'pointer' }} />

      {/* Flaw Interval Visual Markers on Timeline */}
      {duration > 0 && flaws.length > 0 && (
        <div style={{ position: 'relative', height: '14px', marginTop: '6px', width: '100%' }}>
          {flaws.map((flaw, idx) => {
            const leftPct = (flaw.start_time / duration) * 100;
            const widthPct = Math.max(1.5, ((flaw.end_time - flaw.start_time) / duration) * 100);
            const isSelected = activeFlaw && activeFlaw.start_time === flaw.start_time;

            let bgColor = 'rgba(239, 68, 68, 0.4)';
            if (flaw.severity === 'mild') bgColor = 'rgba(16, 185, 129, 0.5)';
            if (flaw.severity === 'moderate') bgColor = 'rgba(245, 158, 11, 0.5)';

            return (
              <div
                key={idx}
                title={`${flaw.category} (${flaw.start_time.toFixed(2)}s - ${flaw.end_time.toFixed(2)}s)`}
                onClick={() => {
                  if (wavesurferRef.current) {
                    wavesurferRef.current.setTime(flaw.start_time);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: bgColor,
                  border: isSelected ? '1px solid #fff' : 'none',
                  boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.9)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Playback Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="btn btn-primary"
            style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%' }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>
          <button
            onClick={handleRestart}
            disabled={!isReady}
            className="btn btn-secondary"
            title="Replay from start"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={cycleSpeed}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            title="Adjust speed"
          >
            <FastForward size={14} /> {playbackRate}x
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleMute}
            className="btn btn-secondary"
            style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%' }}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

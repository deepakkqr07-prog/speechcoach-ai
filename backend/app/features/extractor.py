import numpy as np
import librosa
from scipy.signal import find_peaks
from typing import Dict, Any, List, Tuple, Optional

def extract_acoustic_features(
    y: np.ndarray,
    sr: int,
    transcript: Optional[str] = None,
    hop_length: int = 160,    # 10ms at 16000Hz
    frame_length: int = 512   # 32ms at 16000Hz
) -> Dict[str, Any]:
    """
    Extracts comprehensive time-aligned acoustic features:
    - RMS energy contour
    - Pitch / F0 contour (Hz and speaker-normalized semitones)
    - MFCCs (13 coefficients)
    - Spectral Centroid (timbral brightness / articulation)
    - Spectral Flatness & Flux
    - VAD (Voice Activity Detection)
    - Pause intervals (timestamped)
    - Speech rate (Syllables/sec and WPM)
    """
    duration = float(len(y) / sr)
    num_frames = int(np.ceil(len(y) / hop_length))
    times = librosa.frames_to_time(np.arange(num_frames), sr=sr, hop_length=hop_length)

    # 1. RMS Energy Contour
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    # Ensure times and rms have matching length
    min_len = min(len(times), len(rms))
    times = times[:min_len]
    rms = rms[:min_len]

    # Convert energy to dB scale normalized (0 to 1 scale for charting)
    max_rms = float(np.max(rms)) if len(rms) > 0 and np.max(rms) > 0 else 1.0
    norm_rms = np.clip(rms / max_rms, 0.0, 1.0)
    rms_db = 20 * np.log10(np.maximum(rms, 1e-5))

    # 2. Fundamental Frequency (F0 / Pitch) using YIN algorithm
    try:
        f0 = librosa.yin(
            y,
            fmin=65,
            fmax=380,
            sr=sr,
            frame_length=frame_length * 2,
            hop_length=hop_length,
            trough_threshold=0.1
        )
        f0 = f0[:min_len]
    except Exception:
        f0 = np.full(min_len, np.nan)

    # Filter unvoiced frames using energy threshold and plausible human speech pitch bounds
    energy_threshold = max(float(np.percentile(rms, 20)), 0.008)
    voiced_mask = (rms >= energy_threshold) & (~np.isnan(f0)) & (f0 >= 70) & (f0 <= 360)
    
    pitch_clean = np.where(voiced_mask, f0, np.nan)
    voiced_f0 = f0[voiced_mask]

    # Speaker-agnostic pitch normalization: Semitones relative to speaker's median F0
    if len(voiced_f0) > 10:
        median_f0 = float(np.median(voiced_f0))
        mean_f0 = float(np.mean(voiced_f0))
        std_f0 = float(np.std(voiced_f0))
        pitch_semitones = np.where(
            voiced_mask,
            12 * np.log2(np.maximum(f0, 1e-4) / median_f0),
            np.nan
        )
        pitch_range_st = float(np.percentile(pitch_semitones[voiced_mask], 95) - np.percentile(pitch_semitones[voiced_mask], 5))
    else:
        median_f0 = 150.0
        mean_f0 = 150.0
        std_f0 = 0.0
        pitch_semitones = np.full(min_len, np.nan)
        pitch_range_st = 0.0

    # 3. Spectral Features
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=frame_length, hop_length=hop_length)[0][:min_len]
    flatness = librosa.feature.spectral_flatness(y=y, n_fft=frame_length, hop_length=hop_length)[0][:min_len]

    # 4. MFCCs (13 coefficients)
    mfcc_matrix = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=frame_length, hop_length=hop_length)[:, :min_len]
    mfcc_mean = np.mean(mfcc_matrix, axis=1).tolist()
    mfcc_std = np.std(mfcc_matrix, axis=1).tolist()

    # 5. Voice Activity Detection & Pause Analysis
    # A frame is active speech if rms > threshold and spectral flatness is reasonable (<0.7)
    vad_mask = (rms > energy_threshold) & (flatness < 0.7)

    # Detect pause intervals (consecutive false frames in vad_mask lasting >= 0.25s)
    pauses: List[Dict[str, Any]] = []
    min_pause_frames = int(0.25 / (hop_length / sr))  # min 250ms
    current_pause_start: Optional[int] = None

    for i, active in enumerate(vad_mask):
        if not active:
            if current_pause_start is None:
                current_pause_start = i
        else:
            if current_pause_start is not None:
                pause_len = i - current_pause_start
                if pause_len >= min_pause_frames:
                    p_start = float(times[current_pause_start])
                    p_end = float(times[i - 1])
                    pauses.append({
                        "start_time": round(p_start, 3),
                        "end_time": round(p_end, 3),
                        "duration": round(p_end - p_start, 3)
                    })
                current_pause_start = None

    # Handle trailing pause
    if current_pause_start is not None:
        pause_len = len(vad_mask) - current_pause_start
        if pause_len >= min_pause_frames:
            p_start = float(times[current_pause_start])
            p_end = float(times[-1])
            pauses.append({
                "start_time": round(p_start, 3),
                "end_time": round(p_end, 3),
                "duration": round(p_end - p_start, 3)
            })

    total_pause_duration = sum(p["duration"] for p in pauses)
    active_speech_duration = max(0.1, duration - total_pause_duration)

    # 6. Syllable & Speech Rate Calculation
    # Acoustic syllable nucleus detector using smoothed energy peaks
    smooth_window = int(0.05 * sr / hop_length)  # 50ms window
    if smooth_window % 2 == 0:
        smooth_window += 1
    if len(rms) > smooth_window and smooth_window > 2:
        kernel = np.hanning(smooth_window)
        kernel = kernel / np.sum(kernel)
        smoothed_rms = np.convolve(rms, kernel, mode='same')
    else:
        smoothed_rms = rms

    peaks, _ = find_peaks(
        smoothed_rms,
        height=energy_threshold * 1.2,
        distance=int(0.15 * sr / hop_length),  # minimum 150ms between syllables
        prominence=0.015
    )
    detected_syllables = len(peaks)
    syllables_per_second = float(detected_syllables / active_speech_duration) if active_speech_duration > 0 else 0.0

    # Words per minute calculation
    if transcript and len(transcript.split()) > 0:
        word_count = len(transcript.split())
        words_per_minute = float((word_count / duration) * 60.0)
        rate_method = "transcript_word_count"
    else:
        # Standard average English ratio: ~1.5 syllables per word
        est_word_count = detected_syllables / 1.5
        words_per_minute = float((est_word_count / duration) * 60.0)
        rate_method = "acoustic_syllable_estimate"

    # Dynamic Energy Range (dB)
    p90_energy = np.percentile(rms_db, 90)
    p10_energy = np.percentile(rms_db, 10)
    energy_dynamic_range = float(p90_energy - p10_energy)

    # Decimate time series for smooth visualization (around 200-300 points for dashboard)
    step = max(1, len(times) // 250)
    sampled_times = times[::step].round(3).tolist()
    sampled_energy = norm_rms[::step].round(3).tolist()
    sampled_pitch = [None if np.isnan(p) else round(float(p), 1) for p in pitch_clean[::step]]
    sampled_semitones = [None if np.isnan(st) else round(float(st), 2) for st in pitch_semitones[::step]]
    sampled_centroid = centroid[::step].round(1).tolist()

    return {
        "duration": duration,
        "sample_rate": sr,
        "summary": {
            "mean_f0_hz": round(mean_f0, 1),
            "median_f0_hz": round(median_f0, 1),
            "std_f0_hz": round(std_f0, 1),
            "pitch_range_semitones": round(pitch_range_st, 2),
            "words_per_minute": round(words_per_minute, 1),
            "syllables_per_second": round(syllables_per_second, 2),
            "rate_calculation_method": rate_method,
            "detected_syllable_nuclei": detected_syllables,
            "total_pause_count": len(pauses),
            "total_pause_duration_sec": round(total_pause_duration, 2),
            "pause_ratio_percent": round((total_pause_duration / max(0.1, duration)) * 100, 1),
            "mean_spectral_centroid_hz": round(float(np.mean(centroid)), 1),
            "energy_dynamic_range_db": round(energy_dynamic_range, 1),
            "mfcc_mean_vector": [round(float(v), 2) for v in mfcc_mean],
        },
        "pauses": pauses,
        "times": times,
        "rms": rms,
        "norm_rms": norm_rms,
        "f0": f0,
        "pitch_clean": pitch_clean,
        "pitch_semitones": pitch_semitones,
        "centroid": centroid,
        "mfcc_matrix": mfcc_matrix,
        "vad_mask": vad_mask,
        "display_series": {
            "times": sampled_times,
            "energy": sampled_energy,
            "pitch": sampled_pitch,
            "pitch_semitones": sampled_semitones,
            "centroid": sampled_centroid,
        }
    }

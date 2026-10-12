import os
import numpy as np
import soundfile as sf
import librosa
from typing import Tuple, Dict, Any

TARGET_SR = 16000
MAX_DURATION_SECONDS = 300  # 5 minutes
MIN_DURATION_SECONDS = 0.5

class AudioValidationError(Exception):
    pass

def load_and_preprocess_audio(file_path: str, target_sr: int = TARGET_SR) -> Tuple[np.ndarray, int, float, Dict[str, Any]]:
    """
    Loads an audio file, converts to mono, resamples to target_sr,
    validates signal integrity (clipping, silence, duration),
    and returns signal array, sample rate, duration, and signal metrics.
    """
    if not os.path.exists(file_path):
        raise AudioValidationError(f"Audio file not found: {file_path}")

    # Check file size (max 50 MB)
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > 50:
        raise AudioValidationError(f"File size ({file_size_mb:.1f} MB) exceeds maximum allowed size of 50 MB.")

    try:
        # Load audio using librosa (uses soundfile internally)
        y, sr = librosa.load(file_path, sr=target_sr, mono=True)
    except Exception as e:
        # Fallback to soundfile directly if librosa fails
        try:
            data, orig_sr = sf.read(file_path)
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if orig_sr != target_sr:
                y = librosa.resample(data.astype(np.float32), orig_sr=orig_sr, target_sr=target_sr)
                sr = target_sr
            else:
                y = data.astype(np.float32)
                sr = orig_sr
        except Exception as err2:
            raise AudioValidationError(f"Unable to read audio format: {str(e)} / {str(err2)}")

    duration = float(len(y) / sr)

    if duration < MIN_DURATION_SECONDS:
        raise AudioValidationError(f"Audio duration ({duration:.2f}s) is too short. Minimum is {MIN_DURATION_SECONDS}s.")

    if duration > MAX_DURATION_SECONDS:
        raise AudioValidationError(f"Audio duration ({duration:.2f}s) exceeds limit of {MAX_DURATION_SECONDS}s.")

    # Check for empty / near-zero silence
    peak = float(np.max(np.abs(y))) if len(y) > 0 else 0.0
    rms = float(np.sqrt(np.mean(y ** 2))) if len(y) > 0 else 0.0

    if peak < 1e-4 or rms < 1e-5:
        raise AudioValidationError("Audio appears to be completely silent or empty.")

    # Clipping detection: sample values at or very close to digital full scale 1.0
    clipped_samples = int(np.sum(np.abs(y) >= 0.995))
    clipping_ratio = float(clipped_samples / len(y))

    # Noise floor estimation (bottom 10th percentile of frame energy)
    frame_len = int(0.025 * sr)
    hop_len = int(0.010 * sr)
    frame_rms = librosa.feature.rms(y=y, frame_length=frame_len, hop_length=hop_len)[0]
    sorted_rms = np.sort(frame_rms)
    noise_floor = float(np.percentile(sorted_rms, 10))
    speech_peak_rms = float(np.percentile(sorted_rms, 90))
    
    # SNR approximation (dB)
    snr_db = float(20 * np.log10(max(speech_peak_rms, 1e-5) / max(noise_floor, 1e-5)))

    metrics = {
        "duration": duration,
        "sample_rate": sr,
        "num_samples": len(y),
        "peak_amplitude": peak,
        "rms_overall": rms,
        "clipping_ratio": clipping_ratio,
        "has_clipping": clipping_ratio > 0.01,
        "noise_floor_rms": noise_floor,
        "estimated_snr_db": snr_db,
    }

    return y, sr, duration, metrics

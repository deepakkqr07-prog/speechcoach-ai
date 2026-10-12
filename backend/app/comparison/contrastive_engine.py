import numpy as np
import librosa
from typing import Dict, Any, List, Optional, Tuple
from ..schemas.schemas import FlawGrounding

def run_contrastive_or_standalone_analysis(
    part_features: Dict[str, Any],
    ref_features: Optional[Dict[str, Any]] = None,
    part_words: Optional[List[Dict[str, Any]]] = None,
    ref_words: Optional[List[Dict[str, Any]]] = None,
    custom_thresholds: Optional[Dict[str, float]] = None
) -> Tuple[List[FlawGrounding], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Performs Temporal Flaw Grounding using either Contrastive Reference Comparison (if ref_features provided)
    or Standalone Rubric Analytics.
    Returns:
    - flaws: List of FlawGrounding items with timestamps, mathematical deltas, and actionable guidance
    - combined_time_series: Aligned time series points for frontend multi-chart visualization
    - comparison_metrics: Summary contrast metrics
    """
    thresholds = {
        "max_pause_duration": 0.80,         # seconds
        "min_speech_rate_wpm": 110.0,       # words per minute
        "max_speech_rate_wpm": 185.0,       # words per minute
        "monotone_pitch_std_st": 1.2,       # semitones std threshold
        "energy_drop_threshold_db": 14.0,   # sudden drop in phrase
        "min_spectral_centroid_hz": 1200.0  # articulation clarity floor
    }
    if custom_thresholds:
        thresholds.update(custom_thresholds)

    flaws: List[FlawGrounding] = []
    is_contrastive = ref_features is not None

    part_dur = part_features["duration"]
    part_summary = part_features["summary"]
    part_pauses = part_features["pauses"]
    part_times = part_features["times"]
    part_rms = part_features["norm_rms"]
    part_f0 = part_features["f0"]
    part_semitones = part_features["pitch_semitones"]
    part_centroid = part_features["centroid"]

    ref_summary = ref_features["summary"] if is_contrastive else None
    ref_pauses = ref_features["pauses"] if is_contrastive else []

    # =========================================================================
    # 1. TEMPORAL FLAW GROUNDING: PAUSES (Long or poorly placed pauses)
    # =========================================================================
    for pause in part_pauses:
        p_dur = pause["duration"]
        p_start = pause["start_time"]
        p_end = pause["end_time"]

        # Contrastive check: see if reference also had a planned rhetorical pause at this time
        ref_pause_match = None
        if is_contrastive:
            for rp in ref_pauses:
                if abs(rp["start_time"] - p_start) < 1.0:
                    ref_pause_match = rp
                    break

        if is_contrastive and ref_pause_match is not None:
            ref_dur = ref_pause_match["duration"]
            delta = round(p_dur - ref_dur, 2)
            if delta > 0.45 and p_dur > thresholds["max_pause_duration"]:
                severity = "severe" if delta > 1.2 else ("moderate" if delta > 0.7 else "mild")
                conf = min(0.98, 0.70 + (delta / 2.0))
                flaws.append(FlawGrounding(
                    category="Long or poorly placed pauses",
                    start_time=p_start,
                    end_time=p_end,
                    duration=p_dur,
                    severity=severity,
                    confidence=round(conf, 2),
                    measured_value=round(p_dur, 2),
                    reference_value=round(ref_dur, 2),
                    delta=delta,
                    unit="seconds",
                    explanation=f"Pause duration was {p_dur:.2f}s, exceeding the reference delivery ({ref_dur:.2f}s) by {delta:.2f}s and disrupting rhetorical continuity.",
                    suggestion="Shorten this silence interval to under 0.6s to maintain audience engagement without losing flow."
                ))
        else:
            # Standalone or non-matching pause in contrastive
            if p_dur > thresholds["max_pause_duration"]:
                delta = round(p_dur - thresholds["max_pause_duration"], 2)
                severity = "severe" if p_dur > 1.8 else ("moderate" if p_dur > 1.2 else "mild")
                conf = min(0.95, 0.75 + (p_dur / 3.0))
                flaws.append(FlawGrounding(
                    category="Long or poorly placed pauses",
                    start_time=p_start,
                    end_time=p_end,
                    duration=p_dur,
                    severity=severity,
                    confidence=round(conf, 2),
                    measured_value=round(p_dur, 2),
                    reference_value=round(thresholds["max_pause_duration"], 2) if not is_contrastive else 0.0,
                    delta=delta,
                    unit="seconds",
                    explanation=f"Detected prolonged silence of {p_dur:.2f}s, exceeding the standard threshold of {thresholds['max_pause_duration']:.2f}s.",
                    suggestion="Practice bridging sentences smoothly; avoid dead air when gathering your next thought."
                ))

    # =========================================================================
    # 2. TEMPORAL FLAW GROUNDING: PACING (Excessively Fast or Slow Speech)
    # =========================================================================
    # Compute local pacing in sliding 2.5-second windows
    hop_sec = 0.5
    win_sec = 2.5
    win_frames = int(win_sec / (part_times[1] - part_times[0])) if len(part_times) > 1 else 100
    step_frames = max(1, int(hop_sec / (part_times[1] - part_times[0]))) if len(part_times) > 1 else 20

    for i in range(0, len(part_times) - win_frames, step_frames):
        w_start = float(part_times[i])
        w_end = float(part_times[i + win_frames])
        sub_rms = part_rms[i: i + win_frames]
        
        # Local speech rate estimate
        # Count peaks in this window
        sub_peaks = librosa.util.peak_pick(
            sub_rms, pre_max=5, post_max=5, pre_avg=5, post_avg=5, delta=0.015, wait=10
        )
        local_syllables = len(sub_peaks)
        local_wpm = (local_syllables / 1.5) * (60.0 / win_sec)

        # Excessively fast
        if local_wpm > thresholds["max_speech_rate_wpm"] * 1.25:
            delta = round(local_wpm - thresholds["max_speech_rate_wpm"], 1)
            severity = "severe" if local_wpm > 240 else ("moderate" if local_wpm > 210 else "mild")
            # Avoid duplicate overlapping fast flaws
            if not any(f.category == "Excessively fast speech" and abs(f.start_time - w_start) < 2.0 for f in flaws):
                flaws.append(FlawGrounding(
                    category="Excessively fast speech",
                    start_time=round(w_start, 2),
                    end_time=round(w_end, 2),
                    duration=round(w_end - w_start, 2),
                    severity=severity,
                    confidence=0.88,
                    measured_value=round(local_wpm, 1),
                    reference_value=round(ref_summary["words_per_minute"], 1) if is_contrastive else round(thresholds["max_speech_rate_wpm"], 1),
                    delta=delta,
                    unit="WPM",
                    explanation=f"Speech velocity reached {local_wpm:.0f} WPM in this passage, surpassing comfortable listener comprehension limits.",
                    suggestion="Slow down articulation on key terms; deliberately enunciate multisyllabic words."
                ))

        # Excessively slow
        elif local_wpm < thresholds["min_speech_rate_wpm"] * 0.70 and np.mean(sub_rms) > 0.05:
            delta = round(thresholds["min_speech_rate_wpm"] - local_wpm, 1)
            severity = "moderate" if local_wpm < 75 else "mild"
            if not any(f.category == "Excessively slow speech" and abs(f.start_time - w_start) < 2.0 for f in flaws):
                flaws.append(FlawGrounding(
                    category="Excessively slow speech",
                    start_time=round(w_start, 2),
                    end_time=round(w_end, 2),
                    duration=round(w_end - w_start, 2),
                    severity=severity,
                    confidence=0.85,
                    measured_value=round(local_wpm, 1),
                    reference_value=round(ref_summary["words_per_minute"], 1) if is_contrastive else round(thresholds["min_speech_rate_wpm"], 1),
                    delta=round(-delta, 1),
                    unit="WPM",
                    explanation=f"Cadence slowed significantly to {local_wpm:.0f} WPM, causing the delivery to drag.",
                    suggestion="Inject energetic momentum into this phrase to maintain audience dynamism."
                ))

    # =========================================================================
    # 3. TEMPORAL FLAW GROUNDING: MONOTONE DELIVERY & UNUSUAL PITCH VARIATION
    # =========================================================================
    # Analyze pitch contour in 2.0-second sliding segments
    pitch_win_frames = int(2.0 / (part_times[1] - part_times[0])) if len(part_times) > 1 else 100
    pitch_step = max(1, int(1.0 / (part_times[1] - part_times[0]))) if len(part_times) > 1 else 40

    for i in range(0, len(part_times) - pitch_win_frames, pitch_step):
        w_start = float(part_times[i])
        w_end = float(part_times[i + pitch_win_frames])
        sub_st = part_semitones[i: i + pitch_win_frames]
        valid_st = sub_st[~np.isnan(sub_st)]

        if len(valid_st) > 25:
            st_std = float(np.std(valid_st))
            st_range = float(np.percentile(valid_st, 90) - np.percentile(valid_st, 10))

            # Monotone check
            if st_std < thresholds["monotone_pitch_std_st"]:
                ref_st_std = 2.8 if not is_contrastive else 2.6
                delta = round(ref_st_std - st_std, 2)
                severity = "severe" if st_std < 0.6 else ("moderate" if st_std < 0.9 else "mild")
                if not any(f.category == "Monotone delivery" and abs(f.start_time - w_start) < 2.0 for f in flaws):
                    flaws.append(FlawGrounding(
                        category="Monotone delivery",
                        start_time=round(w_start, 2),
                        end_time=round(w_end, 2),
                        duration=round(w_end - w_start, 2),
                        severity=severity,
                        confidence=0.86,
                        measured_value=round(st_std, 2),
                        reference_value=round(ref_st_std, 2),
                        delta=round(-delta, 2),
                        unit="semitones std",
                        explanation=f"Pitch inflection standard deviation fell to {st_std:.2f} semitones (flat baseline), indicating lack of vocal modulation.",
                        suggestion="Add upward pitch inflection to emphasize thematic keywords and vary sentence ending pitch."
                    ))

            # Unusual pitch variation (erratic pitch spikes)
            elif st_range > 8.0:
                severity = "moderate" if st_range < 11.0 else "severe"
                if not any(f.category == "Unusual pitch variation" and abs(f.start_time - w_start) < 2.0 for f in flaws):
                    flaws.append(FlawGrounding(
                        category="Unusual pitch variation",
                        start_time=round(w_start, 2),
                        end_time=round(w_end, 2),
                        duration=round(w_end - w_start, 2),
                        severity=severity,
                        confidence=0.84,
                        measured_value=round(st_range, 2),
                        reference_value=3.5,
                        delta=round(st_range - 3.5, 2),
                        unit="semitones range",
                        explanation=f"Erratic pitch excursion of {st_range:.1f} semitones detected, creating an unstable or strained tonal quality.",
                        suggestion="Stabilize breath support to avoid unintentional pitch cracks or sudden tonal spikes."
                    ))

    # =========================================================================
    # 4. TEMPORAL FLAW GROUNDING: INCONSISTENT VOCAL ENERGY
    # =========================================================================
    # Identify sudden fading out or unstable energy swings inside voiced phrases
    for i in range(10, len(part_rms) - 20, 20):
        # Look at 0.5s before and 0.5s after
        prev_energy = np.mean(part_rms[max(0, i - 15): i])
        next_energy = np.mean(part_rms[i: i + 15])
        time_at = float(part_times[i])

        # Sudden drop of > 65% in energy while not at a silent end
        if prev_energy > 0.40 and next_energy < 0.12 and time_at < part_dur - 0.8:
            # Check if this isn't already logged as a pause
            is_in_pause = any(p["start_time"] <= time_at <= p["end_time"] for p in part_pauses)
            if not is_in_pause and not any(f.category == "Inconsistent vocal energy" and abs(f.start_time - time_at) < 2.5 for f in flaws):
                flaws.append(FlawGrounding(
                    category="Inconsistent vocal energy",
                    start_time=round(time_at - 0.3, 2),
                    end_time=round(time_at + 0.9, 2),
                    duration=1.2,
                    severity="moderate",
                    confidence=0.82,
                    measured_value=round(float(next_energy / max(1e-4, prev_energy)), 2),
                    reference_value=0.85,
                    delta=round(float(next_energy / max(1e-4, prev_energy)) - 0.85, 2),
                    unit="energy ratio",
                    explanation=f"Vocal power collapsed by {((1.0 - (next_energy/prev_energy)) * 100):.0f}% mid-phrase, causing the trailing words to become inaudible.",
                    suggestion="Maintain abdominal breath pressure through to the last syllable of the clause."
                ))

    # =========================================================================
    # 5. TEMPORAL FLAW GROUNDING: UNCLEAR ARTICULATION
    # =========================================================================
    # Measure spectral centroid: muffled or slurred speech produces depressed spectral centroid
    for i in range(0, len(part_centroid) - 30, 30):
        w_start = float(part_times[i])
        w_end = float(part_times[min(len(part_times) - 1, i + 30)])
        sub_cent = np.mean(part_centroid[i: i + 30])
        sub_rms_val = np.mean(part_rms[i: i + 30])

        if sub_rms_val > 0.15 and sub_cent < thresholds["min_spectral_centroid_hz"]:
            delta = round(thresholds["min_spectral_centroid_hz"] - sub_cent, 0)
            if not any(f.category == "Unclear articulation" and abs(f.start_time - w_start) < 2.5 for f in flaws):
                flaws.append(FlawGrounding(
                    category="Unclear articulation",
                    start_time=round(w_start, 2),
                    end_time=round(w_end, 2),
                    duration=round(w_end - w_start, 2),
                    severity="mild" if delta < 250 else "moderate",
                    confidence=0.80,
                    measured_value=round(float(sub_cent), 0),
                    reference_value=round(thresholds["min_spectral_centroid_hz"], 0),
                    delta=round(-delta, 0),
                    unit="Hz",
                    explanation=f"Spectral centroid dropped to {sub_cent:.0f} Hz (below {thresholds['min_spectral_centroid_hz']:.0f} Hz clarity baseline), signaling muffled articulation.",
                    suggestion="Engage lips, teeth, and tongue to cleanly separate consonants."
                ))

    # =========================================================================
    # 6. CONTRASTIVE SPECIFIC: EMPHASIS MISMATCH
    # =========================================================================
    if is_contrastive and ref_features is not None:
        ref_times = ref_features["times"]
        ref_rms = ref_features["norm_rms"]
        # Find high emphasis points in reference (normalized energy > 0.75)
        # Check participant at aligned normalized time
        for r_idx in range(10, len(ref_rms) - 10, 25):
            if ref_rms[r_idx] > 0.78:
                # Corresponding normalized progress in audio
                norm_progress = ref_times[r_idx] / max(0.1, ref_features["duration"])
                p_time_approx = norm_progress * part_dur
                p_idx = min(len(part_rms) - 1, int(p_time_approx / (part_times[1] - part_times[0]))) if len(part_times) > 1 else 0
                
                if p_idx < len(part_rms) and part_rms[p_idx] < 0.35:
                    delta = round(float(ref_rms[r_idx] - part_rms[p_idx]), 2)
                    if not any(f.category == "Emphasis that differs from reference" and abs(f.start_time - p_time_approx) < 2.5 for f in flaws):
                        flaws.append(FlawGrounding(
                            category="Emphasis that differs from reference",
                            start_time=round(max(0.0, p_time_approx - 0.4), 2),
                            end_time=round(min(part_dur, p_time_approx + 0.8), 2),
                            duration=1.2,
                            severity="moderate",
                            confidence=0.83,
                            measured_value=round(float(part_rms[p_idx]), 2),
                            reference_value=round(float(ref_rms[r_idx]), 2),
                            delta=delta,
                            unit="relative energy",
                            explanation=f"Reference stressed this moment with high dynamic emphasis ({ref_rms[r_idx]:.2f}), while participant delivery was flat ({part_rms[p_idx]:.2f}).",
                            suggestion="Deliver this thematic anchor with vocal punch and clear emotional conviction."
                        ))

    # Sort flaws by timestamp
    flaws = sorted(flaws, key=lambda f: f.start_time)

    # =========================================================================
    # 7. TIME SERIES ALIGNMENT FOR FRONTEND VISUALIZATION
    # =========================================================================
    # Build uniform synchronized time-series data points
    combined_time_series: List[Dict[str, Any]] = []
    num_points = 180
    eval_times = np.linspace(0, part_dur, num_points)

    ref_dur = ref_features["duration"] if is_contrastive else 1.0

    for t in eval_times:
        p_idx = min(len(part_times) - 1, int(t / (part_times[1] - part_times[0]))) if len(part_times) > 1 else 0
        p_energy = float(part_rms[p_idx]) if p_idx < len(part_rms) else 0.0
        p_pitch = float(part_f0[p_idx]) if (p_idx < len(part_f0) and not np.isnan(part_f0[p_idx])) else None
        p_st = float(part_semitones[p_idx]) if (p_idx < len(part_semitones) and not np.isnan(part_semitones[p_idx])) else None
        p_cent = float(part_centroid[p_idx]) if p_idx < len(part_centroid) else 0.0

        point = {
            "time": round(float(t), 2),
            "participant_energy": round(p_energy * 100, 1),
            "participant_pitch": round(p_pitch, 1) if p_pitch is not None else None,
            "participant_semitones": round(p_st, 1) if p_st is not None else None,
            "participant_centroid": round(p_cent, 0),
        }

        if is_contrastive and ref_features is not None:
            # Map time relative to reference duration
            ref_t = (t / max(0.1, part_dur)) * ref_dur
            ref_idx = min(len(ref_features["times"]) - 1, int(ref_t / (ref_features["times"][1] - ref_features["times"][0]))) if len(ref_features["times"]) > 1 else 0
            
            r_energy = float(ref_features["norm_rms"][ref_idx]) if ref_idx < len(ref_features["norm_rms"]) else 0.0
            r_pitch = float(ref_features["f0"][ref_idx]) if (ref_idx < len(ref_features["f0"]) and not np.isnan(ref_features["f0"][ref_idx])) else None
            r_st = float(ref_features["pitch_semitones"][ref_idx]) if (ref_idx < len(ref_features["pitch_semitones"]) and not np.isnan(ref_features["pitch_semitones"][ref_idx])) else None
            r_cent = float(ref_features["centroid"][ref_idx]) if ref_idx < len(ref_features["centroid"]) else 0.0

            point["reference_energy"] = round(r_energy * 100, 1)
            point["reference_pitch"] = round(r_pitch, 1) if r_pitch is not None else None
            point["reference_semitones"] = round(r_st, 1) if r_st is not None else None
            point["reference_centroid"] = round(r_cent, 0)

        combined_time_series.append(point)

    comparison_metrics = {
        "is_contrastive": is_contrastive,
        "participant_wpm": part_summary["words_per_minute"],
        "reference_wpm": ref_summary["words_per_minute"] if is_contrastive else None,
        "wpm_delta": round(part_summary["words_per_minute"] - ref_summary["words_per_minute"], 1) if is_contrastive else None,
        "participant_pauses": part_summary["total_pause_count"],
        "reference_pauses": ref_summary["total_pause_count"] if is_contrastive else None,
        "participant_pitch_range_st": part_summary["pitch_range_semitones"],
        "reference_pitch_range_st": ref_summary["pitch_range_semitones"] if is_contrastive else None,
        "participant_energy_dynamic_range_db": part_summary["energy_dynamic_range_db"],
        "reference_energy_dynamic_range_db": ref_summary["energy_dynamic_range_db"] if is_contrastive else None,
    }

    return flaws, combined_time_series, comparison_metrics

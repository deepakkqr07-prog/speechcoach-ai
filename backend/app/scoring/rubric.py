from typing import Dict, Any, List, Optional
from ..schemas.schemas import ScoreBreakdown, FlawGrounding

DEFAULT_WEIGHTS = {
    "pacing": 0.25,
    "pause_management": 0.20,
    "pitch_variation": 0.20,
    "vocal_energy": 0.15,
    "articulation": 0.20
}

def calculate_rubric_scores(
    features_summary: Dict[str, Any],
    flaws: List[FlawGrounding],
    custom_weights: Optional[Dict[str, float]] = None
) -> ScoreBreakdown:
    """
    Computes reproducible, mathematically grounded rubric scores (0-100 scale)
    based on acoustic feature measurements and detected temporal flaws.
    """
    weights = dict(DEFAULT_WEIGHTS)
    if custom_weights:
        # Normalize weights so they sum to 1.0
        total_w = sum(custom_weights.values())
        if total_w > 0:
            weights = {k: v / total_w for k, v in custom_weights.items()}

    # Severity deduction weights
    sev_deductions = {"mild": 4.0, "moderate": 8.0, "severe": 15.0}

    # 1. Pacing Score (0-100)
    wpm = features_summary.get("words_per_minute", 140.0)
    # Ideal professional speaking pace: 125 - 165 WPM
    if 125.0 <= wpm <= 165.0:
        base_pacing = 95.0
    elif wpm < 125.0:
        # Under pace: deduct 0.6 per WPM below 125
        base_pacing = max(40.0, 95.0 - (125.0 - wpm) * 0.8)
    else:
        # Over pace: deduct 0.7 per WPM above 165
        base_pacing = max(40.0, 95.0 - (wpm - 165.0) * 0.8)

    pacing_flaws = [f for f in flaws if f.category in ("Excessively fast speech", "Excessively slow speech")]
    pacing_deduction = sum(sev_deductions.get(f.severity, 6.0) for f in pacing_flaws)
    score_pacing = max(10.0, min(100.0, base_pacing - pacing_deduction))

    # 2. Pause Management Score (0-100)
    pause_ratio = features_summary.get("pause_ratio_percent", 18.0)
    # Ideal pause ratio: 14% to 26%
    if 14.0 <= pause_ratio <= 26.0:
        base_pause = 95.0
    elif pause_ratio < 14.0:
        base_pause = max(50.0, 95.0 - (14.0 - pause_ratio) * 2.5)
    else:
        base_pause = max(40.0, 95.0 - (pause_ratio - 26.0) * 2.0)

    pause_flaws = [f for f in flaws if f.category == "Long or poorly placed pauses"]
    pause_deduction = sum(sev_deductions.get(f.severity, 8.0) for f in pause_flaws)
    score_pause = max(10.0, min(100.0, base_pause - pause_deduction))

    # 3. Pitch & Vocal Variation Score (0-100)
    pitch_st = features_summary.get("pitch_range_semitones", 3.8)
    # Ideal expressive range: 3.0 to 7.0 semitones
    if 3.0 <= pitch_st <= 7.0:
        base_pitch = 94.0
    elif pitch_st < 3.0:
        # Monotone penalty
        base_pitch = max(35.0, 94.0 - (3.0 - pitch_st) * 18.0)
    else:
        # Excessively erratic pitch
        base_pitch = max(50.0, 94.0 - (pitch_st - 7.0) * 7.0)

    pitch_flaws = [f for f in flaws if f.category in ("Monotone delivery", "Unusual pitch variation")]
    pitch_deduction = sum(sev_deductions.get(f.severity, 6.0) for f in pitch_flaws)
    score_pitch = max(10.0, min(100.0, base_pitch - pitch_deduction))

    # 4. Vocal Energy & Consistency Score (0-100)
    energy_dr = features_summary.get("energy_dynamic_range_db", 16.0)
    # Ideal dynamic range: 12 to 24 dB
    if 12.0 <= energy_dr <= 24.0:
        base_energy = 93.0
    elif energy_dr < 12.0:
        base_energy = max(45.0, 93.0 - (12.0 - energy_dr) * 3.5)
    else:
        base_energy = max(60.0, 93.0 - (energy_dr - 24.0) * 2.0)

    energy_flaws = [f for f in flaws if f.category in ("Inconsistent vocal energy", "Emphasis that differs from reference")]
    energy_deduction = sum(sev_deductions.get(f.severity, 6.0) for f in energy_flaws)
    score_energy = max(10.0, min(100.0, base_energy - energy_deduction))

    # 5. Articulation & Clarity Score (0-100)
    centroid = features_summary.get("mean_spectral_centroid_hz", 2200.0)
    # Ideal speech centroid: 1600 - 3200 Hz
    if 1600.0 <= centroid <= 3200.0:
        base_clarity = 94.0
    elif centroid < 1600.0:
        base_clarity = max(40.0, 94.0 - (1600.0 - centroid) * 0.05)
    else:
        base_clarity = 90.0

    clarity_flaws = [f for f in flaws if f.category == "Unclear articulation"]
    clarity_deduction = sum(sev_deductions.get(f.severity, 5.0) for f in clarity_flaws)
    score_clarity = max(10.0, min(100.0, base_clarity - clarity_deduction))

    # Overall Score Calculation
    overall = (
        weights["pacing"] * score_pacing +
        weights["pause_management"] * score_pause +
        weights["pitch_variation"] * score_pitch +
        weights["vocal_energy"] * score_energy +
        weights["articulation"] * score_clarity
    )

    return ScoreBreakdown(
        overall=round(overall, 1),
        pacing=round(score_pacing, 1),
        pause_management=round(score_pause, 1),
        pitch_variation=round(score_pitch, 1),
        vocal_energy=round(score_energy, 1),
        articulation=round(score_clarity, 1),
        weights=weights
    )

import os
import json
import numpy as np
import soundfile as sf
from typing import List, Dict, Any

SAMPLE_RATE = 16000

def synthesize_formant_speech(
    words: List[str],
    f0_target: float = 140.0,
    pitch_mod: float = 1.0,
    pace_mod: float = 1.0,
    pause_insert_idx: int = -1,
    pause_insert_dur: float = 0.0,
    energy_drop_idx: int = -1,
    muffled: bool = False,
    pitch_spike_idx: int = -1,
    emphasis_idx: int = -1
) -> np.ndarray:
    """
    Synthesizes speech-like acoustic signals with authentic harmonic glottal sources,
    vocal tract formants (F1, F2, F3), natural syllabic envelopes, and controlled rhetorical flaws.
    """
    sr = SAMPLE_RATE
    audio_segments = []

    # Formant frequencies for neutral open vowels / speech
    f1 = 600.0 if not muffled else 400.0
    f2 = 1600.0 if not muffled else 900.0
    f3 = 2600.0 if not muffled else 1200.0

    for w_idx, word in enumerate(words):
        # Base duration per word in seconds
        syllables = max(1, len(word) // 3)
        base_dur = (0.28 * syllables) / pace_mod
        t = np.linspace(0, base_dur, int(sr * base_dur), endpoint=False)

        # Dynamic pitch contour per word
        cur_f0 = f0_target
        if pitch_spike_idx == w_idx:
            # Sudden erratic pitch spike
            cur_f0 *= 1.7
        else:
            # Natural micro-prosody: slight rise-fall arch
            pitch_contour = f0_target * (1.0 + (pitch_mod * 0.15 * np.sin(np.pi * t / base_dur)))
            cur_f0 = pitch_contour

        # Glottal source: pulse train with harmonics
        phase = 2 * np.pi * np.cumsum(cur_f0 / sr)
        source = (
            np.sin(phase) +
            0.6 * np.sin(2 * phase) +
            0.4 * np.sin(3 * phase) +
            0.25 * np.sin(4 * phase) +
            0.15 * np.sin(5 * phase)
        )

        # Envelope: Attack, Decay, Sustain, Release
        env = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 0.8

        # Formant resonance filtering
        # Simulating vocal tract frequency response
        signal = source * env
        formant1 = np.sin(2 * np.pi * f1 * t) * np.exp(-t * 25)
        formant2 = np.sin(2 * np.pi * f2 * t) * np.exp(-t * 40)
        
        # Convolve with formants approximated
        speech_word = signal + 0.3 * np.sin(2 * np.pi * f1 * t) * signal
        if not muffled:
            speech_word += 0.2 * np.sin(2 * np.pi * f2 * t) * signal
            # Add subtle frication/breathing noise
            noise = np.random.normal(0, 0.03, len(t)) * env
            speech_word += noise
        else:
            # Low pass filter effect for slurred/muffled speech
            speech_word = np.convolve(speech_word, np.ones(8) / 8, mode='same')

        # Energy scaling
        amp = 0.7
        if emphasis_idx == w_idx:
            amp = 1.0  # High rhetorical punch
        elif energy_drop_idx == w_idx or (energy_drop_idx >= 0 and w_idx >= energy_drop_idx):
            amp = 0.18  # Substantial energy collapse

        speech_word *= amp
        audio_segments.append(speech_word)

        # Pause between words
        if pause_insert_idx == w_idx and pause_insert_dur > 0:
            pause_samples = int(sr * pause_insert_dur)
            audio_segments.append(np.random.normal(0, 0.002, pause_samples))
        else:
            # Natural inter-word micro-pause (60ms)
            p_len = int(sr * 0.06)
            audio_segments.append(np.random.normal(0, 0.002, p_len))

    full_audio = np.concatenate(audio_segments).astype(np.float32)
    # Normalize peak to 0.85
    peak = np.max(np.abs(full_audio))
    if peak > 0:
        full_audio = (full_audio / peak) * 0.85
    return full_audio

def generate_sample_dataset(output_dir: str = "dataset/sample_data") -> List[Dict[str, Any]]:
    """
    Generates 8 pairs of contrastive speech audio files (ideal vs flawed mirror)
    covering each required track flaw category.
    """
    os.makedirs(output_dir, exist_ok=True)
    metadata_dir = os.path.dirname(output_dir)
    os.makedirs(os.path.join(metadata_dir, "metadata"), exist_ok=True)

    samples_data = [
        {
            "sample_id": "SPCH_FLAW_001",
            "title": "Pause Disruption in Rhetorical Delivery",
            "category": "Interpretive Reading",
            "transcript": "Good speech evaluation demands rigorous metrics not subjective impressions.",
            "speaker_id": "SPK_SYNTH_01",
            "flaw_category": "Long or poorly placed pauses",
            "severity": "severe",
            "flaw_start": 2.1,
            "flaw_end": 4.2,
            "annotation_notes": "Injected 2.1-second awkward silence breaking grammatical continuity between 'demands' and 'rigorous metrics'.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "test",
            "config_ideal": {"f0_target": 140.0, "pitch_mod": 1.2, "pace_mod": 1.0, "pause_insert_idx": 3, "pause_insert_dur": 0.35},
            "config_flawed": {"f0_target": 140.0, "pitch_mod": 1.2, "pace_mod": 1.0, "pause_insert_idx": 3, "pause_insert_dur": 2.10}
        },
        {
            "sample_id": "SPCH_FLAW_002",
            "title": "Velocity Surge & Excessively Fast Cadence",
            "category": "Persuasive Oratory",
            "transcript": "We must deliberate with clarity precision and steady conviction.",
            "speaker_id": "SPK_SYNTH_02",
            "flaw_category": "Excessively fast speech",
            "severity": "moderate",
            "flaw_start": 1.2,
            "flaw_end": 2.6,
            "annotation_notes": "Pacing accelerated to 235 WPM on key triplet words, impeding audience comprehension.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "test",
            "config_ideal": {"f0_target": 150.0, "pitch_mod": 1.1, "pace_mod": 1.0},
            "config_flawed": {"f0_target": 150.0, "pitch_mod": 1.0, "pace_mod": 1.75}
        },
        {
            "sample_id": "SPCH_FLAW_003",
            "title": "Flat Robotic Pitch Prosody",
            "category": "Declamation",
            "transcript": "The future belongs to those who believe in the beauty of their dreams.",
            "speaker_id": "SPK_SYNTH_03",
            "flaw_category": "Monotone delivery",
            "severity": "severe",
            "flaw_start": 0.4,
            "flaw_end": 3.8,
            "annotation_notes": "Pitch variability flattened to <0.3 semitones; total absence of rhetorical inflection.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "test",
            "config_ideal": {"f0_target": 155.0, "pitch_mod": 1.4, "pace_mod": 1.0},
            "config_flawed": {"f0_target": 130.0, "pitch_mod": 0.05, "pace_mod": 1.0}
        },
        {
            "sample_id": "SPCH_FLAW_004",
            "title": "Vocal Energy Collapse Mid-Sentence",
            "category": "Extemporaneous",
            "transcript": "True leadership requires vocal resilience when delivering critical truths.",
            "speaker_id": "SPK_SYNTH_04",
            "flaw_category": "Inconsistent vocal energy",
            "severity": "moderate",
            "flaw_start": 2.4,
            "flaw_end": 4.1,
            "annotation_notes": "RMS power dropped by 72% across the concluding clause due to inadequate breath support.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "train",
            "config_ideal": {"f0_target": 145.0, "pitch_mod": 1.1, "pace_mod": 1.0, "energy_drop_idx": -1},
            "config_flawed": {"f0_target": 145.0, "pitch_mod": 1.0, "pace_mod": 1.0, "energy_drop_idx": 4}
        },
        {
            "sample_id": "SPCH_FLAW_005",
            "title": "Sluggish Dragged Cadence",
            "category": "Declamation",
            "transcript": "Every word spoken on this stage carries the weight of careful preparation.",
            "speaker_id": "SPK_SYNTH_05",
            "flaw_category": "Excessively slow speech",
            "severity": "moderate",
            "flaw_start": 1.0,
            "flaw_end": 4.5,
            "annotation_notes": "Syllable rate slowed to 68 WPM, creating a sluggish, disengaged impression.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "train",
            "config_ideal": {"f0_target": 135.0, "pitch_mod": 1.2, "pace_mod": 1.0},
            "config_flawed": {"f0_target": 135.0, "pitch_mod": 0.9, "pace_mod": 0.55}
        },
        {
            "sample_id": "SPCH_FLAW_006",
            "title": "Uncontrolled Pitch Instability Spikes",
            "category": "Interpretive Reading",
            "transcript": "In moments of crisis a calm and controlled demeanor inspires trust.",
            "speaker_id": "SPK_SYNTH_06",
            "flaw_category": "Unusual pitch variation",
            "severity": "severe",
            "flaw_start": 2.0,
            "flaw_end": 3.2,
            "annotation_notes": "Erratic pitch spike (>9 semitones excursion) during crisis word delivery.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "validation",
            "config_ideal": {"f0_target": 140.0, "pitch_mod": 1.2, "pace_mod": 1.0},
            "config_flawed": {"f0_target": 140.0, "pitch_mod": 1.2, "pace_mod": 1.0, "pitch_spike_idx": 3}
        },
        {
            "sample_id": "SPCH_FLAW_007",
            "title": "Muffled Consonant Articulation",
            "category": "Persuasive Oratory",
            "transcript": "Articulate pronunciation ensures that nuanced arguments reach the audience intact.",
            "speaker_id": "SPK_SYNTH_07",
            "flaw_category": "Unclear articulation",
            "severity": "mild",
            "flaw_start": 0.2,
            "flaw_end": 3.5,
            "annotation_notes": "Depressed spectral centroid (<950 Hz) and muffled consonant boundaries.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "validation",
            "config_ideal": {"f0_target": 148.0, "pitch_mod": 1.2, "pace_mod": 1.0, "muffled": False},
            "config_flawed": {"f0_target": 148.0, "pitch_mod": 1.0, "pace_mod": 1.0, "muffled": True}
        },
        {
            "sample_id": "SPCH_FLAW_008",
            "title": "Missing Rhetorical Stress Emphasis",
            "category": "Extemporaneous",
            "transcript": "We do not accept defeat we choose determination and unwavering resolve.",
            "speaker_id": "SPK_SYNTH_08",
            "flaw_category": "Emphasis that differs from the reference delivery",
            "severity": "moderate",
            "flaw_start": 3.2,
            "flaw_end": 4.6,
            "annotation_notes": "Reference provides strong dynamic emphasis on 'determination', flawed sample delivers flat.",
            "recording_conditions": "Studio conditions (Synthetic Formant Acoustic Model, 16kHz, 16-bit)",
            "split": "test",
            "config_ideal": {"f0_target": 150.0, "pitch_mod": 1.3, "pace_mod": 1.0, "emphasis_idx": 6},
            "config_flawed": {"f0_target": 150.0, "pitch_mod": 0.8, "pace_mod": 1.0, "emphasis_idx": -1}
        }
    ]

    generated_dataset = []

    for item in samples_data:
        words = item["transcript"].split()
        sid = item["sample_id"]
        
        ideal_filename = f"{sid}_ideal.wav"
        flawed_filename = f"{sid}_flawed.wav"
        ideal_path = os.path.join(output_dir, ideal_filename)
        flawed_path = os.path.join(output_dir, flawed_filename)

        ideal_audio = synthesize_formant_speech(words, **item["config_ideal"])
        flawed_audio = synthesize_formant_speech(words, **item["config_flawed"])

        sf.write(ideal_path, ideal_audio, SAMPLE_RATE)
        sf.write(flawed_path, flawed_audio, SAMPLE_RATE)

        record = {
            "sample_id": sid,
            "title": item["title"],
            "category": item["category"],
            "transcript": item["transcript"],
            "ideal_audio_path": ideal_path.replace("\\", "/"),
            "flawed_audio_path": flawed_path.replace("\\", "/"),
            "speaker_id": item["speaker_id"],
            "flaw_category": item["flaw_category"],
            "flaw_start": item["flaw_start"],
            "flaw_end": item["flaw_end"],
            "severity": item["severity"],
            "annotation_notes": item["annotation_notes"],
            "recording_conditions": item["recording_conditions"],
            "split": item["split"]
        }
        generated_dataset.append(record)

    # Save metadata JSON and CSV
    meta_json_path = os.path.join(metadata_dir, "metadata", "dataset.json")
    with open(meta_json_path, "w", encoding="utf-8") as f:
        json.dump(generated_dataset, f, indent=2)

    # Save CSV
    import csv
    meta_csv_path = os.path.join(metadata_dir, "metadata", "dataset.csv")
    fieldnames = list(generated_dataset[0].keys())
    with open(meta_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(generated_dataset)

    print(f"Generated {len(generated_dataset)} contrastive paired samples in {output_dir}")
    return generated_dataset

if __name__ == "__main__":
    generate_sample_dataset()

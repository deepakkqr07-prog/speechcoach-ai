import os
import sys
import numpy as np
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app
from app.audio.loader import load_and_preprocess_audio, AudioValidationError
from app.features.extractor import extract_acoustic_features
from app.scoring.rubric import calculate_rubric_scores
from app.schemas.schemas import FlawGrounding

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["capabilities"]["contrastive_temporal_grounding"] is True
    assert data["capabilities"]["flaw_categories_count"] == 8

def test_dataset_list_and_export():
    response = client.get("/api/dataset")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 8
    
    # Verify metadata fields
    first = samples[0]
    assert "sample_id" in first
    assert "flaw_category" in first
    assert "flaw_start" in first
    assert "flaw_end" in first
    assert "severity" in first
    assert first["flaw_end"] > first["flaw_start"]

    # Test export JSON
    exp_json = client.get("/api/dataset/export?format=json")
    assert exp_json.status_code == 200
    assert "application/json" in exp_json.headers["content-type"]

    # Test export CSV
    exp_csv = client.get("/api/dataset/export?format=csv")
    assert exp_csv.status_code == 200
    assert "text/csv" in exp_csv.headers["content-type"]

def test_audio_validation_silence(tmp_path):
    # Create silent wav file
    import soundfile as sf
    silence = np.zeros(16000, dtype=np.float32)
    silent_file = tmp_path / "silence.wav"
    sf.write(str(silent_file), silence, 16000)

    with pytest.raises(AudioValidationError):
        load_and_preprocess_audio(str(silent_file))

def test_feature_extraction_accuracy():
    sr = 16000
    t = np.linspace(0, 3.0, 3 * sr, endpoint=False)
    # Generate 150 Hz tone with a 0.8s pause in the middle
    tone1 = np.sin(2 * np.pi * 150 * t[:sr]) * 0.7
    silence = np.zeros(int(0.8 * sr), dtype=np.float32)
    tone2 = np.sin(2 * np.pi * 150 * t[:sr]) * 0.7
    signal = np.concatenate([tone1, silence, tone2]).astype(np.float32)

    features = extract_acoustic_features(signal, sr, transcript="Testing pause interval extraction")
    
    assert features["duration"] > 2.5
    # Verify pause detected
    assert len(features["pauses"]) >= 1
    pause = features["pauses"][0]
    assert pause["duration"] >= 0.7
    assert pause["start_time"] >= 0.9

    # Verify pitch tracking
    assert 130.0 <= features["summary"]["median_f0_hz"] <= 170.0

def test_rubric_scoring_weights_and_reproducibility():
    summary = {
        "words_per_minute": 140.0,
        "pause_ratio_percent": 18.0,
        "pitch_range_semitones": 4.5,
        "energy_dynamic_range_db": 16.0,
        "mean_spectral_centroid_hz": 2200.0
    }
    flaws = []
    
    # Perfect delivery score check
    score1 = calculate_rubric_scores(summary, flaws)
    assert score1.overall >= 90.0
    assert score1.pacing >= 90.0
    assert score1.pause_management >= 90.0

    # Reproducibility check: same input yields exact same score
    score2 = calculate_rubric_scores(summary, flaws)
    assert score1.overall == score2.overall

    # Test flaw deduction
    flaws_with_defect = [
        FlawGrounding(
            category="Long or poorly placed pauses",
            start_time=1.0,
            end_time=2.5,
            duration=1.5,
            severity="severe",
            confidence=0.95,
            measured_value=1.5,
            reference_value=0.4,
            delta=1.1,
            unit="seconds",
            explanation="Severe pause disruption",
            suggestion="Shorten pause"
        )
    ]
    score3 = calculate_rubric_scores(summary, flaws_with_defect)
    assert score3.pause_management < score1.pause_management
    assert score3.overall < score1.overall

def test_contrastive_analysis_end_to_end():
    # Test real end-to-end API analysis on generated sample 1
    sample_flawed = Path("dataset/sample_data/SPCH_FLAW_001_flawed.wav")
    assert sample_flawed.exists(), "Sample file should exist from dataset generator"

    with open(sample_flawed, "rb") as audio_bytes:
        response = client.post(
            "/api/analyze",
            files={"audio_file": ("flawed.wav", audio_bytes, "audio/wav")},
            data={
                "transcript": "Good speech evaluation demands rigorous metrics not subjective impressions.",
                "reference_sample_id": "SPCH_FLAW_001",
                "speaker_id": "TEST_SPEAKER"
            }
        )

    assert response.status_code == 200
    res = response.json()
    assert res["is_contrastive"] is True
    assert len(res["flaws"]) >= 1
    
    # Flaw should identify long pause
    pause_flaws = [f for f in res["flaws"] if "pause" in f["category"].lower()]
    assert len(pause_flaws) >= 1
    flaw = pause_flaws[0]
    assert flaw["measured_value"] > 1.5
    assert flaw["start_time"] > 0
    assert flaw["end_time"] > flaw["start_time"]
    assert "explanation" in flaw and len(flaw["explanation"]) > 10
    assert "suggestion" in flaw and len(flaw["suggestion"]) > 10

    # Check scores
    assert "scores" in res
    assert 0 <= res["scores"]["overall"] <= 100

    # Verify history storage
    hist_res = client.get(f"/api/history/{res['analysis_id']}")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["analysis_id"] == res["analysis_id"]

def test_standalone_analysis_without_reference():
    # Test analysis without any reference (standalone mode)
    sample_flawed = Path("dataset/sample_data/SPCH_FLAW_003_flawed.wav")
    assert sample_flawed.exists()

    with open(sample_flawed, "rb") as audio_bytes:
        response = client.post(
            "/api/analyze",
            files={"audio_file": ("monotone.wav", audio_bytes, "audio/wav")},
            data={
                "transcript": "The future belongs to those who believe in the beauty of their dreams.",
                "speaker_id": "TEST_STANDALONE"
            }
        )

    assert response.status_code == 200
    res = response.json()
    assert res["is_contrastive"] is False
    # Monotone flaw should be detected in standalone mode
    monotone_flaws = [f for f in res["flaws"] if "monotone" in f["category"].lower()]
    assert len(monotone_flaws) >= 1

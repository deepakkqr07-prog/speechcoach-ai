import os
import uuid
import json
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks

from ..audio.loader import load_and_preprocess_audio, AudioValidationError
from ..features.extractor import extract_acoustic_features
from ..alignment.aligner import transcribe_audio, align_transcript_to_audio
from ..comparison.contrastive_engine import run_contrastive_or_standalone_analysis
from ..scoring.rubric import calculate_rubric_scores
from ..database.db import get_connection
from ..schemas.schemas import AnalysisResponse, AlignedWord, ScoreBreakdown, FlawGrounding

router = APIRouter(prefix="/api", tags=["analysis"])
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/transcribe")
async def transcribe_endpoint(audio_file: UploadFile = File(...)):
    """Transcribes an uploaded audio file using Whisper with fallback"""
    ext = Path(audio_file.filename).suffix.lower() or ".wav"
    temp_path = UPLOAD_DIR / f"temp_transcribe_{uuid.uuid4().hex}{ext}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(audio_file.file, f)
        text, words, engine = transcribe_audio(str(temp_path))
        return {
            "transcript": text,
            "words": words,
            "engine": engine
        }
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.post("/align")
async def align_endpoint(
    audio_file: UploadFile = File(...),
    transcript: str = Form(...)
):
    """Aligns a provided transcript to an uploaded audio file"""
    ext = Path(audio_file.filename).suffix.lower() or ".wav"
    temp_path = UPLOAD_DIR / f"temp_align_{uuid.uuid4().hex}{ext}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(audio_file.file, f)
        y, sr, duration, metrics = load_and_preprocess_audio(str(temp_path))
        features = extract_acoustic_features(y, sr, transcript=transcript)
        aligned_words = align_transcript_to_audio(transcript, duration, features["pauses"])
        return {
            "duration": duration,
            "aligned_words": aligned_words,
            "pauses": features["pauses"]
        }
    except AudioValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(
    audio_file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
    transcript_file: Optional[UploadFile] = File(None),
    reference_audio: Optional[UploadFile] = File(None),
    reference_sample_id: Optional[str] = Form(None),
    custom_rubric: Optional[str] = Form(None),
    speaker_id: Optional[str] = Form("ANON_SPEAKER")
):
    """
    Main Speech Analysis & Temporal Flaw Grounding endpoint.
    Performs full acoustic extraction, contrastive comparison or standalone scoring,
    and returns timestamped flaws, multi-chart time-series, and rubric scores.
    """
    analysis_id = f"ANL_{uuid.uuid4().hex[:12].upper()}"
    ext = Path(audio_file.filename).suffix.lower() or ".wav"
    part_filename = f"{analysis_id}_participant{ext}"
    part_path = UPLOAD_DIR / part_filename

    # Save participant audio
    with open(part_path, "wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    # Resolve transcript (form field or uploaded .txt file)
    final_transcript = (transcript or "").strip()
    if transcript_file is not None and not final_transcript:
        try:
            content = await transcript_file.read()
            final_transcript = content.decode("utf-8").strip()
        except Exception:
            pass

    # 1. Load and validate participant audio
    try:
        y_part, sr_part, dur_part, metrics_part = load_and_preprocess_audio(str(part_path))
    except AudioValidationError as e:
        if part_path.exists():
            part_path.unlink()
        raise HTTPException(status_code=400, detail=f"Participant audio validation failed: {str(e)}")

    # 2. Transcription & Alignment
    if not final_transcript:
        # Automatic speech transcription
        detected_text, auto_words, engine_name = transcribe_audio(str(part_path))
        final_transcript = detected_text or "Unintelligible or silent speech signal."
        words_alignment = auto_words
    else:
        words_alignment = []

    # 3. Extract participant acoustic features
    part_features = extract_acoustic_features(y_part, sr_part, transcript=final_transcript)
    if not words_alignment:
        words_alignment = align_transcript_to_audio(final_transcript, dur_part, part_features["pauses"])

    # 4. Handle Reference Audio (Contrastive Mode)
    ref_features = None
    ref_audio_url = None
    ref_path_saved = None

    # Check if a reference sample from dataset is selected
    if reference_sample_id:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT ideal_audio_path, transcript FROM dataset_samples WHERE sample_id = ?", (reference_sample_id,))
        row = c.fetchone()
        conn.close()
        if row and os.path.exists(row["ideal_audio_path"]):
            ref_path_saved = row["ideal_audio_path"]
            ref_audio_url = f"/api/audio/{os.path.basename(ref_path_saved)}"

    # Or check if direct reference audio was uploaded
    if reference_audio is not None:
        ref_ext = Path(reference_audio.filename).suffix.lower() or ".wav"
        ref_filename = f"{analysis_id}_reference{ref_ext}"
        ref_saved_path = UPLOAD_DIR / ref_filename
        with open(ref_saved_path, "wb") as f:
            shutil.copyfileobj(reference_audio.file, f)
        ref_path_saved = str(ref_saved_path)
        ref_audio_url = f"/api/audio/{ref_filename}"

    if ref_path_saved and os.path.exists(ref_path_saved):
        try:
            y_ref, sr_ref, dur_ref, metrics_ref = load_and_preprocess_audio(ref_path_saved)
            ref_features = extract_acoustic_features(y_ref, sr_ref, transcript=final_transcript)
        except Exception as e:
            print(f"[SpeechCoach] Warning: Reference audio processing failed ({e}). Proceeding in standalone mode.")
            ref_features = None

    # 5. Parse custom rubric weights and thresholds if provided
    custom_weights = None
    custom_thresholds = None
    if custom_rubric:
        try:
            rub_data = json.loads(custom_rubric)
            custom_weights = rub_data.get("weights")
            custom_thresholds = rub_data.get("thresholds")
        except Exception:
            pass

    # 6. Run Contrastive or Standalone Flaw Grounding
    flaws, time_series, comparison_metrics = run_contrastive_or_standalone_analysis(
        part_features=part_features,
        ref_features=ref_features,
        part_words=words_alignment,
        custom_thresholds=custom_thresholds
    )

    # 7. Calculate Rubric Scores (0-100)
    scores = calculate_rubric_scores(
        features_summary=part_features["summary"],
        flaws=flaws,
        custom_weights=custom_weights
    )

    # 8. Save result to SQLite
    summary_metrics = {
        **part_features["summary"],
        "audio_metrics": metrics_part,
        "contrastive_metrics": comparison_metrics
    }

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    INSERT INTO analyses (
        id, filename, audio_path, transcript, reference_audio_path,
        reference_transcript, is_contrastive, overall_score, pacing_score,
        pause_score, pitch_score, energy_score, clarity_score, flaws_json,
        features_summary_json, time_series_json, rubric_json, speaker_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        analysis_id,
        audio_file.filename or part_filename,
        str(part_path).replace("\\", "/"),
        final_transcript,
        str(ref_path_saved).replace("\\", "/") if ref_path_saved else None,
        final_transcript if ref_path_saved else None,
        1 if ref_features is not None else 0,
        scores.overall,
        scores.pacing,
        scores.pause_management,
        scores.pitch_variation,
        scores.vocal_energy,
        scores.articulation,
        json.dumps([f.model_dump() for f in flaws]),
        json.dumps(summary_metrics),
        json.dumps(time_series),
        json.dumps({"weights": scores.weights, "thresholds": custom_thresholds or {}}),
        speaker_id
    ))
    conn.commit()
    conn.close()

    audio_url = f"/api/audio/{part_filename}"

    return AnalysisResponse(
        analysis_id=analysis_id,
        created_at="Just now",
        filename=audio_file.filename or part_filename,
        audio_url=audio_url,
        reference_audio_url=ref_audio_url,
        transcript=final_transcript,
        is_contrastive=ref_features is not None,
        scores=scores,
        flaws=flaws,
        time_series=time_series,
        words_alignment=[AlignedWord(**w) for w in words_alignment],
        summary_metrics=summary_metrics
    )

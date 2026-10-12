from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FlawGrounding(BaseModel):
    category: str
    start_time: float
    end_time: float
    duration: float
    severity: str  # "mild", "moderate", "severe"
    confidence: float
    measured_value: float
    reference_value: Optional[float] = None
    delta: Optional[float] = None
    unit: str
    explanation: str
    suggestion: str

class AlignedWord(BaseModel):
    word: str
    start_time: float
    end_time: float
    confidence: float = 1.0
    is_exact: bool = False

class ScoreBreakdown(BaseModel):
    overall: float
    pacing: float
    pause_management: float
    pitch_variation: float
    vocal_energy: float
    articulation: float
    weights: Dict[str, float] = Field(default_factory=lambda: {
        "pacing": 0.25,
        "pause_management": 0.20,
        "pitch_variation": 0.20,
        "vocal_energy": 0.15,
        "articulation": 0.20
    })

class TimeSeriesPoint(BaseModel):
    time: float
    participant_energy: float
    participant_pitch: Optional[float] = None
    participant_semitones: Optional[float] = None
    participant_centroid: float
    reference_energy: Optional[float] = None
    reference_pitch: Optional[float] = None
    reference_semitones: Optional[float] = None
    reference_centroid: Optional[float] = None

class AnalysisResponse(BaseModel):
    analysis_id: str
    created_at: str
    filename: str
    audio_url: str
    reference_audio_url: Optional[str] = None
    transcript: str
    is_contrastive: bool
    scores: ScoreBreakdown
    flaws: List[FlawGrounding] = Field(default_factory=list)
    time_series: List[Dict[str, Any]] = Field(default_factory=list)
    words_alignment: List[AlignedWord] = Field(default_factory=list)
    summary_metrics: Dict[str, Any] = Field(default_factory=dict)

class HistorySummary(BaseModel):
    id: str
    created_at: str
    filename: str
    transcript: str
    is_contrastive: bool
    overall_score: float
    pacing_score: float
    pause_score: float
    pitch_score: float
    energy_score: float
    clarity_score: float
    flaw_count: int
    primary_flaws: List[str] = Field(default_factory=list)
    speaker_id: Optional[str] = None

class DatasetSampleItem(BaseModel):
    sample_id: str
    title: str
    category: str
    transcript: str
    ideal_audio_path: str
    flawed_audio_path: str
    speaker_id: str
    flaw_category: str
    flaw_start: float
    flaw_end: float
    severity: str
    annotation_notes: Optional[str] = None
    recording_conditions: Optional[str] = None
    split: str = "test"
    created_at: Optional[str] = None

class RubricConfig(BaseModel):
    weights: Dict[str, float] = Field(default_factory=lambda: {
        "pacing": 0.25,
        "pause_management": 0.20,
        "pitch_variation": 0.20,
        "vocal_energy": 0.15,
        "articulation": 0.20
    })
    thresholds: Dict[str, float] = Field(default_factory=lambda: {
        "min_speech_rate_wpm": 110.0,
        "max_speech_rate_wpm": 185.0,
        "max_pause_duration": 0.85,
        "min_pause_duration": 0.15,
        "pitch_variability_semitones": 2.5,
        "energy_dynamic_range_db": 12.0
    })

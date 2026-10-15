import sqlite3
import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
default_db = "/tmp/speechcoach.db" if os.environ.get("VERCEL") else str(PROJECT_ROOT / "speechcoach.db")
DB_PATH = os.environ.get("DATABASE_URL", default_db).replace("sqlite:///", "")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Analyses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        filename TEXT NOT NULL,
        audio_path TEXT NOT NULL,
        transcript TEXT,
        reference_audio_path TEXT,
        reference_transcript TEXT,
        is_contrastive INTEGER DEFAULT 0,
        overall_score REAL NOT NULL,
        pacing_score REAL NOT NULL,
        pause_score REAL NOT NULL,
        pitch_score REAL NOT NULL,
        energy_score REAL NOT NULL,
        clarity_score REAL NOT NULL,
        flaws_json TEXT NOT NULL,
        features_summary_json TEXT NOT NULL,
        time_series_json TEXT NOT NULL,
        rubric_json TEXT NOT NULL,
        speaker_id TEXT
    );
    """)

    # Dataset samples table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_samples (
        sample_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        transcript TEXT NOT NULL,
        ideal_audio_path TEXT NOT NULL,
        flawed_audio_path TEXT NOT NULL,
        speaker_id TEXT NOT NULL,
        flaw_category TEXT NOT NULL,
        flaw_start REAL NOT NULL,
        flaw_end REAL NOT NULL,
        severity TEXT NOT NULL,
        annotation_notes TEXT,
        recording_conditions TEXT,
        split TEXT DEFAULT 'test',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Rubric config table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rubric_config (
        id INTEGER PRIMARY KEY,
        config_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Seed dataset_samples if empty
    cursor.execute("SELECT COUNT(*) FROM dataset_samples")
    count = cursor.fetchone()[0]
    if count == 0:
        meta_json_path = PROJECT_ROOT / "dataset" / "metadata" / "dataset.json"
        if not meta_json_path.exists():
            meta_json_path = Path("dataset/metadata/dataset.json")
        if meta_json_path.exists():
            with open(meta_json_path, "r", encoding="utf-8") as f:
                samples = json.load(f)
                for s in samples:
                    cursor.execute("""
                    INSERT INTO dataset_samples (
                        sample_id, title, category, transcript, ideal_audio_path,
                        flawed_audio_path, speaker_id, flaw_category, flaw_start,
                        flaw_end, severity, annotation_notes, recording_conditions, split
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        s["sample_id"], s["title"], s["category"], s["transcript"],
                        s["ideal_audio_path"], s["flawed_audio_path"], s["speaker_id"],
                        s["flaw_category"], s["flaw_start"], s["flaw_end"],
                        s["severity"], s.get("annotation_notes"), s.get("recording_conditions"),
                        s.get("split", "test")
                    ))
            conn.commit()
            print(f"[SpeechCoach DB] Seeded {len(samples)} contrastive dataset samples.")

    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")

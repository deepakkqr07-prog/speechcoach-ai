import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from ..database.db import get_connection

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("")
def get_all_history():
    """Returns summary list of all stored analyses plus aggregate dashboard metrics"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT id, created_at, filename, transcript, is_contrastive,
           overall_score, pacing_score, pause_score, pitch_score,
           energy_score, clarity_score, flaws_json, speaker_id
    FROM analyses
    ORDER BY created_at DESC
    """)
    rows = c.fetchall()

    history_items = []
    flaw_counts = {}

    for r in rows:
        flaws_list = json.loads(r["flaws_json"]) if r["flaws_json"] else []
        for f in flaws_list:
            cat = f.get("category", "Other")
            flaw_counts[cat] = flaw_counts.get(cat, 0) + 1

        history_items.append({
            "id": r["id"],
            "created_at": r["created_at"],
            "filename": r["filename"],
            "transcript": (r["transcript"][:90] + "...") if r["transcript"] and len(r["transcript"]) > 90 else (r["transcript"] or ""),
            "is_contrastive": bool(r["is_contrastive"]),
            "overall_score": round(r["overall_score"], 1),
            "pacing_score": round(r["pacing_score"], 1),
            "pause_score": round(r["pause_score"], 1),
            "pitch_score": round(r["pitch_score"], 1),
            "energy_score": round(r["energy_score"], 1),
            "clarity_score": round(r["clarity_score"], 1),
            "flaw_count": len(flaws_list),
            "primary_flaws": [f.get("category") for f in flaws_list[:3]],
            "speaker_id": r["speaker_id"]
        })

    # Sort flaw counts descending
    sorted_flaws = sorted([{"flaw": k, "count": v} for k, v in flaw_counts.items()], key=lambda x: x["count"], reverse=True)

    latest_score = history_items[0]["overall_score"] if history_items else None
    avg_score = round(sum(h["overall_score"] for h in history_items) / len(history_items), 1) if history_items else None

    conn.close()

    return {
        "total_analyses": len(history_items),
        "latest_score": latest_score,
        "average_score": avg_score,
        "frequent_flaws": sorted_flaws,
        "items": history_items
    }

@router.get("/{analysis_id}")
def get_analysis_detail(analysis_id: str):
    """Retrieves full analysis record including charts, time-series, and timestamped flaws"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,))
    row = c.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Analysis ID {analysis_id} not found.")

    audio_fn = os.path.basename(row["audio_path"])
    ref_fn = os.path.basename(row["reference_audio_path"]) if row["reference_audio_path"] else None

    return {
        "analysis_id": row["id"],
        "created_at": row["created_at"],
        "filename": row["filename"],
        "audio_url": f"/api/audio/{audio_fn}",
        "reference_audio_url": f"/api/audio/{ref_fn}" if ref_fn else None,
        "transcript": row["transcript"],
        "is_contrastive": bool(row["is_contrastive"]),
        "scores": {
            "overall": round(row["overall_score"], 1),
            "pacing": round(row["pacing_score"], 1),
            "pause_management": round(row["pause_score"], 1),
            "pitch_variation": round(row["pitch_score"], 1),
            "vocal_energy": round(row["energy_score"], 1),
            "articulation": round(row["clarity_score"], 1),
            "weights": json.loads(row["rubric_json"]).get("weights", {}) if row["rubric_json"] else {}
        },
        "flaws": json.loads(row["flaws_json"]),
        "time_series": json.loads(row["time_series_json"]),
        "summary_metrics": json.loads(row["features_summary_json"]),
        "speaker_id": row["speaker_id"]
    }

@router.delete("/{analysis_id}")
def delete_analysis(analysis_id: str):
    """Deletes an analysis record and its uploaded audio file"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT audio_path FROM analyses WHERE id = ?", (analysis_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Analysis record not found.")

    audio_path = row["audio_path"]
    if audio_path and os.path.exists(audio_path) and "uploads" in audio_path:
        try:
            os.remove(audio_path)
        except Exception:
            pass

    c.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
    conn.commit()
    conn.close()

    return {"status": "deleted", "id": analysis_id}

@router.get("/compare/{id1}/{id2}")
def compare_analyses(id1: str, id2: str):
    """Side-by-side comparative progress delta between two attempts"""
    rec1 = get_analysis_detail(id1)
    rec2 = get_analysis_detail(id2)

    s1 = rec1["scores"]
    s2 = rec2["scores"]

    score_deltas = {
        "overall": round(s2["overall"] - s1["overall"], 1),
        "pacing": round(s2["pacing"] - s1["pacing"], 1),
        "pause_management": round(s2["pause_management"] - s1["pause_management"], 1),
        "pitch_variation": round(s2["pitch_variation"] - s1["pitch_variation"], 1),
        "vocal_energy": round(s2["vocal_energy"] - s1["vocal_energy"], 1),
        "articulation": round(s2["articulation"] - s1["articulation"], 1),
    }

    return {
        "attempt_1": rec1,
        "attempt_2": rec2,
        "score_deltas": score_deltas,
        "flaw_count_delta": len(rec2["flaws"]) - len(rec1["flaws"]),
        "improvement_detected": score_deltas["overall"] > 0
    }

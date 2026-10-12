import os
import io
import csv
import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from ..database.db import get_connection
from ..schemas.schemas import DatasetSampleItem

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

@router.get("", response_model=List[DatasetSampleItem])
def get_dataset_samples(
    split: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    flaw_category: Optional[str] = Query(None)
):
    """Returns all paired contrastive samples in the dataset with optional filtering"""
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM dataset_samples WHERE 1=1"
    params = []

    if split:
        query += " AND split = ?"
        params.append(split)
    if category:
        query += " AND category = ?"
        params.append(category)
    if flaw_category:
        query += " AND flaw_category = ?"
        params.append(flaw_category)

    query += " ORDER BY sample_id ASC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    samples = []
    for r in rows:
        samples.append(DatasetSampleItem(
            sample_id=r["sample_id"],
            title=r["title"],
            category=r["category"],
            transcript=r["transcript"],
            ideal_audio_path=f"/api/audio/{os.path.basename(r['ideal_audio_path'])}",
            flawed_audio_path=f"/api/audio/{os.path.basename(r['flawed_audio_path'])}",
            speaker_id=r["speaker_id"],
            flaw_category=r["flaw_category"],
            flaw_start=r["flaw_start"],
            flaw_end=r["flaw_end"],
            severity=r["severity"],
            annotation_notes=r["annotation_notes"],
            recording_conditions=r["recording_conditions"],
            split=r["split"],
            created_at=r["created_at"]
        ))
    return samples

@router.get("/export")
def export_dataset(format: str = Query("json", pattern="^(json|csv)$")):
    """Exports dataset metadata as downloadable JSON or CSV"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM dataset_samples ORDER BY sample_id ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    if format == "csv":
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=speechcoach_contrastive_dataset.csv"}
        )
    else:
        return Response(
            content=json.dumps(rows, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=speechcoach_contrastive_dataset.json"}
        )

@router.get("/{sample_id}", response_model=DatasetSampleItem)
def get_sample_detail(sample_id: str):
    """Retrieves a single paired dataset sample by ID"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM dataset_samples WHERE sample_id = ?", (sample_id,))
    r = c.fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail=f"Dataset sample {sample_id} not found.")

    return DatasetSampleItem(
        sample_id=r["sample_id"],
        title=r["title"],
        category=r["category"],
        transcript=r["transcript"],
        ideal_audio_path=f"/api/audio/{os.path.basename(r['ideal_audio_path'])}",
        flawed_audio_path=f"/api/audio/{os.path.basename(r['flawed_audio_path'])}",
        speaker_id=r["speaker_id"],
        flaw_category=r["flaw_category"],
        flaw_start=r["flaw_start"],
        flaw_end=r["flaw_end"],
        severity=r["severity"],
        annotation_notes=r["annotation_notes"],
        recording_conditions=r["recording_conditions"],
        split=r["split"],
        created_at=r["created_at"]
    )

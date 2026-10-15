import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Ensure backend root is in Python sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.db import init_db
from app.api.endpoints_analysis import router as analysis_router
from app.api.endpoints_history import router as history_router
from app.api.endpoints_dataset import router as dataset_router
from app.api.endpoints_rubric import router as rubric_router

# Initialize Database
init_db()

app = FastAPI(
    title="SpeechCoach AI API",
    description="Contrastive Speech Analytics & Temporal Flaw Grounding Backend",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(analysis_router)
app.include_router(history_router)
app.include_router(dataset_router)
app.include_router(rubric_router)

# Audio File Streaming Endpoint
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

@app.get("/api/audio/{filename}")
async def get_audio_file(filename: str):
    """Safely serves audio files from uploads or dataset directories"""
    safe_name = os.path.basename(filename)
    
    tmp_upload = Path("/tmp/uploads") / safe_name
    if tmp_upload.exists():
        return FileResponse(tmp_upload, media_type="audio/wav")

    upload_path = PROJECT_ROOT / "uploads" / safe_name
    if upload_path.exists():
        return FileResponse(upload_path, media_type="audio/wav")
        
    dataset_path = PROJECT_ROOT / "dataset" / "sample_data" / safe_name
    if dataset_path.exists():
        return FileResponse(dataset_path, media_type="audio/wav")

    # Also check local Cwd
    if Path(f"uploads/{safe_name}").exists():
        return FileResponse(Path(f"uploads/{safe_name}"), media_type="audio/wav")
    if Path(f"dataset/sample_data/{safe_name}").exists():
        return FileResponse(Path(f"dataset/sample_data/{safe_name}"), media_type="audio/wav")

    raise HTTPException(status_code=404, detail=f"Audio file '{safe_name}' not found.")

@app.get("/api/health")
def health_check():
    """Health check endpoint providing system status and capabilities"""
    whisper_available = False
    try:
        import whisper
        whisper_available = True
    except Exception:
        pass

    return {
        "status": "online",
        "service": "SpeechCoach AI",
        "version": "1.0.0",
        "capabilities": {
            "contrastive_temporal_grounding": True,
            "forced_alignment": True,
            "whisper_asr": whisper_available,
            "speaker_agnostic_normalization": True,
            "flaw_categories_count": 8,
            "rubric_categories_count": 5
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

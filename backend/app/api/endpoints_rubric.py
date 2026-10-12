import json
from fastapi import APIRouter
from ..database.db import get_connection
from ..schemas.schemas import RubricConfig

router = APIRouter(prefix="/api/rubric", tags=["rubric"])

@router.get("", response_model=RubricConfig)
def get_rubric():
    """Returns current active evaluation rubric configuration"""
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT config_json FROM rubric_config ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()

    if row and row["config_json"]:
        data = json.loads(row["config_json"])
        return RubricConfig(**data)
    return RubricConfig()

@router.post("", response_model=RubricConfig)
def update_rubric(config: RubricConfig):
    """Updates rubric weights and thresholds (normalizes weights to 1.0)"""
    total_w = sum(config.weights.values())
    if total_w > 0:
        normalized_weights = {k: round(v / total_w, 3) for k, v in config.weights.items()}
    else:
        normalized_weights = config.weights

    clean_config = RubricConfig(
        weights=normalized_weights,
        thresholds=config.thresholds
    )

    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO rubric_config (config_json) VALUES (?)", (json.dumps(clean_config.model_dump()),))
    conn.commit()
    conn.close()

    return clean_config

@router.post("/reset", response_model=RubricConfig)
def reset_rubric():
    """Resets rubric to default standard competition weights and thresholds"""
    default_config = RubricConfig()
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM rubric_config")
    c.execute("INSERT INTO rubric_config (config_json) VALUES (?)", (json.dumps(default_config.model_dump()),))
    conn.commit()
    conn.close()
    return default_config

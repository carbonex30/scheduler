"""
ML Training Schemas
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel


class MLTrainingRequest(BaseModel):
    """Request to train ML model"""
    model_type: str = "preference_predictor"  # 'preference_predictor', 'conflict_detector', etc.
    model_name: Optional[str] = None


class MLTrainingResponse(BaseModel):
    """Response from ML training"""
    success: bool
    model_type: str
    num_samples: int
    metrics: Dict[str, float]
    model_path: str
    training_duration_seconds: int
    warnings: List[str] = []
    errors: List[str] = []


class MLTrainingHistoryResponse(BaseModel):
    """ML Training history record"""
    id: str
    model_type: str
    training_started_at: datetime
    training_completed_at: Optional[datetime]
    num_samples: Optional[int]
    metrics: Optional[Dict[str, float]]
    model_path: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

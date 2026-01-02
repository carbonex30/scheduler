"""
ML Training API endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.ml_training import MLTrainingHistory
from app.schemas.ml_training import (
    MLTrainingResponse,
    MLTrainingHistoryResponse,
)
from app.services.ml_training_service import train_ml_model


router = APIRouter()


@router.post("/train", response_model=MLTrainingResponse)
async def train_model(
    file: UploadFile = File(...),
    model_type: str = Form("preference_predictor"),
    model_name: str = Form(None),
    db: Session = Depends(get_db),
):
    """
    Train ML model on historical schedule data

    Supported model types:
    - preference_predictor: Learn employee shift preferences
    - conflict_detector: Detect potential scheduling conflicts (future)

    Expected CSV format:
    Location, Area, Team Member, Start Date, Start Time, End Date, End Time,
    Total Meal Break, Total Rest Break, Total Time, Status, Note, Cost, Email
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Validate model type
    valid_model_types = ['preference_predictor', 'conflict_detector']
    if model_type not in valid_model_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model type. Must be one of: {', '.join(valid_model_types)}"
        )

    try:
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')

        # Normalize line endings
        csv_content = csv_content.replace('\r\n', '\n').replace('\r', '\n')

        # Train model
        model_identifier = model_name if model_name else model_type
        result = train_ml_model(db, csv_content, model_identifier)

        if not result.success:
            raise HTTPException(
                status_code=500,
                detail=f"Training failed: {'; '.join(result.errors)}"
            )

        return MLTrainingResponse(
            success=result.success,
            model_type=result.model_type,
            num_samples=result.num_samples,
            metrics=result.metrics,
            model_path=result.model_path,
            training_duration_seconds=result.training_duration_seconds,
            warnings=result.warnings,
            errors=result.errors,
        )

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error. Please ensure CSV is UTF-8 encoded.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/history", response_model=List[MLTrainingHistoryResponse])
async def get_training_history(
    skip: int = 0,
    limit: int = 50,
    model_type: str = None,
    db: Session = Depends(get_db),
):
    """
    Get ML training history

    Query parameters:
    - skip: Number of records to skip (pagination)
    - limit: Maximum number of records to return
    - model_type: Filter by model type (optional)
    """
    query = select(MLTrainingHistory).order_by(MLTrainingHistory.created_at.desc())

    if model_type:
        query = query.where(MLTrainingHistory.model_type == model_type)

    query = query.offset(skip).limit(limit)

    histories = db.execute(query).scalars().all()

    return [
        MLTrainingHistoryResponse(
            id=str(h.id),
            model_type=h.model_type,
            training_started_at=h.training_started_at,
            training_completed_at=h.training_completed_at,
            num_samples=h.num_samples,
            metrics=h.metrics,
            model_path=h.model_path,
            status=h.status,
            error_message=h.error_message,
            created_at=h.created_at,
        )
        for h in histories
    ]


@router.get("/history/{training_id}", response_model=MLTrainingHistoryResponse)
async def get_training_record(
    training_id: str,
    db: Session = Depends(get_db),
):
    """Get specific ML training record by ID"""
    history = db.execute(
        select(MLTrainingHistory).where(MLTrainingHistory.id == training_id)
    ).scalar_one_or_none()

    if not history:
        raise HTTPException(status_code=404, detail="Training record not found")

    return MLTrainingHistoryResponse(
        id=str(history.id),
        model_type=history.model_type,
        training_started_at=history.training_started_at,
        training_completed_at=history.training_completed_at,
        num_samples=history.num_samples,
        metrics=history.metrics,
        model_path=history.model_path,
        status=history.status,
        error_message=history.error_message,
        created_at=history.created_at,
    )

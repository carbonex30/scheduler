"""
Schedule API endpoints
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.schedule import Schedule
from app.models.assignment import Assignment
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleResponse,
    ScheduleListResponse,
    ScheduleGenerateRequest,
    ScheduleGenerateResponse,
)
from app.schemas.assignment import AssignmentResponse
from app.services.schedule_generation_service import ScheduleGenerationService

router = APIRouter()


@router.post("/generate", response_model=ScheduleGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_schedule(
    request: ScheduleGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate an optimized schedule using ML predictions and constraint satisfaction

    This endpoint:
    1. Loads trained ML models for employee preference prediction
    2. Retrieves shift templates and available employees for the date range
    3. Scores employee-shift combinations using ML and explicit preferences
    4. Applies constraints (weekly hours, availability, time-off requests)
    5. Creates optimized shift assignments using a greedy algorithm
    6. Returns the generated schedule with metrics
    """
    try:
        service = ScheduleGenerationService(db)

        # Convert UUID list to string list
        dept_ids = [str(d) for d in request.department_ids] if request.department_ids else None

        result = service.generate_schedule(
            name=request.name,
            start_date=request.start_date,
            end_date=request.end_date,
            department_ids=dept_ids,
            use_ml=request.use_ml,
            notes=request.notes,
        )

        return ScheduleGenerateResponse(
            success=result.success,
            schedule_id=result.schedule_id,
            num_assignments=result.num_assignments,
            num_unassigned_shifts=result.num_unassigned_shifts,
            optimizer_score=result.optimizer_score,
            generation_duration_seconds=result.generation_duration_seconds,
            ml_assisted=result.ml_assisted,
            warnings=result.warnings,
            errors=result.errors,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schedule generation failed: {str(e)}"
        )


@router.get("/", response_model=ScheduleListResponse)
def list_schedules(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
):
    """
    List all schedules with optional filtering and pagination

    Statuses: 'draft', 'generating', 'generated', 'published', 'archived'
    """
    stmt = select(Schedule)

    if status_filter:
        stmt = stmt.where(Schedule.status == status_filter)

    stmt = stmt.order_by(desc(Schedule.created_at))

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar()

    # Get paginated results
    stmt = stmt.offset(skip).limit(limit)
    schedules = db.execute(stmt).scalars().all()

    return ScheduleListResponse(
        total=total,
        items=[ScheduleResponse.model_validate(s) for s in schedules]
    )


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(
    schedule_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific schedule by ID"""
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    schedule = db.execute(stmt).scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return ScheduleResponse.model_validate(schedule)


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule: ScheduleCreate,
    db: Session = Depends(get_db),
):
    """Create a new empty schedule (draft)"""
    db_schedule = Schedule(
        name=schedule.name,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        notes=schedule.notes,
        status='draft',
        ml_assisted=False,
    )

    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    return ScheduleResponse.model_validate(db_schedule)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: UUID,
    schedule_update: ScheduleUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing schedule"""
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    schedule = db.execute(stmt).scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Update fields
    update_data = schedule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)

    return ScheduleResponse.model_validate(schedule)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a schedule

    This will cascade delete all associated assignments.
    """
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    schedule = db.execute(stmt).scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    db.delete(schedule)
    db.commit()

    return None


@router.post("/{schedule_id}/publish", response_model=ScheduleResponse)
def publish_schedule(
    schedule_id: UUID,
    db: Session = Depends(get_db),
):
    """Publish a schedule (mark as published)"""
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    schedule = db.execute(stmt).scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    if schedule.status == 'published':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Schedule is already published"
        )

    schedule.status = 'published'
    schedule.published_at = func.now()

    db.commit()
    db.refresh(schedule)

    return ScheduleResponse.model_validate(schedule)


@router.get("/{schedule_id}/assignments", response_model=list[AssignmentResponse])
def get_schedule_assignments(
    schedule_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db),
):
    """Get all assignments for a schedule"""
    # Verify schedule exists
    stmt = select(Schedule).where(Schedule.id == schedule_id)
    schedule = db.execute(stmt).scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Get assignments
    stmt = (
        select(Assignment)
        .where(Assignment.schedule_id == schedule_id)
        .order_by(Assignment.shift_date, Assignment.start_time)
        .offset(skip)
        .limit(limit)
    )

    assignments = db.execute(stmt).scalars().all()

    return [AssignmentResponse.model_validate(a) for a in assignments]

"""
Shift Template CRUD API endpoints
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.shift_template import ShiftTemplate
from app.models.department import Department
from app.schemas.shift_template import (
    ShiftTemplateCreate,
    ShiftTemplateUpdate,
    ShiftTemplateResponse,
    ShiftTemplateListResponse,
)

router = APIRouter()


@router.get("/", response_model=ShiftTemplateListResponse)
async def list_shift_templates(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    department_id: Optional[UUID] = Query(None, description="Filter by department ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    day_of_week: Optional[int] = Query(None, ge=0, le=6, description="Filter by day of week"),
    db: Session = Depends(get_db),
):
    """
    List all shift templates with pagination and filtering
    """
    query = select(ShiftTemplate)

    # Apply filters
    if department_id is not None:
        query = query.where(ShiftTemplate.department_id == department_id)

    if is_active is not None:
        query = query.where(ShiftTemplate.is_active == is_active)

    if day_of_week is not None:
        query = query.where(ShiftTemplate.day_of_week == day_of_week)

    query = query.order_by(ShiftTemplate.department_id, ShiftTemplate.day_of_week, ShiftTemplate.start_time)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit)
    shift_templates = db.execute(query).scalars().all()

    return ShiftTemplateListResponse(total=total, items=shift_templates)


@router.post("/", response_model=ShiftTemplateResponse, status_code=201)
async def create_shift_template(
    shift_template: ShiftTemplateCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new shift template
    """
    # Validate department exists
    department = db.execute(
        select(Department).where(Department.id == shift_template.department_id)
    ).scalar_one_or_none()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Validate end time is after start time
    if shift_template.end_time <= shift_template.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )

    db_shift_template = ShiftTemplate(**shift_template.model_dump())
    db.add(db_shift_template)
    db.commit()
    db.refresh(db_shift_template)

    return db_shift_template


@router.get("/{shift_template_id}", response_model=ShiftTemplateResponse)
async def get_shift_template(
    shift_template_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a shift template by ID
    """
    shift_template = db.execute(
        select(ShiftTemplate).where(ShiftTemplate.id == shift_template_id)
    ).scalar_one_or_none()

    if not shift_template:
        raise HTTPException(status_code=404, detail="Shift template not found")

    return shift_template


@router.put("/{shift_template_id}", response_model=ShiftTemplateResponse)
async def update_shift_template(
    shift_template_id: UUID,
    shift_template_update: ShiftTemplateUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a shift template
    """
    db_shift_template = db.execute(
        select(ShiftTemplate).where(ShiftTemplate.id == shift_template_id)
    ).scalar_one_or_none()

    if not db_shift_template:
        raise HTTPException(status_code=404, detail="Shift template not found")

    # Validate department if being changed
    if shift_template_update.department_id:
        department = db.execute(
            select(Department).where(Department.id == shift_template_update.department_id)
        ).scalar_one_or_none()

        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    # Update only provided fields
    update_data = shift_template_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_shift_template, field, value)

    # Validate end time is after start time after update
    if db_shift_template.end_time <= db_shift_template.start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )

    db.commit()
    db.refresh(db_shift_template)

    return db_shift_template


@router.delete("/{shift_template_id}", status_code=204)
async def delete_shift_template(
    shift_template_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a shift template

    Note: This will fail if the shift template has assignments.
    Consider soft-deleting by setting is_active=False instead.
    """
    db_shift_template = db.execute(
        select(ShiftTemplate).where(ShiftTemplate.id == shift_template_id)
    ).scalar_one_or_none()

    if not db_shift_template:
        raise HTTPException(status_code=404, detail="Shift template not found")

    # Check if shift template has assignments
    from app.models.assignment import Assignment
    assignment_count = db.execute(
        select(func.count()).select_from(Assignment).where(Assignment.shift_template_id == shift_template_id)
    ).scalar()

    if assignment_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete shift template with {assignment_count} assignments. Set is_active=False instead."
        )

    db.delete(db_shift_template)
    db.commit()

    return None

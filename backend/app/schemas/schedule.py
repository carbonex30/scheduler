"""
Schedule schemas for request/response validation
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ScheduleBase(BaseModel):
    """Base schedule schema with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    start_date: date
    end_date: date
    notes: Optional[str] = None


class ScheduleCreate(ScheduleBase):
    """Schema for creating a new schedule"""
    pass


class ScheduleUpdate(BaseModel):
    """Schema for updating an existing schedule"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ScheduleGenerateRequest(BaseModel):
    """Schema for schedule generation request"""
    name: str = Field(..., min_length=1, max_length=255)
    start_date: date
    end_date: date
    department_ids: Optional[List[UUID]] = None
    use_ml: bool = Field(True, description="Use ML predictions for optimization")
    notes: Optional[str] = None


class ScheduleGenerateResponse(BaseModel):
    """Schema for schedule generation response"""
    success: bool
    schedule_id: Optional[str] = None
    num_assignments: int
    num_unassigned_shifts: int
    optimizer_score: float
    generation_duration_seconds: int
    ml_assisted: bool
    warnings: List[str] = []
    errors: List[str] = []


class ScheduleResponse(ScheduleBase):
    """Schema for schedule response"""
    id: UUID
    status: str
    generation_started_at: Optional[datetime] = None
    generation_completed_at: Optional[datetime] = None
    generation_duration_seconds: Optional[int] = None
    optimizer_score: Optional[Decimal] = None
    ml_assisted: bool
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ScheduleListResponse(BaseModel):
    """Schema for paginated schedule list response"""
    total: int
    items: List[ScheduleResponse]

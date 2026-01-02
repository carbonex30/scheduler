"""
Shift Template schemas for request/response validation
"""

from datetime import datetime, time
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ShiftTemplateBase(BaseModel):
    """Base shift template schema with common fields"""
    name: str = Field(..., min_length=1, max_length=100, description="Shift template name")
    department_id: UUID = Field(..., description="Department this shift belongs to")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: time = Field(..., description="Shift start time")
    end_time: time = Field(..., description="Shift end time")
    duration_hours: Decimal = Field(..., ge=0, le=24, description="Shift duration in hours")
    required_employees: int = Field(default=1, ge=1, description="Number of employees required")
    is_active: bool = Field(True, description="Whether the shift template is active")

    @field_validator('duration_hours', mode='before')
    @classmethod
    def validate_duration(cls, v):
        """Convert to Decimal if needed"""
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class ShiftTemplateCreate(ShiftTemplateBase):
    """Schema for creating a new shift template"""
    pass


class ShiftTemplateUpdate(BaseModel):
    """Schema for updating an existing shift template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    department_id: Optional[UUID] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration_hours: Optional[Decimal] = Field(None, ge=0, le=24)
    required_employees: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

    @field_validator('duration_hours', mode='before')
    @classmethod
    def validate_duration(cls, v):
        """Convert to Decimal if needed"""
        if v is not None and isinstance(v, (int, float)):
            return Decimal(str(v))
        return v


class ShiftTemplateResponse(ShiftTemplateBase):
    """Schema for shift template response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShiftTemplateListResponse(BaseModel):
    """Schema for paginated shift template list response"""
    total: int
    items: list[ShiftTemplateResponse]

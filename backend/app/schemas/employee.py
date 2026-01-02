"""
Employee schemas for request/response validation
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class EmployeeBase(BaseModel):
    """Base employee schema with common fields"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    department_id: UUID
    employment_type: str = Field(..., description="full_time, part_time, or contractor")
    hire_date: date
    max_hours_per_week: Decimal = Field(default=Decimal("40.0"), ge=0, le=168)
    min_hours_per_week: Decimal = Field(default=Decimal("0.0"), ge=0)
    is_active: bool = Field(True, description="Whether the employee is active")


class EmployeeCreate(EmployeeBase):
    """Schema for creating a new employee"""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating an existing employee"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    department_id: Optional[UUID] = None
    employment_type: Optional[str] = None
    hire_date: Optional[date] = None
    max_hours_per_week: Optional[Decimal] = Field(None, ge=0, le=168)
    min_hours_per_week: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class EmployeeResponse(EmployeeBase):
    """Schema for employee response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeListResponse(BaseModel):
    """Schema for paginated employee list response"""
    total: int
    items: list[EmployeeResponse]

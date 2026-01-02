"""
Department schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class DepartmentBase(BaseModel):
    """Base department schema with common fields"""
    name: str = Field(..., min_length=1, max_length=100, description="Department name")
    description: Optional[str] = Field(None, max_length=500, description="Department description")
    is_active: bool = Field(True, description="Whether the department is active")


class DepartmentCreate(DepartmentBase):
    """Schema for creating a new department"""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating an existing department"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    """Schema for department response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentListResponse(BaseModel):
    """Schema for paginated department list response"""
    total: int
    items: list[DepartmentResponse]

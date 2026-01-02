"""
Assignment schemas for request/response validation
"""

from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class AssignmentResponse(BaseModel):
    """Schema for assignment response"""
    id: UUID
    schedule_id: UUID
    employee_id: UUID
    shift_template_id: UUID
    shift_date: date
    start_time: time
    end_time: time
    hours: Decimal
    is_confirmed: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

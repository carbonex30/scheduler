from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Date, Time, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    shift_template_id = Column(UUID(as_uuid=True), ForeignKey("shift_templates.id"), nullable=False)

    # Assignment details
    shift_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    hours = Column(Numeric(5, 2), nullable=False)

    # Status
    is_confirmed = Column(Boolean, default=False)
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    schedule = relationship("Schedule", back_populates="assignments")
    employee = relationship("Employee", back_populates="assignments")
    shift_template = relationship("ShiftTemplate", back_populates="assignments")

    def __repr__(self):
        return f"<Assignment(employee={self.employee_id}, date={self.shift_date}, hours={self.hours})>"

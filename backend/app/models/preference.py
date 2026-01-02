from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class EmployeePreference(Base):
    __tablename__ = "employee_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    shift_template_id = Column(UUID(as_uuid=True), ForeignKey("shift_templates.id"), nullable=True)

    # Preference details
    # Types: 'preferred_shift', 'avoid_shift', 'preferred_days', 'avoid_days'
    preference_type = Column(String(50), nullable=False)
    day_of_week = Column(Integer)  # NULL for general preferences, 0-6 for specific days
    priority = Column(Integer, default=5)  # 1=low, 10=high

    # Time range (optional)
    start_date = Column(Date)
    end_date = Column(Date)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="preferences")

    def __repr__(self):
        return f"<EmployeePreference(employee={self.employee_id}, type='{self.preference_type}', priority={self.priority})>"

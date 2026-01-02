from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Time, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)

    # Shift details
    name = Column(String(100), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_hours = Column(Numeric(5, 2), nullable=False)

    # Staffing requirements
    required_employees = Column(Integer, default=1, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    department = relationship("Department", back_populates="shift_templates")
    assignments = relationship("Assignment", back_populates="shift_template")

    def __repr__(self):
        return f"<ShiftTemplate(name='{self.name}', day={self.day_of_week}, time={self.start_time}-{self.end_time})>"

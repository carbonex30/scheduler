from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)

    # Basic information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    hire_date = Column(Date, nullable=False)

    # Employment details
    employment_type = Column(String(50), nullable=False)  # 'full_time', 'part_time', 'contractor'
    max_hours_per_week = Column(Numeric(5, 2), default=40.0)
    min_hours_per_week = Column(Numeric(5, 2), default=0.0)
    hourly_rate = Column(Numeric(10, 2))

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    department = relationship("Department", back_populates="employees")
    assignments = relationship("Assignment", back_populates="employee")
    preferences = relationship("EmployeePreference", back_populates="employee")
    time_off_requests = relationship("TimeOffRequest", back_populates="employee")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Employee(name='{self.full_name}', department='{self.department.name if self.department else None}')>"

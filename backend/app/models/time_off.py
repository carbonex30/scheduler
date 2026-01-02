from sqlalchemy import Column, String, DateTime, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)

    # Time off details
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Types: 'vacation', 'sick', 'personal', 'unpaid'
    request_type = Column(String(50), nullable=False, default='vacation')

    # Reason
    reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="time_off_requests")

    def __repr__(self):
        return f"<TimeOffRequest(employee={self.employee_id}, dates={self.start_date} to {self.end_date}, type='{self.request_type}')>"

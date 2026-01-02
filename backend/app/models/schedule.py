from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Schedule details
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    # Status: 'draft', 'generating', 'generated', 'published', 'archived'
    status = Column(String(50), nullable=False, default='draft')

    # Generation metadata
    generation_started_at = Column(DateTime(timezone=True))
    generation_completed_at = Column(DateTime(timezone=True))
    generation_duration_seconds = Column(Integer)
    optimizer_score = Column(Numeric(10, 4))  # Fitness score from optimizer
    ml_assisted = Column(Boolean, default=False)

    # Notes
    notes = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    published_at = Column(DateTime(timezone=True))

    # Relationships
    assignments = relationship("Assignment", back_populates="schedule", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Schedule(name='{self.name}', period={self.start_date} to {self.end_date}, status='{self.status}')>"

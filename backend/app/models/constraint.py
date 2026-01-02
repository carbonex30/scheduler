from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Constraint(Base):
    __tablename__ = "constraints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Constraint details
    name = Column(String(100), nullable=False)
    constraint_type = Column(String(50), nullable=False)  # 'hard' or 'soft'
    category = Column(String(100), nullable=False)  # 'labor_law', 'fairness', 'business_rule'
    description = Column(Text)

    # Configuration (flexible JSON structure)
    config = Column(JSONB, nullable=False)

    # Weight (for soft constraints)
    weight = Column(Numeric(5, 2), default=1.0)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Constraint(name='{self.name}', type='{self.constraint_type}', category='{self.category}')>"

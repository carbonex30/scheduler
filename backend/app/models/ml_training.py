from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from ..database import Base


class MLTrainingHistory(Base):
    __tablename__ = "ml_training_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Model details
    model_type = Column(String(100), nullable=False)  # 'preference_predictor', 'conflict_detector'

    # Training metadata
    training_started_at = Column(DateTime(timezone=True), nullable=False)
    training_completed_at = Column(DateTime(timezone=True))
    num_samples = Column(Integer)

    # Performance metrics (JSON structure for flexibility)
    metrics = Column(JSONB)  # {'accuracy': 0.85, 'precision': 0.82, 'recall': 0.88, ...}

    # Model storage
    model_path = Column(String(500))  # Path to saved model file

    # Status: 'training', 'completed', 'failed'
    status = Column(String(50), default='training', nullable=False)
    error_message = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<MLTrainingHistory(model='{self.model_type}', status='{self.status}', samples={self.num_samples})>"

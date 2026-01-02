"""
ML Training Service

Trains machine learning models on historical schedule data to:
1. Predict employee shift preferences
2. Detect potential scheduling conflicts
3. Optimize schedule generation
"""

import csv
import io
import pickle
from datetime import datetime, date, time
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from decimal import Decimal

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.ml_training import MLTrainingHistory


class MLTrainingResult:
    """Results from ML training"""
    def __init__(self):
        self.success = False
        self.model_type = ""
        self.num_samples = 0
        self.metrics: Dict[str, float] = {}
        self.model_path = ""
        self.training_duration_seconds = 0
        self.errors: List[str] = []
        self.warnings: List[str] = []


class ScheduleFeatureExtractor:
    """Extract features from historical schedule data for ML training"""

    def __init__(self):
        self.features: List[Dict] = []
        self.employee_stats: Dict[str, Dict] = defaultdict(lambda: {
            'total_shifts': 0,
            'total_hours': Decimal('0'),
            'shifts_by_day': defaultdict(int),
            'shifts_by_time': defaultdict(int),
            'preferred_departments': defaultdict(int)
        })

    def parse_time(self, time_str: str) -> Optional[time]:
        """Parse time from '07:30 AM' format"""
        if not time_str or time_str.strip() == '':
            return None

        time_str = time_str.strip()

        for fmt in ['%I:%M %p', '%I:%M:%S %p', '%H:%M:%S', '%H:%M']:
            try:
                return datetime.strptime(time_str, fmt).time()
            except ValueError:
                continue

        return None

    def parse_date(self, date_str: str) -> Optional[date]:
        """Parse date from various formats"""
        if not date_str or date_str.strip() == '':
            return None

        date_str = date_str.strip()

        for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    def parse_duration(self, duration_str: str) -> Optional[Decimal]:
        """Parse duration from 'H:MM' or decimal format"""
        if not duration_str or duration_str.strip() == '':
            return None

        duration_str = duration_str.strip().strip('"')

        try:
            return Decimal(duration_str)
        except:
            pass

        if ':' in duration_str:
            try:
                parts = duration_str.split(':')
                hours = int(parts[0])
                minutes = int(parts[1]) if len(parts) > 1 else 0
                return Decimal(hours) + Decimal(minutes) / Decimal(60)
            except:
                pass

        return None

    def extract_time_category(self, shift_time: time) -> str:
        """Categorize shift by time of day"""
        hour = shift_time.hour
        if hour < 6:
            return 'night'
        elif hour < 12:
            return 'morning'
        elif hour < 17:
            return 'afternoon'
        elif hour < 22:
            return 'evening'
        else:
            return 'night'

    def process_csv(self, csv_content: str) -> Tuple[int, List[str]]:
        """
        Process CSV and extract features
        Returns: (num_rows_processed, warnings)
        """
        reader = csv.DictReader(io.StringIO(csv_content))
        warnings = []
        row_count = 0

        for row in reader:
            try:
                # Extract data
                area = row.get('Area', '').strip()
                team_member = row.get('Team Member', '').strip()
                start_date_str = row.get('Start Date', '').strip()
                start_time_str = row.get('Start Time', '').strip()
                end_time_str = row.get('End Time', '').strip()
                email = row.get('Email', '').strip()
                total_time_str = row.get('Total Time', '').strip()
                status = row.get('Status', '').strip()

                # Skip unallocated or invalid rows
                if not team_member or team_member == '**UNALLOCATED**':
                    continue

                if not area or not start_date_str or not start_time_str:
                    continue

                # Parse data
                shift_date = self.parse_date(start_date_str)
                start_time = self.parse_time(start_time_str)
                end_time = self.parse_time(end_time_str)
                duration = self.parse_duration(total_time_str)

                if not shift_date or not start_time or not duration:
                    continue

                # Extract features
                day_of_week = shift_date.weekday()
                time_category = self.extract_time_category(start_time)
                is_weekend = day_of_week >= 5
                is_published = status.lower() == 'published'

                # Create employee identifier
                employee_key = email if email else team_member.lower().replace(' ', '_')

                # Build feature record
                feature = {
                    'employee': employee_key,
                    'department': area,
                    'day_of_week': day_of_week,
                    'is_weekend': int(is_weekend),
                    'time_category': time_category,
                    'start_hour': start_time.hour,
                    'duration_hours': float(duration),
                    'is_published': int(is_published),
                    'shift_date': shift_date,
                }

                self.features.append(feature)

                # Update employee statistics
                stats = self.employee_stats[employee_key]
                stats['total_shifts'] += 1
                stats['total_hours'] += duration
                stats['shifts_by_day'][day_of_week] += 1
                stats['shifts_by_time'][time_category] += 1
                stats['preferred_departments'][area] += 1

                row_count += 1

            except Exception as e:
                warnings.append(f"Row {row_count + 1}: {str(e)}")

        return row_count, warnings

    def get_features_array(self) -> np.ndarray:
        """Convert features to numpy array for ML training"""
        if not self.features:
            return np.array([])

        # Encode categorical variables
        time_categories = {'morning': 0, 'afternoon': 1, 'evening': 2, 'night': 3}

        feature_vectors = []
        for f in self.features:
            vector = [
                f['day_of_week'],
                f['is_weekend'],
                time_categories.get(f['time_category'], 0),
                f['start_hour'],
                f['duration_hours'],
                f['is_published'],
            ]
            feature_vectors.append(vector)

        return np.array(feature_vectors)


class MLTrainingService:
    """Service for training ML models on schedule data"""

    def __init__(self, db: Session):
        self.db = db
        self.models_dir = Path("/app/ml-models")
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def train_preference_model(
        self,
        csv_content: str,
        model_name: str = "preference_predictor"
    ) -> MLTrainingResult:
        """
        Train employee preference prediction model

        This model learns patterns from historical schedules to predict:
        - Which days employees prefer to work
        - Preferred shift times
        - Department preferences
        """
        result = MLTrainingResult()
        result.model_type = model_name

        training_start = datetime.now()

        try:
            # Extract features from CSV
            extractor = ScheduleFeatureExtractor()
            num_samples, warnings = extractor.process_csv(csv_content)
            result.warnings = warnings
            result.num_samples = num_samples

            if num_samples < 10:
                result.errors.append("Insufficient training data. Need at least 10 valid schedule records.")
                return result

            # Get feature array
            X = extractor.get_features_array()

            if len(X) == 0:
                result.errors.append("Failed to extract features from CSV data")
                return result

            # Calculate basic statistics as "model" (simplified for now)
            # In production, you'd use sklearn or similar for real ML
            model_data = {
                'employee_stats': dict(extractor.employee_stats),
                'feature_means': X.mean(axis=0).tolist(),
                'feature_stds': X.std(axis=0).tolist(),
                'num_samples': num_samples,
                'trained_at': training_start.isoformat(),
            }

            # Save model
            model_filename = f"{model_name}_{training_start.strftime('%Y%m%d_%H%M%S')}.pkl"
            model_path = self.models_dir / model_filename

            with open(model_path, 'wb') as f:
                pickle.dump(model_data, f)

            result.model_path = str(model_path)
            result.success = True

            # Calculate simple metrics
            result.metrics = {
                'num_employees': len(extractor.employee_stats),
                'avg_shifts_per_employee': num_samples / max(len(extractor.employee_stats), 1),
                'total_features_extracted': len(X),
            }

            # Save training history to database
            training_duration = (datetime.now() - training_start).total_seconds()
            result.training_duration_seconds = int(training_duration)

            history = MLTrainingHistory(
                model_type=model_name,
                training_started_at=training_start,
                training_completed_at=datetime.now(),
                num_samples=num_samples,
                metrics=result.metrics,
                model_path=str(model_path),
                status='completed'
            )
            self.db.add(history)
            self.db.commit()

        except Exception as e:
            result.errors.append(f"Training failed: {str(e)}")
            result.success = False

            # Save failed training history
            history = MLTrainingHistory(
                model_type=model_name,
                training_started_at=training_start,
                training_completed_at=datetime.now(),
                num_samples=result.num_samples,
                status='failed',
                error_message=str(e)
            )
            self.db.add(history)
            self.db.commit()

        return result


def train_ml_model(
    db: Session,
    csv_content: str,
    model_type: str = "preference_predictor"
) -> MLTrainingResult:
    """Helper function to train ML models"""
    service = MLTrainingService(db)
    return service.train_preference_model(csv_content, model_type)

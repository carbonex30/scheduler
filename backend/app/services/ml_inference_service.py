"""
ML Inference Service

Loads trained ML models and provides predictions for schedule optimization.
Uses historical preference patterns to score employee-shift assignments.
"""

import pickle
from datetime import date, time, datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.models.ml_training import MLTrainingHistory
from app.models.employee import Employee
from app.models.shift_template import ShiftTemplate


class EmployeeShiftScore:
    """Score for an employee-shift combination"""
    def __init__(self):
        self.employee_id: str = ""
        self.shift_template_id: str = ""
        self.shift_date: date = None
        self.preference_score: float = 0.0  # 0-1, higher is better
        self.confidence: float = 0.0  # 0-1, how confident the prediction is
        self.factors: Dict[str, float] = {}  # Individual scoring factors


class MLInferenceService:
    """Service for making predictions with trained ML models"""

    def __init__(self, db: Session):
        self.db = db
        self.models_dir = Path("/app/ml-models")
        self.loaded_model = None
        self.model_type = None
        self.model_metadata = None

    def load_latest_model(self, model_type: str = "preference_predictor") -> bool:
        """
        Load the most recent successfully trained model of the specified type

        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            # Query database for most recent successful training
            stmt = (
                select(MLTrainingHistory)
                .where(MLTrainingHistory.model_type == model_type)
                .where(MLTrainingHistory.status == 'completed')
                .order_by(desc(MLTrainingHistory.training_completed_at))
                .limit(1)
            )

            history = self.db.execute(stmt).scalars().first()

            if not history or not history.model_path:
                return False

            model_path = Path(history.model_path)

            if not model_path.exists():
                return False

            # Load the pickled model
            with open(model_path, 'rb') as f:
                self.loaded_model = pickle.load(f)

            self.model_type = model_type
            self.model_metadata = {
                'trained_at': history.training_completed_at,
                'num_samples': history.num_samples,
                'metrics': history.metrics or {}
            }

            return True

        except Exception as e:
            print(f"Error loading model: {e}")
            return False

    def _get_time_category(self, shift_time: time) -> str:
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

    def _get_employee_identifier(self, employee: Employee) -> str:
        """Get consistent employee identifier matching training data"""
        if employee.email:
            return employee.email.lower()
        return f"{employee.first_name.lower()}_{employee.last_name.lower()}".replace(' ', '_')

    def predict_employee_shift_preference(
        self,
        employee: Employee,
        shift_template: ShiftTemplate,
        shift_date: date,
        department_id: str
    ) -> EmployeeShiftScore:
        """
        Predict how well an employee would prefer a specific shift

        Args:
            employee: Employee to score
            shift_template: Shift template (defines time, duration, etc.)
            shift_date: Date of the shift
            department_id: Department ID for this shift

        Returns:
            EmployeeShiftScore with preference score and confidence
        """
        score = EmployeeShiftScore()
        score.employee_id = str(employee.id)
        score.shift_template_id = str(shift_template.id)
        score.shift_date = shift_date

        # If no model loaded, return neutral score
        if not self.loaded_model:
            score.preference_score = 0.5
            score.confidence = 0.0
            score.factors['no_model'] = 0.5
            return score

        try:
            employee_key = self._get_employee_identifier(employee)
            employee_stats = self.loaded_model.get('employee_stats', {}).get(employee_key)

            # If employee not in training data, use baseline
            if not employee_stats:
                score.preference_score = 0.5
                score.confidence = 0.1
                score.factors['new_employee'] = 0.5
                return score

            # Extract shift characteristics
            day_of_week = shift_date.weekday()
            is_weekend = day_of_week >= 5
            time_category = self._get_time_category(shift_template.start_time)

            # Calculate preference factors
            factors = {}

            # 1. Day of week preference (0-1)
            total_shifts = employee_stats['total_shifts']
            if total_shifts > 0:
                day_frequency = employee_stats['shifts_by_day'].get(day_of_week, 0) / total_shifts
                factors['day_preference'] = day_frequency
            else:
                factors['day_preference'] = 0.14  # Uniform (1/7)

            # 2. Time of day preference (0-1)
            if total_shifts > 0:
                time_frequency = employee_stats['shifts_by_time'].get(time_category, 0) / total_shifts
                factors['time_preference'] = time_frequency
            else:
                factors['time_preference'] = 0.25  # Uniform (1/4)

            # 3. Department preference (0-1)
            # Get department name by ID from shift template's department
            dept_frequency = 0.0
            if total_shifts > 0:
                # Note: In training, we used department names. Here we need to match.
                # For now, use a simplified approach
                preferred_depts = employee_stats.get('preferred_departments', {})
                if preferred_depts:
                    # Take the max frequency as a proxy (would need proper dept name mapping in production)
                    dept_frequency = max(preferred_depts.values()) / total_shifts if preferred_depts else 0.0
            factors['department_preference'] = dept_frequency

            # 4. Weekend preference (0-1)
            if is_weekend:
                weekend_shifts = sum(
                    employee_stats['shifts_by_day'].get(d, 0)
                    for d in [5, 6]  # Saturday, Sunday
                )
                if total_shifts > 0:
                    factors['weekend_preference'] = weekend_shifts / total_shifts
                else:
                    factors['weekend_preference'] = 0.28  # 2/7 baseline
            else:
                factors['weekend_preference'] = 1.0  # No penalty for weekdays

            # 5. Hours compatibility
            target_hours = float(employee.max_hours_per_week)
            avg_hours = float(employee_stats['total_hours'] / employee_stats['total_shifts'])
            shift_hours = float(shift_template.duration_hours)

            # Check if shift duration is compatible with employee's typical hours
            hours_ratio = min(shift_hours / avg_hours, avg_hours / shift_hours) if avg_hours > 0 else 1.0
            factors['hours_compatibility'] = hours_ratio

            # Combine factors with weights
            weights = {
                'day_preference': 0.30,
                'time_preference': 0.30,
                'department_preference': 0.15,
                'weekend_preference': 0.15,
                'hours_compatibility': 0.10,
            }

            final_score = sum(factors[k] * weights[k] for k in weights.keys())

            # Normalize to 0-1 range
            final_score = max(0.0, min(1.0, final_score))

            # Calculate confidence based on number of historical shifts
            confidence = min(1.0, total_shifts / 50.0)  # Full confidence at 50+ shifts

            score.preference_score = final_score
            score.confidence = confidence
            score.factors = factors

        except Exception as e:
            # On error, return neutral score
            score.preference_score = 0.5
            score.confidence = 0.0
            score.factors['error'] = 0.5

        return score

    def score_employee_shift_assignments(
        self,
        employees: List[Employee],
        shift_template: ShiftTemplate,
        shift_date: date,
        department_id: str
    ) -> List[EmployeeShiftScore]:
        """
        Score all employees for a specific shift

        Returns list of scores sorted by preference (highest first)
        """
        scores = []

        for employee in employees:
            score = self.predict_employee_shift_preference(
                employee, shift_template, shift_date, department_id
            )
            scores.append(score)

        # Sort by preference score (highest first)
        scores.sort(key=lambda s: s.preference_score, reverse=True)

        return scores

    def get_model_info(self) -> Optional[Dict]:
        """Get information about the currently loaded model"""
        if not self.loaded_model:
            return None

        return {
            'model_type': self.model_type,
            'is_loaded': True,
            'metadata': self.model_metadata,
            'num_employees_in_training': len(self.loaded_model.get('employee_stats', {})),
        }

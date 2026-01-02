"""
Schedule Generation Service

Generates optimized schedules using ML predictions and constraint satisfaction.
Implements a greedy algorithm with ML-based employee preference scoring.
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple, Set
from collections import defaultdict
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.models.schedule import Schedule
from app.models.assignment import Assignment
from app.models.employee import Employee
from app.models.shift_template import ShiftTemplate
from app.models.preference import EmployeePreference
from app.models.time_off import TimeOffRequest
from app.models.department import Department
from app.services.ml_inference_service import MLInferenceService, EmployeeShiftScore


class ScheduleGenerationResult:
    """Result from schedule generation"""
    def __init__(self):
        self.success: bool = False
        self.schedule_id: Optional[str] = None
        self.num_assignments: int = 0
        self.num_unassigned_shifts: int = 0
        self.optimizer_score: float = 0.0
        self.generation_duration_seconds: int = 0
        self.ml_assisted: bool = False
        self.warnings: List[str] = []
        self.errors: List[str] = []


class ScheduleGenerationService:
    """Service for generating optimized schedules"""

    def __init__(self, db: Session):
        self.db = db
        self.ml_service = MLInferenceService(db)

    def _get_dates_in_range(self, start_date: date, end_date: date) -> List[date]:
        """Generate list of dates in range"""
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)
        return dates

    def _get_shift_templates_for_day(self, day_of_week: int, department_ids: Optional[List[str]] = None) -> List[ShiftTemplate]:
        """Get active shift templates for a specific day of week"""
        stmt = (
            select(ShiftTemplate)
            .where(ShiftTemplate.is_active == True)
            .where(ShiftTemplate.day_of_week == day_of_week)
        )

        if department_ids:
            stmt = stmt.where(ShiftTemplate.department_id.in_(department_ids))

        result = self.db.execute(stmt)
        return list(result.scalars().all())

    def _get_available_employees(
        self,
        shift_date: date,
        department_ids: Optional[List[str]] = None
    ) -> List[Employee]:
        """
        Get employees available for scheduling on a specific date

        Filters out:
        - Inactive employees
        - Employees with time-off requests for this date
        """
        # Get active employees
        stmt = select(Employee).where(Employee.is_active == True)

        if department_ids:
            stmt = stmt.where(Employee.department_id.in_(department_ids))

        employees = list(self.db.execute(stmt).scalars().all())

        # Filter out employees with time-off on this date
        stmt = (
            select(TimeOffRequest.employee_id)
            .where(TimeOffRequest.start_date <= shift_date)
            .where(TimeOffRequest.end_date >= shift_date)
        )
        time_off_employee_ids = {str(row[0]) for row in self.db.execute(stmt).all()}

        available = [
            emp for emp in employees
            if str(emp.id) not in time_off_employee_ids
        ]

        return available

    def _get_employee_preferences(self, employee_id: str) -> Dict:
        """Get employee's active preferences"""
        stmt = (
            select(EmployeePreference)
            .where(EmployeePreference.employee_id == employee_id)
            .where(EmployeePreference.is_active == True)
        )

        preferences = self.db.execute(stmt).scalars().all()

        result = {
            'preferred_shifts': [],
            'avoid_shifts': [],
            'preferred_days': [],
            'avoid_days': [],
        }

        for pref in preferences:
            if pref.preference_type == 'preferred_shift' and pref.shift_template_id:
                result['preferred_shifts'].append(str(pref.shift_template_id))
            elif pref.preference_type == 'avoid_shift' and pref.shift_template_id:
                result['avoid_shifts'].append(str(pref.shift_template_id))
            elif pref.preference_type == 'preferred_days' and pref.day_of_week is not None:
                result['preferred_days'].append(pref.day_of_week)
            elif pref.preference_type == 'avoid_days' and pref.day_of_week is not None:
                result['avoid_days'].append(pref.day_of_week)

        return result

    def _check_employee_constraints(
        self,
        employee: Employee,
        shift_template: ShiftTemplate,
        shift_date: date,
        employee_hours: Dict[str, Decimal],
        employee_shifts: Dict[str, List[date]]
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if assigning this shift to employee violates constraints

        Returns:
            (is_valid, reason_if_invalid)
        """
        employee_id = str(employee.id)

        # Check weekly hours limit
        week_start = shift_date - timedelta(days=shift_date.weekday())
        week_hours = employee_hours.get(f"{employee_id}_{week_start}", Decimal('0'))

        if week_hours + shift_template.duration_hours > employee.max_hours_per_week:
            return False, "Would exceed max weekly hours"

        # Check if already assigned a shift on this date
        shifts_on_date = employee_shifts.get(employee_id, [])
        if shift_date in shifts_on_date:
            return False, "Already has a shift on this date"

        # Check preferences for hard constraints
        preferences = self._get_employee_preferences(employee_id)

        # Check avoid_shifts (hard constraint)
        if str(shift_template.id) in preferences['avoid_shifts']:
            return False, "Employee marked shift as 'avoid'"

        # Check avoid_days (hard constraint)
        if shift_date.weekday() in preferences['avoid_days']:
            return False, "Employee marked day as 'avoid'"

        return True, None

    def _score_assignment_with_preferences(
        self,
        ml_score: EmployeeShiftScore,
        employee: Employee,
        shift_template: ShiftTemplate,
        shift_date: date
    ) -> float:
        """
        Combine ML score with explicit employee preferences

        Returns score from 0-1 (higher is better)
        """
        base_score = ml_score.preference_score

        # Get preferences
        preferences = self._get_employee_preferences(str(employee.id))

        # Boost score for preferred shifts
        if str(shift_template.id) in preferences['preferred_shifts']:
            base_score = min(1.0, base_score + 0.3)

        # Boost score for preferred days
        if shift_date.weekday() in preferences['preferred_days']:
            base_score = min(1.0, base_score + 0.2)

        return base_score

    def generate_schedule(
        self,
        name: str,
        start_date: date,
        end_date: date,
        department_ids: Optional[List[str]] = None,
        use_ml: bool = True,
        notes: Optional[str] = None
    ) -> ScheduleGenerationResult:
        """
        Generate an optimized schedule for the given date range

        Args:
            name: Schedule name
            start_date: Start date of schedule period
            end_date: End date of schedule period
            department_ids: Optional list of department IDs to schedule
            use_ml: Whether to use ML predictions for optimization
            notes: Optional notes for the schedule

        Returns:
            ScheduleGenerationResult with success status and details
        """
        result = ScheduleGenerationResult()
        generation_start = datetime.now()

        try:
            # Load ML model if requested
            if use_ml:
                ml_loaded = self.ml_service.load_latest_model("preference_predictor")
                if ml_loaded:
                    result.ml_assisted = True
                else:
                    result.warnings.append("ML model not found, using baseline scoring")

            # Create schedule record
            schedule = Schedule(
                name=name,
                start_date=start_date,
                end_date=end_date,
                status='generating',
                generation_started_at=generation_start,
                ml_assisted=result.ml_assisted,
                notes=notes
            )
            self.db.add(schedule)
            self.db.flush()  # Get schedule ID

            # Track employee hours and shifts
            employee_hours: Dict[str, Decimal] = defaultdict(lambda: Decimal('0'))
            employee_shifts: Dict[str, List[date]] = defaultdict(list)

            assignments_created = 0
            unassigned_shifts = 0

            # Generate assignments for each date
            dates = self._get_dates_in_range(start_date, end_date)

            for shift_date in dates:
                day_of_week = shift_date.weekday()

                # Get shift templates for this day
                shift_templates = self._get_shift_templates_for_day(day_of_week, department_ids)

                # Get available employees for this date
                available_employees = self._get_available_employees(shift_date, department_ids)

                if not available_employees:
                    result.warnings.append(f"No available employees for {shift_date}")
                    unassigned_shifts += len(shift_templates)
                    continue

                # Process each shift template
                for shift_template in shift_templates:
                    required_employees = shift_template.required_employees or 1

                    # Score all available employees for this shift
                    if use_ml and result.ml_assisted:
                        ml_scores = self.ml_service.score_employee_shift_assignments(
                            available_employees,
                            shift_template,
                            shift_date,
                            str(shift_template.department_id)
                        )

                        # Combine ML scores with preferences
                        scored_employees = []
                        for ml_score in ml_scores:
                            employee = next(
                                (e for e in available_employees if str(e.id) == ml_score.employee_id),
                                None
                            )
                            if employee:
                                final_score = self._score_assignment_with_preferences(
                                    ml_score, employee, shift_template, shift_date
                                )
                                scored_employees.append((employee, final_score))

                        scored_employees.sort(key=lambda x: x[1], reverse=True)
                    else:
                        # No ML - use simple random order
                        scored_employees = [(emp, 0.5) for emp in available_employees]

                    # Assign best employees who meet constraints
                    assigned_count = 0
                    for employee, score in scored_employees:
                        if assigned_count >= required_employees:
                            break

                        # Check constraints
                        is_valid, reason = self._check_employee_constraints(
                            employee,
                            shift_template,
                            shift_date,
                            employee_hours,
                            employee_shifts
                        )

                        if not is_valid:
                            continue

                        # Create assignment
                        assignment = Assignment(
                            schedule_id=schedule.id,
                            employee_id=employee.id,
                            shift_template_id=shift_template.id,
                            shift_date=shift_date,
                            start_time=shift_template.start_time,
                            end_time=shift_template.end_time,
                            hours=shift_template.duration_hours,
                            is_confirmed=False
                        )
                        self.db.add(assignment)

                        # Update tracking
                        week_start = shift_date - timedelta(days=shift_date.weekday())
                        week_key = f"{employee.id}_{week_start}"
                        employee_hours[week_key] += shift_template.duration_hours
                        employee_shifts[str(employee.id)].append(shift_date)

                        assigned_count += 1
                        assignments_created += 1

                    # Track unassigned shifts
                    if assigned_count < required_employees:
                        unassigned_shifts += (required_employees - assigned_count)
                        result.warnings.append(
                            f"Could only assign {assigned_count}/{required_employees} employees "
                            f"for {shift_template.name} on {shift_date}"
                        )

            # Calculate optimizer score (simple: ratio of assigned vs total needed)
            total_shifts_needed = sum(
                (st.required_employees or 1) * len(dates)
                for d in dates
                for st in self._get_shift_templates_for_day(d.weekday(), department_ids)
            )

            if total_shifts_needed > 0:
                optimizer_score = assignments_created / total_shifts_needed
            else:
                optimizer_score = 1.0

            # Update schedule record
            schedule.status = 'generated'
            schedule.generation_completed_at = datetime.now()
            schedule.generation_duration_seconds = int((datetime.now() - generation_start).total_seconds())
            schedule.optimizer_score = Decimal(str(round(optimizer_score, 4)))

            # Commit all changes
            self.db.commit()

            # Set result
            result.success = True
            result.schedule_id = str(schedule.id)
            result.num_assignments = assignments_created
            result.num_unassigned_shifts = unassigned_shifts
            result.optimizer_score = optimizer_score
            result.generation_duration_seconds = schedule.generation_duration_seconds

        except Exception as e:
            self.db.rollback()
            result.success = False
            result.errors.append(f"Schedule generation failed: {str(e)}")

        return result

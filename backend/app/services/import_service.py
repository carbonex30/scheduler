"""
CSV Import Service for historical schedule data

Expected CSV format:
Location, Area, Team Member, Start Date, Start Time, End Date, End Time,
Total Meal Break, Total Rest Break, Total Time, Status, Note, Cost, Email
"""

import csv
import io
from datetime import datetime, time, date
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.department import Department
from app.models.employee import Employee
from app.models.shift_template import ShiftTemplate
from app.models.schedule import Schedule
from app.models.assignment import Assignment


class ImportResult:
    """Results from CSV import"""
    def __init__(self):
        self.departments_created = 0
        self.employees_created = 0
        self.shift_templates_created = 0
        self.assignments_created = 0
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.unallocated_shifts = 0


class CSVImportService:
    """Service for importing historical schedule data from CSV"""

    UNALLOCATED_MARKER = "**UNALLOCATED**"

    def __init__(self, db: Session):
        self.db = db
        self.result = ImportResult()
        self.department_map: Dict[str, str] = {}  # name -> id
        self.employee_map: Dict[str, str] = {}  # email -> id
        self.shift_template_map: Dict[Tuple, str] = {}  # (dept_id, day, start, end) -> id

    def parse_time(self, time_str: str) -> Optional[time]:
        """Parse time from '07:30 AM' or 'HH:MM:SS' format"""
        if not time_str or time_str.strip() == '':
            return None

        time_str = time_str.strip()

        # Try 12-hour format first (e.g., "07:30 AM")
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

        # Try decimal format first
        try:
            return Decimal(duration_str)
        except:
            pass

        # Try H:MM format
        if ':' in duration_str:
            try:
                parts = duration_str.split(':')
                hours = int(parts[0])
                minutes = int(parts[1]) if len(parts) > 1 else 0
                return Decimal(hours) + Decimal(minutes) / Decimal(60)
            except:
                pass

        return None

    def calculate_duration(self, start_time: time, end_time: time) -> Decimal:
        """Calculate duration between two times in hours"""
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute

        # Handle overnight shifts
        if end_minutes < start_minutes:
            end_minutes += 24 * 60

        duration_minutes = end_minutes - start_minutes
        return Decimal(duration_minutes) / Decimal(60)

    def get_or_create_department(self, name: str, description: str = "") -> str:
        """Get existing department or create new one"""
        if name in self.department_map:
            return self.department_map[name]

        # Check if exists
        dept = self.db.execute(
            select(Department).where(Department.name == name)
        ).scalar_one_or_none()

        if dept:
            self.department_map[name] = str(dept.id)
            return str(dept.id)

        # Create new
        dept = Department(
            name=name,
            description=description,
            is_active=True
        )
        self.db.add(dept)
        self.db.flush()

        self.department_map[name] = str(dept.id)
        self.result.departments_created += 1
        return str(dept.id)

    def get_or_create_employee(
        self,
        first_name: str,
        last_name: str,
        email: str,
        department_id: str
    ) -> str:
        """Get existing employee or create new one"""
        if email in self.employee_map:
            return self.employee_map[email]

        # Check if exists
        emp = self.db.execute(
            select(Employee).where(Employee.email == email)
        ).scalar_one_or_none()

        if emp:
            self.employee_map[email] = str(emp.id)
            return str(emp.id)

        # Create new
        emp = Employee(
            first_name=first_name,
            last_name=last_name,
            email=email,
            department_id=department_id,
            employment_type='full_time',
            hire_date=date.today(),
            max_hours_per_week=Decimal('40.0'),
            min_hours_per_week=Decimal('0.0'),
            is_active=True
        )
        self.db.add(emp)
        self.db.flush()

        self.employee_map[email] = str(emp.id)
        self.result.employees_created += 1
        return str(emp.id)

    def get_or_create_shift_template(
        self,
        name: str,
        department_id: str,
        day_of_week: int,
        start_time: time,
        end_time: time,
        duration_hours: Decimal
    ) -> str:
        """Get existing shift template or create new one"""
        key = (department_id, day_of_week, start_time, end_time)

        if key in self.shift_template_map:
            return self.shift_template_map[key]

        # Check if exists
        shift = self.db.execute(
            select(ShiftTemplate).where(
                ShiftTemplate.department_id == department_id,
                ShiftTemplate.day_of_week == day_of_week,
                ShiftTemplate.start_time == start_time,
                ShiftTemplate.end_time == end_time
            )
        ).scalar_one_or_none()

        if shift:
            self.shift_template_map[key] = str(shift.id)
            return str(shift.id)

        # Create new
        shift = ShiftTemplate(
            name=name,
            department_id=department_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            duration_hours=duration_hours,
            required_employees=1,
            is_active=True
        )
        self.db.add(shift)
        self.db.flush()

        self.shift_template_map[key] = str(shift.id)
        self.result.shift_templates_created += 1
        return str(shift.id)

    def import_csv(
        self,
        csv_content: str,
        schedule_name: str = "Imported Schedule"
    ) -> ImportResult:
        """Import schedule data from CSV content"""
        try:
            # Parse CSV
            reader = csv.DictReader(io.StringIO(csv_content))

            # Create schedule
            schedule = Schedule(
                name=schedule_name,
                start_date=date.today(),
                end_date=date.today(),
                status='draft'
            )
            self.db.add(schedule)
            self.db.flush()

            row_num = 1
            for row in reader:
                row_num += 1
                try:
                    self.process_row(row, str(schedule.id))
                except Exception as e:
                    self.result.errors.append(f"Row {row_num}: {str(e)}")

            # Commit all changes
            self.db.commit()

            # Update schedule dates based on assignments
            self.update_schedule_dates(str(schedule.id))

        except Exception as e:
            self.db.rollback()
            self.result.errors.append(f"Import failed: {str(e)}")

        return self.result

    def process_row(self, row: Dict[str, str], schedule_id: str):
        """Process a single CSV row"""
        # Extract data
        area = row.get('Area', '').strip()
        team_member = row.get('Team Member', '').strip()
        start_date_str = row.get('Start Date', '').strip()
        start_time_str = row.get('Start Time', '').strip()
        end_time_str = row.get('End Time', '').strip()
        email = row.get('Email', '').strip()
        total_time_str = row.get('Total Time', '').strip()

        # Skip if missing critical data
        if not area or not start_date_str or not start_time_str:
            return

        # Handle unallocated shifts
        if team_member == self.UNALLOCATED_MARKER or not team_member:
            self.result.unallocated_shifts += 1
            return

        # Parse times and dates
        shift_date = self.parse_date(start_date_str)
        start_time = self.parse_time(start_time_str)
        end_time = self.parse_time(end_time_str)

        if not shift_date or not start_time or not end_time:
            raise ValueError("Invalid date or time format")

        # Calculate duration
        duration = self.parse_duration(total_time_str)
        if not duration:
            duration = self.calculate_duration(start_time, end_time)

        # Flag long shifts as warnings
        if duration > Decimal('12.0'):
            self.result.warnings.append(
                f"{team_member} on {shift_date}: {duration}hr shift (exceeds 12 hours)"
            )

        # Get or create department
        department_id = self.get_or_create_department(area)

        # Parse employee name
        name_parts = team_member.split()
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Get or create employee
        if not email:
            email = f"{first_name.lower()}.{last_name.lower()}@imported.local"

        employee_id = self.get_or_create_employee(
            first_name, last_name, email, department_id
        )

        # Get or create shift template
        day_of_week = shift_date.weekday()
        shift_name = f"{area} {start_time.strftime('%H:%M')}-{end_time.strftime('%H:%M')}"

        shift_template_id = self.get_or_create_shift_template(
            shift_name,
            department_id,
            day_of_week,
            start_time,
            end_time,
            duration
        )

        # Create assignment
        assignment = Assignment(
            schedule_id=schedule_id,
            employee_id=employee_id,
            shift_template_id=shift_template_id,
            shift_date=shift_date,
            start_time=start_time,
            end_time=end_time,
            hours=duration,
            is_confirmed=True
        )
        self.db.add(assignment)
        self.result.assignments_created += 1

    def update_schedule_dates(self, schedule_id: str):
        """Update schedule start/end dates based on assignments"""
        assignments = self.db.execute(
            select(Assignment).where(Assignment.schedule_id == schedule_id)
        ).scalars().all()

        if assignments:
            dates = [a.shift_date for a in assignments]
            schedule = self.db.execute(
                select(Schedule).where(Schedule.id == schedule_id)
            ).scalar_one()

            schedule.start_date = min(dates)
            schedule.end_date = max(dates)
            self.db.commit()


def import_schedule_csv(db: Session, csv_content: str, schedule_name: str) -> ImportResult:
    """Helper function to import CSV"""
    service = CSVImportService(db)
    return service.import_csv(csv_content, schedule_name)

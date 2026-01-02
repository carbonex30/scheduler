"""
Employee CRUD API endpoints
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.employee import Employee
from app.models.department import Department
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
)

router = APIRouter()


@router.get("/", response_model=EmployeeListResponse)
async def list_employees(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    department_id: Optional[UUID] = Query(None, description="Filter by department ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
):
    """
    List all employees with pagination and filtering
    """
    query = select(Employee)

    # Apply filters
    if department_id is not None:
        query = query.where(Employee.department_id == department_id)

    if is_active is not None:
        query = query.where(Employee.is_active == is_active)

    if employment_type is not None:
        query = query.where(Employee.employment_type == employment_type)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Employee.first_name.ilike(search_pattern)) |
            (Employee.last_name.ilike(search_pattern)) |
            (Employee.email.ilike(search_pattern))
        )

    query = query.order_by(Employee.last_name, Employee.first_name)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit)
    employees = db.execute(query).scalars().all()

    return EmployeeListResponse(total=total, items=employees)


@router.post("/", response_model=EmployeeResponse, status_code=201)
async def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new employee
    """
    # Validate department exists
    department = db.execute(
        select(Department).where(Department.id == employee.department_id)
    ).scalar_one_or_none()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check if employee with same email already exists
    existing = db.execute(
        select(Employee).where(Employee.email == employee.email)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Employee with email '{employee.email}' already exists"
        )

    # Validate employment type
    valid_types = ["full_time", "part_time", "contractor"]
    if employee.employment_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid employment_type. Must be one of: {', '.join(valid_types)}"
        )

    # Validate min <= max hours
    if employee.min_hours_per_week > employee.max_hours_per_week:
        raise HTTPException(
            status_code=400,
            detail="min_hours_per_week cannot be greater than max_hours_per_week"
        )

    db_employee = Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)

    return db_employee


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get an employee by ID
    """
    employee = db.execute(
        select(Employee).where(Employee.id == employee_id)
    ).scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return employee


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    """
    Update an employee
    """
    db_employee = db.execute(
        select(Employee).where(Employee.id == employee_id)
    ).scalar_one_or_none()

    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate department if being changed
    if employee_update.department_id:
        department = db.execute(
            select(Department).where(Department.id == employee_update.department_id)
        ).scalar_one_or_none()

        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    # Check if email is being changed and if new email already exists
    if employee_update.email and employee_update.email != db_employee.email:
        existing = db.execute(
            select(Employee).where(Employee.email == employee_update.email)
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Employee with email '{employee_update.email}' already exists"
            )

    # Validate employment type if being changed
    if employee_update.employment_type:
        valid_types = ["full_time", "part_time", "contractor"]
        if employee_update.employment_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid employment_type. Must be one of: {', '.join(valid_types)}"
            )

    # Update only provided fields
    update_data = employee_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_employee, field, value)

    # Validate min <= max hours after update
    if db_employee.min_hours_per_week > db_employee.max_hours_per_week:
        raise HTTPException(
            status_code=400,
            detail="min_hours_per_week cannot be greater than max_hours_per_week"
        )

    db.commit()
    db.refresh(db_employee)

    return db_employee


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete an employee

    Note: This will fail if the employee has assignments or preferences.
    Consider soft-deleting by setting is_active=False instead.
    """
    db_employee = db.execute(
        select(Employee).where(Employee.id == employee_id)
    ).scalar_one_or_none()

    if not db_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if employee has assignments
    from app.models.assignment import Assignment
    assignment_count = db.execute(
        select(func.count()).select_from(Assignment).where(Assignment.employee_id == employee_id)
    ).scalar()

    if assignment_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete employee with {assignment_count} assignments. Set is_active=False instead."
        )

    db.delete(db_employee)
    db.commit()

    return None

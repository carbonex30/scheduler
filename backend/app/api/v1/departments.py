"""
Department CRUD API endpoints
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.department import Department
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentListResponse,
)

router = APIRouter()


@router.get("/", response_model=DepartmentListResponse)
async def list_departments(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    """
    List all departments with pagination and filtering
    """
    query = select(Department)

    if is_active is not None:
        query = query.where(Department.is_active == is_active)

    query = query.order_by(Department.name)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()

    # Get paginated results
    query = query.offset(skip).limit(limit)
    departments = db.execute(query).scalars().all()

    return DepartmentListResponse(total=total, items=departments)


@router.post("/", response_model=DepartmentResponse, status_code=201)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new department
    """
    # Check if department with same name already exists
    existing = db.execute(
        select(Department).where(Department.name == department.name)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Department with name '{department.name}' already exists"
        )

    db_department = Department(**department.model_dump())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)

    return db_department


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get a department by ID
    """
    department = db.execute(
        select(Department).where(Department.id == department_id)
    ).scalar_one_or_none()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    return department


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: UUID,
    department_update: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a department
    """
    db_department = db.execute(
        select(Department).where(Department.id == department_id)
    ).scalar_one_or_none()

    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check if name is being changed and if new name already exists
    if department_update.name and department_update.name != db_department.name:
        existing = db.execute(
            select(Department).where(Department.name == department_update.name)
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Department with name '{department_update.name}' already exists"
            )

    # Update only provided fields
    update_data = department_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_department, field, value)

    db.commit()
    db.refresh(db_department)

    return db_department


@router.delete("/{department_id}", status_code=204)
async def delete_department(
    department_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Delete a department

    Note: This will fail if the department has employees assigned to it.
    Consider soft-deleting by setting is_active=False instead.
    """
    db_department = db.execute(
        select(Department).where(Department.id == department_id)
    ).scalar_one_or_none()

    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check if department has employees
    from app.models.employee import Employee
    employee_count = db.execute(
        select(func.count()).select_from(Employee).where(Employee.department_id == department_id)
    ).scalar()

    if employee_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department with {employee_count} employees. Set is_active=False instead."
        )

    db.delete(db_department)
    db.commit()

    return None


@router.get("/{department_id}/employees", response_model=list)
async def list_department_employees(
    department_id: UUID,
    db: Session = Depends(get_db),
):
    """
    List all employees in a department
    """
    department = db.execute(
        select(Department).where(Department.id == department_id)
    ).scalar_one_or_none()

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    from app.models.employee import Employee
    from app.schemas.employee import EmployeeResponse

    employees = db.execute(
        select(Employee)
        .where(Employee.department_id == department_id)
        .order_by(Employee.last_name, Employee.first_name)
    ).scalars().all()

    return [EmployeeResponse.model_validate(emp) for emp in employees]

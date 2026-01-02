"""
Import/Export API endpoints
"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.services.import_service import import_schedule_csv, ImportResult


router = APIRouter()


class ImportResultResponse(BaseModel):
    """Response model for import results"""
    departments_created: int
    employees_created: int
    shift_templates_created: int
    assignments_created: int
    unallocated_shifts: int
    errors: list[str]
    warnings: list[str]
    success: bool


@router.post("/import/csv", response_model=ImportResultResponse)
async def import_csv(
    file: UploadFile = File(...),
    schedule_name: str = Form("Imported Schedule"),
    db: Session = Depends(get_db),
):
    """
    Import schedule data from CSV file

    Expected CSV format:
    Location, Area, Team Member, Start Date, Start Time, End Date, End Time,
    Total Meal Break, Total Rest Break, Total Time, Status, Note, Cost, Email
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')

        # Normalize line endings (handle CR, LF, CRLF)
        csv_content = csv_content.replace('\r\n', '\n').replace('\r', '\n')

        # Import CSV
        result = import_schedule_csv(db, csv_content, schedule_name)

        return ImportResultResponse(
            departments_created=result.departments_created,
            employees_created=result.employees_created,
            shift_templates_created=result.shift_templates_created,
            assignments_created=result.assignments_created,
            unallocated_shifts=result.unallocated_shifts,
            errors=result.errors,
            warnings=result.warnings,
            success=len(result.errors) == 0
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

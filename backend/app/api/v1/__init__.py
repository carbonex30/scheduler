"""
API v1 module
"""

from fastapi import APIRouter
from .departments import router as departments_router
from .employees import router as employees_router
from .shift_templates import router as shift_templates_router
from .import_export import router as import_export_router
from .ml_training import router as ml_training_router
from .schedules import router as schedules_router

api_router = APIRouter()

api_router.include_router(departments_router, prefix="/departments", tags=["departments"])
api_router.include_router(employees_router, prefix="/employees", tags=["employees"])
api_router.include_router(shift_templates_router, prefix="/shift-templates", tags=["shift-templates"])
api_router.include_router(import_export_router, tags=["import-export"])
api_router.include_router(ml_training_router, prefix="/ml", tags=["ml-training"])
api_router.include_router(schedules_router, prefix="/schedules", tags=["schedules"])

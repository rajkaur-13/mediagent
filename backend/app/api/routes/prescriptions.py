from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ...db.database import get_db
from ...models.prescription import Prescription
from ...models.patient import Patient
from ...api.dependencies.auth import get_current_user
from ...tools.prescription_tools import generate_prescription, get_prescriptions
import uuid

router = APIRouter()

class PrescriptionCreate(BaseModel):
    patient_id: str
    medication: str
    dosage: str
    frequency: str
    duration: str
    instructions: str

@router.post("/")
async def create_prescription(
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new prescription"""
    
    result = generate_prescription(
        patient_id=data.patient_id,
        doctor_id=str(current_user["id"]),
        medication=data.medication,
        dosage=data.dosage,
        frequency=data.frequency,
        duration=data.duration,
        instructions=data.instructions,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/{patient_id}")
async def get_patient_prescriptions(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all prescriptions for a patient"""
    return get_prescriptions(patient_id, db)

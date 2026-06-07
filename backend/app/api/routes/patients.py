from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...db.database import get_db
from ...models.patient import Patient
from ...api.dependencies.auth import get_current_user

router = APIRouter()

@router.get("/")
async def get_all_patients(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all patients"""
    patients = db.query(Patient).limit(100).all()
    return {
        "patients": [
            {
                "id": str(p.id),
                "name": p.name,
                "mrn": p.mrn,
                "age": p.age,
                "gender": p.gender
            } for p in patients
        ]
    }

@router.get("/search")
async def search_patients(
    q: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Search patients by name"""
    patients = db.query(Patient).filter(Patient.name.ilike(f"%{q}%")).limit(20).all()
    return {
        "patients": [
            {
                "id": str(p.id),
                "name": p.name,
                "mrn": p.mrn,
                "age": p.age
            } for p in patients
        ]
    }

@router.get("/{patient_id}")
async def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get patient by ID"""
    from uuid import UUID
    try:
        patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return {
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "email": patient.email,
            "allergies": patient.allergies,
            "conditions": patient.conditions,
            "medications": patient.medications
        }
    except:
        raise HTTPException(status_code=404, detail="Patient not found")

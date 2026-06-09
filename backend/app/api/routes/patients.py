from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
from ...db.database import get_db
from ...models.patient import Patient
from ...api.dependencies.auth import get_current_user

router = APIRouter()

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []

@router.post("/", response_model=dict)
async def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    existing = db.query(Patient).filter(Patient.name.ilike(patient.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this name already exists")
    
    all_patients = db.query(Patient).all()
    max_mrn_num = 0
    for p in all_patients:
        if p.mrn and p.mrn.startswith("MRN"):
            try:
                num = int(p.mrn[3:])
                if num > max_mrn_num:
                    max_mrn_num = num
            except:
                pass
    
    new_mrn_num = max_mrn_num + 1
    new_mrn = f"MRN{new_mrn_num:03d}"
    
    new_patient = Patient(
        id=uuid.uuid4(),
        mrn=new_mrn,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        email=patient.email,
        conditions=patient.conditions or [],
        allergies=patient.allergies or [],
        analysis_history=[]
    )
    
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    return {
        "message": "Patient added successfully",
        "patient": {
            "id": str(new_patient.id),
            "name": new_patient.name,
            "mrn": new_patient.mrn,
            "age": new_patient.age,
            "gender": new_patient.gender
        }
    }

@router.get("/", response_model=dict)
async def get_all_patients(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
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
        ],
        "count": len(patients)
    }

@router.get("/search")
async def search_patients(
    q: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
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
    from uuid import UUID
    try:
        patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Format analysis history for display
        analyses = []
        if patient.analysis_history:
            for a in patient.analysis_history:
                analyses.append({
                    "image_type": a.get("image_type", "Unknown"),
                    "findings": a.get("findings", "No findings"),
                    "confidence": a.get("confidence", 0),
                    "recommendation": a.get("recommendation", ""),
                    "date": a.get("analyzed_at", "")[:10] if a.get("analyzed_at") else "Unknown",
                    "image_url": a.get("image_url")
                })
        
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
            "medications": patient.medications,
            "image_analyses": analyses,
            "total_analyses": len(analyses)
        }
    except:
        raise HTTPException(status_code=404, detail="Patient not found")

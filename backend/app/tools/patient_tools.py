from sqlalchemy.orm import Session
from ..models.patient import Patient
from ..models.user import User

def search_patient(name: str, db: Session, doctor_id: str = None) -> dict:
    """Search for a patient by name (case-insensitive partial match)"""
    patients = db.query(Patient).filter(
        Patient.name.ilike(f"%{name}%")
    ).all()
    
    if not patients:
        return {"found": False, "message": f"No patient found with name '{name}'"}
    
    # Return the first match
    patient = patients[0]
    return {
        "found": True,
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "allergies": patient.allergies or [],
            "conditions": patient.conditions or [],
            "medications": patient.medications or []
        }
    }

def get_all_patients(db: Session, limit: int = 20) -> dict:
    """Get all patients with pagination"""
    patients = db.query(Patient).limit(limit).all()
    
    return {
        "count": len(patients),
        "patients": [
            {
                "id": str(p.id),
                "name": p.name,
                "mrn": p.mrn,
                "age": p.age
            } for p in patients
        ]
    }

def get_patient_by_id(patient_id: str, db: Session) -> dict:
    """Get patient by UUID"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        return {"found": False, "message": "Patient not found"}
    
    return {
        "found": True,
        "patient": {
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "phone": patient.phone,
            "email": patient.email,
            "allergies": patient.allergies or [],
            "conditions": patient.conditions or [],
            "medications": patient.medications or []
        }
    }
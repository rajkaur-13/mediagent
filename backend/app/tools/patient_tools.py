from sqlalchemy.orm import Session
from ..models.patient import Patient
from ..models.user import User

def search_patient(name: str, db: Session, doctor_id: str = None) -> dict:
    """Search for a patient by name"""
    patients = db.query(Patient).filter(
        Patient.name.ilike(f"%{name}%")
    ).all()
    
    if not patients:
        return {"found": False, "message": f"No patient found with name '{name}'"}
    
    patient = patients[0]
    
    # Build analysis summary from saved history
    analysis_summary = ""
    if patient.analysis_history and len(patient.analysis_history) > 0:
        analysis_summary = "\n\n📊 **Image Analysis History:**"
        for a in patient.analysis_history[-3:]:  # Show last 3
            img_type = a.get('image_type', 'Image').replace('_', ' ').title()
            findings = a.get('findings', 'No findings')[:100]
            confidence = a.get('confidence', 0)
            if confidence:
                analysis_summary += f"\n• {img_type}: {findings} (Confidence: {confidence*100:.0f}%)"
            else:
                analysis_summary += f"\n• {img_type}: {findings}"
        
        if len(patient.analysis_history) > 3:
            analysis_summary += f"\n\n📸 Total {len(patient.analysis_history)} images analyzed."
    
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
            "medications": patient.medications or [],
            "analysis_history": patient.analysis_history or [],
            "analysis_summary": analysis_summary
        }
    }

def get_all_patients(db: Session, limit: int = 20) -> dict:
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
    from uuid import UUID
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    
    if not patient:
        return {"found": False, "message": "Patient not found"}
    
    analysis_summary = ""
    if patient.analysis_history and len(patient.analysis_history) > 0:
        analysis_summary = "\n\n📊 **Image Analysis History:**"
        for a in patient.analysis_history[-3:]:
            img_type = a.get('image_type', 'Image').replace('_', ' ').title()
            findings = a.get('findings', 'No findings')[:100]
            confidence = a.get('confidence', 0)
            if confidence:
                analysis_summary += f"\n• {img_type}: {findings} (Confidence: {confidence*100:.0f}%)"
            else:
                analysis_summary += f"\n• {img_type}: {findings}"
    
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
            "medications": patient.medications or [],
            "analysis_history": patient.analysis_history or [],
            "analysis_summary": analysis_summary
        }
    }

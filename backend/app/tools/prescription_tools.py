from sqlalchemy.orm import Session
from ..models.prescription import Prescription
from ..models.patient import Patient
import uuid
from datetime import datetime

def generate_prescription(
    patient_id: str,
    doctor_id: str,
    medication: str,
    dosage: str,
    frequency: str,
    duration: str,
    instructions: str,
    db: Session
) -> dict:
    """Generate a prescription for a patient"""
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        return {"success": False, "message": "No patient selected"}
    
    # Structured prescription data as JSON
    prescription_content = {
        "medication": {
            "name": medication,
            "dosage": dosage,
            "frequency": frequency,
            "duration": duration,
            "quantity": _calculate_quantity(dosage, frequency, duration),
            "refills": 0
        },
        "instructions": instructions,
        "prescribing_doctor": doctor_id,
        "diagnosis": "Based on clinical evaluation",
        "filled": False
    }
    
    prescription = Prescription(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_id=doctor_id,
        content=prescription_content,
        status="active"
    )
    
    db.add(prescription)
    db.commit()
    
    return {
        "success": True,
        "prescription": {
            "id": str(prescription.id),
            "patient_name": patient.name,
            "medication": medication,
            "dosage": dosage,
            "frequency": frequency,
            "duration": duration,
            "instructions": instructions,
            "prescribed_date": prescription.prescribed_date.isoformat()
        }
    }

def _calculate_quantity(dosage: str, frequency: str, duration: str) -> str:
    """Calculate approximate quantity based on dosage and frequency"""
    # Simple calculation for demo
    return "30 tablets"

def get_prescriptions(patient_id: str = None, db: Session = None) -> dict:
    """Retrieve prescriptions for a patient"""
    
    if not patient_id:
        return {"prescriptions": [], "message": "Please specify a patient"}
    
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient_id
    ).order_by(Prescription.prescribed_date.desc()).all()
    
    return {
        "prescriptions": [
            {
                "id": str(p.id),
                "content": p.content,
                "prescribed_date": p.prescribed_date.isoformat(),
                "status": p.status
            } for p in prescriptions
        ],
        "count": len(prescriptions)
    }

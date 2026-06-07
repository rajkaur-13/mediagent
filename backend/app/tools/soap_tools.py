from sqlalchemy.orm import Session
from ..models.soap_note import SOAPNote
from ..models.patient import Patient
import uuid
from datetime import datetime

def generate_soap_note(patient_id: str, doctor_id: str, conversation_history: str, db: Session) -> dict:
    """Generate a SOAP note with JSONB structure"""
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        return {"success": False, "message": "No patient selected"}
    
    # Structured SOAP data as JSON
    soap_content = {
        "subjective": {
            "chief_complaint": conversation_history[:200] if conversation_history else "Not documented",
            "history_of_present_illness": "Based on conversation",
            "review_of_systems": "Not documented",
            "past_medical_history": patient.conditions if patient.conditions else "None"
        },
        "objective": {
            "vitals": {
                "bp": "Not recorded",
                "hr": "Not recorded",
                "temp": "Not recorded",
                "oxygen": "Not recorded"
            },
            "physical_exam": "Not documented",
            "imaging": "None",
            "labs": "None"
        },
        "assessment": {
            "diagnosis": patient.conditions[0] if patient.conditions else "Under evaluation",
            "differential_diagnosis": [],
            "clinical_impression": "Based on patient history"
        },
        "plan": {
            "medications": patient.medications if patient.medications else [],
            "tests_ordered": [],
            "follow_up": "Schedule follow-up in 2 weeks",
            "referrals": [],
            "patient_education": "Provided as needed"
        }
    }
    
    soap = SOAPNote(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_id=doctor_id,
        content=soap_content,
        is_finalized="draft"
    )
    
    db.add(soap)
    db.commit()
    
    return {
        "success": True,
        "soap_note": {
            "id": str(soap.id),
            "patient_name": patient.name,
            "content": soap_content,
            "visit_date": soap.visit_date.isoformat(),
            "status": soap.is_finalized
        }
    }

def get_soap_notes(patient_id: str = None, db: Session = None) -> dict:
    """Retrieve SOAP notes for a patient"""
    
    if not patient_id:
        return {"notes": [], "message": "Please specify a patient"}
    
    notes = db.query(SOAPNote).filter(
        SOAPNote.patient_id == patient_id
    ).order_by(SOAPNote.visit_date.desc()).all()
    
    return {
        "notes": [
            {
                "id": str(n.id),
                "content": n.content,
                "visit_date": n.visit_date.isoformat(),
                "status": n.is_finalized
            } for n in notes
        ],
        "count": len(notes)
    }

def update_soap_note(note_id: str, content: dict, db: Session) -> dict:
    """Update an existing SOAP note"""
    
    note = db.query(SOAPNote).filter(SOAPNote.id == note_id).first()
    if not note:
        return {"success": False, "message": "SOAP note not found"}
    
    note.content = content
    note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "SOAP note updated"}

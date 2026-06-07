from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ...db.database import get_db
from ...models.soap_note import SOAPNote
from ...models.patient import Patient
from ...api.dependencies.auth import get_current_user
import uuid

router = APIRouter()

@router.get("/{patient_id}")
async def get_soap_notes(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get SOAP notes for a patient"""
    notes = db.query(SOAPNote).filter(SOAPNote.patient_id == patient_id).order_by(SOAPNote.visit_date.desc()).all()
    
    return {
        "notes": [
            {
                "id": str(n.id),
                "subjective": n.subjective,
                "objective": n.objective,
                "assessment": n.assessment,
                "plan": n.plan,
                "visit_date": n.visit_date.isoformat()
            } for n in notes
        ]
    }

@router.post("/")
async def create_soap_note(
    patient_id: str,
    subjective: str,
    objective: str,
    assessment: str,
    plan: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a SOAP note"""
    note = SOAPNote(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_id=current_user["id"],
        subjective=subjective,
        objective=objective,
        assessment=assessment,
        plan=plan
    )
    
    db.add(note)
    db.commit()
    
    return {
        "success": True,
        "note_id": str(note.id)
    }

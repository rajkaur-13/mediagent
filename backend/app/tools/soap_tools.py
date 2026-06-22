import re
from sqlalchemy.orm import Session
from ..models.soap_note import SOAPNote
from ..models.patient import Patient
import uuid
from datetime import datetime

def extract_soap_content_from_message(message: str) -> dict:
    """Extract SOAP note content from the message"""
    
    # Default SOAP structure
    content = {
        "subjective": {
            "chief_complaint": "",
            "history_of_present_illness": "",
            "review_of_systems": "",
            "past_medical_history": ""
        },
        "objective": {
            "vitals": {
                "bp": "",
                "hr": "",
                "temp": "",
                "oxygen": ""
            },
            "physical_exam": "",
            "imaging": "",
            "labs": ""
        },
        "assessment": {
            "diagnosis": "",
            "differential_diagnosis": [],
            "clinical_impression": ""
        },
        "plan": {
            "medications": [],
            "tests_ordered": [],
            "follow_up": "",
            "referrals": [],
            "patient_education": ""
        }
    }
    
    # Try to extract Subjective
    subjective_match = re.search(r'Subjective:\s*(.*?)(?=Objective:|Assessment:|Plan:|$)', message, re.IGNORECASE | re.DOTALL)
    if subjective_match:
        content["subjective"]["chief_complaint"] = subjective_match.group(1).strip()[:500]
    
    # Try to extract Objective
    objective_match = re.search(r'Objective:\s*(.*?)(?=Assessment:|Plan:|$)', message, re.IGNORECASE | re.DOTALL)
    if objective_match:
        objective_text = objective_match.group(1).strip()
        content["objective"]["physical_exam"] = objective_text[:500]
        
        # Extract vitals from objective
        bp_match = re.search(r'BP:\s*(\d+/\d+)', objective_text, re.IGNORECASE)
        if bp_match:
            content["objective"]["vitals"]["bp"] = bp_match.group(1)
        
        hr_match = re.search(r'HR:\s*(\d+)', objective_text, re.IGNORECASE)
        if hr_match:
            content["objective"]["vitals"]["hr"] = hr_match.group(1)
    
    # Try to extract Assessment
    assessment_match = re.search(r'Assessment:\s*(.*?)(?=Plan:|$)', message, re.IGNORECASE | re.DOTALL)
    if assessment_match:
        content["assessment"]["diagnosis"] = assessment_match.group(1).strip()[:500]
    
    # Try to extract Plan
    plan_match = re.search(r'Plan:\s*(.*?)$', message, re.IGNORECASE | re.DOTALL)
    if plan_match:
        content["plan"]["follow_up"] = plan_match.group(1).strip()[:500]
    
    # If no structured content found, create from patient context
    if not content["subjective"]["chief_complaint"]:
        content["subjective"]["chief_complaint"] = "Patient evaluation"
    
    if not content["assessment"]["diagnosis"]:
        content["assessment"]["diagnosis"] = "Under evaluation"
    
    if not content["plan"]["follow_up"]:
        content["plan"]["follow_up"] = "Schedule follow-up in 2 weeks"
    
    return content

def generate_soap_note(patient_id: str, doctor_id: str, user_message: str, db: Session) -> dict:
    """Generate a SOAP note from user message"""
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        return {"success": False, "message": "No patient selected"}
    
    print(f"=== Generating SOAP note for {patient.name} ===")
    print(f"User message: {user_message[:100]}...")
    
    # Check if message contains structured SOAP data
    if "Subjective:" in user_message and "Objective:" in user_message:
        # Message already has structured format, extract directly
        soap_content = extract_soap_content_from_message(user_message)
    else:
        # Create a basic SOAP note from the message
        soap_content = {
            "subjective": {
                "chief_complaint": user_message[:500]
            },
            "objective": {
                "physical_exam": "Not documented",
                "vitals": {"bp": "", "hr": "", "temp": "", "oxygen": ""}
            },
            "assessment": {
                "diagnosis": "Under evaluation"
            },
            "plan": {
                "follow_up": "Schedule follow-up in 2 weeks"
            }
        }
    
    # Create the SOAP note
    soap = SOAPNote(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_id=doctor_id,
        content=soap_content,
        is_finalized="draft"
    )
    
    db.add(soap)
    db.commit()
    db.refresh(soap)
    
    # Format response with the actual content
    response_text = f"""📝 **SOAP Note Generated for {patient.name}**

**ID:** {soap.id}

**📋 SUBJECTIVE:**
{soap_content['subjective']['chief_complaint']}

**🔬 OBJECTIVE:**
{soap_content['objective']['physical_exam'] if soap_content['objective']['physical_exam'] else 'No physical exam documented'}
Vitals: BP {soap_content['objective']['vitals']['bp'] or 'N/A'} | HR {soap_content['objective']['vitals']['hr'] or 'N/A'}

**🧠 ASSESSMENT:**
{soap_content['assessment']['diagnosis']}

**📋 PLAN:**
{soap_content['plan']['follow_up']}

---
✅ SOAP note saved."""
    
    return {
        "success": True,
        "soap_note": {
            "id": str(soap.id),
            "patient_name": patient.name,
            "content": soap_content,
            "visit_date": soap.visit_date.isoformat(),
            "status": soap.is_finalized
        },
        "response_text": response_text
    }

def get_soap_notes(patient_id: str = None, db: Session = None) -> dict:
    """Retrieve SOAP notes for a patient"""
    
    if not patient_id:
        return {"notes": [], "message": "Please specify a patient"}
    
    notes = db.query(SOAPNote).filter(
        SOAPNote.patient_id == patient_id
    ).order_by(SOAPNote.visit_date.desc()).all()
    
    formatted_notes = []
    for note in notes:
        content = note.content if isinstance(note.content, dict) else {}
        visit_date = note.visit_date
        if visit_date:
            if isinstance(visit_date, datetime):
                date_str = visit_date.strftime("%Y-%m-%d")
            else:
                date_str = str(visit_date)[:10]
        else:
            date_str = "Unknown"
        
        formatted_note = {
            "id": str(note.id),
            "visit_date": date_str,
            "content": content
        }
        formatted_notes.append(formatted_note)
    
    return {
        "notes": formatted_notes,
        "count": len(notes)
    }

def get_soap_note_by_id(note_id: str, db: Session) -> dict:
    """Retrieve a single SOAP note by ID"""
    from uuid import UUID
    
    note = db.query(SOAPNote).filter(SOAPNote.id == UUID(note_id)).first()
    
    if not note:
        return {"success": False, "message": "SOAP note not found"}
    
    content = note.content if isinstance(note.content, dict) else {}
    visit_date = note.visit_date
    if visit_date:
        if isinstance(visit_date, datetime):
            date_str = visit_date.strftime("%Y-%m-%d")
        else:
            date_str = str(visit_date)[:10]
    else:
        date_str = "Unknown"
    
    return {
        "success": True,
        "soap_note": {
            "id": str(note.id),
            "patient_id": str(note.patient_id),
            "visit_date": date_str,
            "content": content,
            "status": note.is_finalized
        }
    }
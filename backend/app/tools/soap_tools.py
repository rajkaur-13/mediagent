import re
from sqlalchemy.orm import Session
from ..models.soap_note import SOAPNote
from ..models.patient import Patient
import uuid
from datetime import datetime

def extract_soap_content_from_message(message: str) -> dict:
    """Extract SOAP note content from the message that contains the form data"""
    
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
    
    return content

def generate_soap_note(patient_id: str, doctor_id: str, user_message: str, db: Session) -> dict:
    """Generate a SOAP note from user message"""
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        return {"success": False, "message": "No patient selected"}
    
    print(f"=== Generating SOAP note for {patient.name} ===")
    print(f"User message length: {len(user_message)}")
    
    # Extract content from the message
    soap_content = extract_soap_content_from_message(user_message)
    
    # If no structured content found, create a basic one from patient data
    if not soap_content["subjective"]["chief_complaint"]:
        soap_content["subjective"]["chief_complaint"] = f"Patient {patient.name} evaluated"
    
    if not soap_content["assessment"]["diagnosis"]:
        soap_content["assessment"]["diagnosis"] = patient.conditions[0] if patient.conditions else "Under evaluation"
    
    if not soap_content["plan"]["follow_up"]:
        soap_content["plan"]["follow_up"] = "Schedule follow-up in 2 weeks"
    
    # Also check if the message contains the form data directly (from frontend)
    # The frontend sends: "Generate SOAP note for John Smith with:\nSubjective: ...\nObjective: ..."
    if 'Subjective:' in user_message and 'Objective:' in user_message:
        print("Found structured form data in message")
        # The extraction above already handled it
    
    soap = SOAPNote(
        id=uuid.uuid4(),
        patient_id=patient_id,
        doctor_id=doctor_id,
        content=soap_content,
        is_finalized="draft"
    )
    
    db.add(soap)
    db.commit()
    
    # Format response
    response_text = f"""📝 **SOAP Note Generated for {patient.name}**

**ID:** {soap.id}

**📋 Subjective:**
{soap_content['subjective']['chief_complaint'][:200]}

**🔬 Objective:**
BP: {soap_content['objective']['vitals']['bp']} | HR: {soap_content['objective']['vitals']['hr']}
{soap_content['objective']['physical_exam'][:200] if soap_content['objective']['physical_exam'] else 'No physical exam documented'}

**🧠 Assessment:**
{soap_content['assessment']['diagnosis'][:200]}

**📋 Plan:**
{soap_content['plan']['follow_up'][:200]}

---
✅ SOAP note saved. Click 'Analyze & Get Recommendations' for AI-powered clinical insights."""
    
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

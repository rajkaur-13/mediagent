from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, List
from ...db.database import get_db
from ...core.orchestrator import AgentOrchestrator
from ...api.dependencies.auth import get_current_user
from ...models.patient import Patient
from ...models.soap_note import SOAPNote
from ...models.appointment import Appointment
from ...models.prescription import Prescription
import re

router = APIRouter()

# Store orchestrator instances per user (in production, use Redis)
user_orchestrators: Dict[str, AgentOrchestrator] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    image_base64: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    patient: Optional[dict] = None
    tool_calls: list = []
    session_id: Optional[str] = None
    contexts: List[str] = []

def extract_patient_name(message: str) -> Optional[str]:
    """Extract patient name from the message"""
    patterns = [
        r"patient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+patient",
        r"show me\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"find\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"about\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        r"with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1)
    return None

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Use user_id as the key for persistence
    user_id = str(current_user.get("id"))
    
    # Get or create orchestrator for this user
    if user_id not in user_orchestrators:
        print(f"🆕 Creating new orchestrator for user: {user_id}")
        user_orchestrators[user_id] = AgentOrchestrator(db, user_id)
    else:
        print(f"♻️ Using existing orchestrator for user: {user_id}")
        user_orchestrators[user_id].db = db
    
    orchestrator = user_orchestrators[user_id]
    
    # Process message
    result = orchestrator.process_message(
        request.message,
        image_base64=request.image_base64
    )
    
    # ============================================
    # EXTRACT REAL CONTEXTS FROM DATABASE
    # ============================================
    contexts = []
    patient_context = result.get("patient")
    
    # If orchestrator didn't find patient, try to find from message
    if not patient_context:
        patient_name = extract_patient_name(request.message)
        if patient_name:
            # Try exact match first, then partial
            patient = db.query(Patient).filter(
                Patient.name.ilike(f"%{patient_name}%")
            ).first()
            
            if patient:
                patient_context = {
                    "name": patient.name,
                    "mrn": patient.mrn,
                    "age": patient.age,
                    "gender": patient.gender,
                    "conditions": patient.conditions or [],
                    "allergies": patient.allergies or []
                }
                # Also update the result so frontend gets it
                result["patient"] = patient_context
    
    # Build contexts from patient data
    if patient_context:
        contexts = [
            f"Patient: {patient_context.get('name', 'Unknown')}",
            f"MRN: {patient_context.get('mrn', 'N/A')}",
            f"Age: {patient_context.get('age', 'N/A')}",
            f"Gender: {patient_context.get('gender', 'N/A')}",
            f"Conditions: {', '.join(patient_context.get('conditions', [])) if patient_context.get('conditions') else 'None'}",
            f"Allergies: {', '.join(patient_context.get('allergies', [])) if patient_context.get('allergies') else 'None'}"
        ]
    
    # If still no contexts, add default
    if not contexts:
        # Check if it's an appointment query
        if "appointment" in request.message.lower():
            contexts = ["Appointment data retrieved from database"]
        # Check if it's a SOAP note query
        elif "soap" in request.message.lower() or "soap note" in request.message.lower():
            contexts = ["SOAP note data retrieved from patient records"]
        # Check if it's a prescription query
        elif "prescription" in request.message.lower() or "medication" in request.message.lower():
            contexts = ["Prescription data retrieved from patient records"]
        else:
            contexts = ["No specific patient data retrieved for this query"]

    return ChatResponse(
        reply=result["reply"],
        patient=result.get("patient"),
        tool_calls=result.get("tool_calls", []),
        session_id=request.session_id,
        contexts=contexts
    )
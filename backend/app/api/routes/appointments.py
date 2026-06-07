from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from typing import Optional
from ...db.database import get_db
from ...models.appointment import Appointment
from ...models.patient import Patient
from ...api.dependencies.auth import get_current_user
import uuid

router = APIRouter()

@router.get("/")
async def get_appointments(
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get appointments"""
    query = db.query(Appointment).filter(Appointment.doctor_id == current_user["id"])
    
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    
    appointments = query.order_by(Appointment.date).limit(50).all()
    
    result = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        result.append({
            "id": str(apt.id),
            "patient_name": patient.name if patient else "Unknown",
            "patient_id": str(apt.patient_id),
            "date": apt.date.isoformat(),
            "time": apt.time.strftime("%H:%M"),
            "reason": apt.reason,
            "status": apt.status
        })
    
    return {"appointments": result}

@router.post("/")
async def create_appointment(
    patient_name: str,
    date_str: str,
    time_str: str,
    reason: str = "General consultation",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new appointment"""
    # Find patient
    patient = db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_name}' not found")
    
    # Parse date and time
    try:
        appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        appointment_time = datetime.strptime(time_str, "%H:%M").time()
    except:
        raise HTTPException(status_code=400, detail="Invalid date or time format")
    
    # Create appointment
    appointment = Appointment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        doctor_id=current_user["id"],
        date=appointment_date,
        time=appointment_time,
        reason=reason,
        status="scheduled"
    )
    
    db.add(appointment)
    db.commit()
    
    return {
        "success": True,
        "appointment": {
            "id": str(appointment.id),
            "patient_name": patient.name,
            "date": appointment_date.isoformat(),
            "time": appointment_time.strftime("%H:%M"),
            "reason": reason
        }
    }

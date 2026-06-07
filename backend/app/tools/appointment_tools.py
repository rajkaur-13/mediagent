from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.appointment import Appointment
from ..models.patient import Patient
from ..models.user import User
import uuid

def schedule_appointment(
    patient_name: str,
    weeks_from_now: int,
    time_str: str,
    reason: str,
    db: Session,
    doctor_id: str
) -> dict:
    """Schedule a new appointment"""
    # Find patient
    patient = db.query(Patient).filter(
        Patient.name.ilike(f"%{patient_name}%")
    ).first()
    
    if not patient:
        return {"success": False, "message": f"Patient '{patient_name}' not found"}
    
    # Calculate appointment date
    appointment_date = datetime.now().date() + timedelta(weeks=weeks_from_now)
    
    # Parse time (supports "09:00 AM" or "14:30" format)
    try:
        if "AM" in time_str or "PM" in time_str:
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            appointment_time = datetime.strptime(time_str, "%H:%M").time()
    except:
        appointment_time = datetime.strptime("09:00", "%H:%M").time()
    
    # Create appointment
    appointment = Appointment(
        id=uuid.uuid4(),
        patient_id=patient.id,
        doctor_id=doctor_id,
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
            "time": time_str,
            "reason": reason,
            "status": "scheduled"
        },
        "message": f"Appointment scheduled for {patient.name} on {appointment_date} at {time_str}"
    }

def get_appointments(patient_name: str = None, db: Session = None, doctor_id: str = None) -> dict:
    """Get appointments, optionally filtered by patient"""
    query = db.query(Appointment).filter(Appointment.doctor_id == doctor_id)
    
    if patient_name:
        patient = db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).first()
        if patient:
            query = query.filter(Appointment.patient_id == patient.id)
        else:
            return {"appointments": [], "message": f"Patient '{patient_name}' not found"}
    
    appointments = query.order_by(Appointment.date).limit(20).all()
    
    result = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        result.append({
            "id": str(apt.id),
            "patient_name": patient.name if patient else "Unknown",
            "date": apt.date.isoformat(),
            "time": apt.time.strftime("%I:%M %p"),
            "reason": apt.reason,
            "status": apt.status
        })
    
    return {"appointments": result, "count": len(result)}
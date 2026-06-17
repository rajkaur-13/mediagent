from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.appointment import Appointment
from ..models.patient import Patient
from ..models.user import User
import uuid

def get_available_slots(doctor_id: str, date: datetime.date, db: Session, duration_minutes: int = 30) -> list:
    """Get available time slots for a doctor on a specific date"""
    
    # Define working hours (9 AM to 5 PM)
    start_hour = 9
    end_hour = 17
    
    # Generate all possible slots
    all_slots = []
    current_time = datetime.combine(date, datetime.min.time().replace(hour=start_hour))
    end_time = datetime.combine(date, datetime.min.time().replace(hour=end_hour))
    
    while current_time < end_time:
        all_slots.append({
            "time": current_time.strftime("%I:%M %p"),
            "datetime": current_time
        })
        current_time += timedelta(minutes=duration_minutes)
    
    # Get booked appointments for this doctor on this date
    booked = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.date == date,
        Appointment.status == "scheduled"
    ).all()
    
    booked_times = [apt.time.strftime("%I:%M %p") for apt in booked]
    
    # Filter out booked slots
    available = [slot for slot in all_slots if slot["time"] not in booked_times]
    
    return available

def get_available_slots_in_timeframe(doctor_id: str, days_min: int, days_max: int, db: Session) -> list:
    """Get available slots within a date range"""
    
    available_slots = []
    start_date = datetime.now().date() + timedelta(days=days_min)
    end_date = datetime.now().date() + timedelta(days=days_max)
    
    current_date = start_date
    while current_date <= end_date:
        slots = get_available_slots(doctor_id, current_date, db)
        for slot in slots:
            available_slots.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "day": current_date.strftime("%A"),
                "time": slot["time"]
            })
        current_date += timedelta(days=1)
    
    return available_slots

def schedule_appointment(
    patient_name: str,
    weeks_from_now: int,
    time_str: str,
    reason: str,
    db: Session,
    doctor_id: str,
    severity: str = None,
    ai_recommended: bool = False
) -> dict:
    """Schedule an appointment with conflict checking"""
    
    # Find patient
    patient = db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).first()
    if not patient:
        return {"success": False, "message": f"Patient '{patient_name}' not found"}
    
    # Parse date (default to tomorrow if not specified)
    if weeks_from_now == 0:
        appointment_date = datetime.now().date() + timedelta(days=1)
    else:
        appointment_date = datetime.now().date() + timedelta(weeks=weeks_from_now)
    
    # Parse time
    try:
        if "AM" in time_str or "PM" in time_str:
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            appointment_time = datetime.strptime(time_str, "%H:%M").time()
    except:
        appointment_time = datetime.strptime("09:00", "%H:%M").time()
    
    # Check for conflicts
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.date == appointment_date,
        Appointment.time == appointment_time,
        Appointment.status == "scheduled"
    ).first()
    
    if existing:
        # Find alternative slots
        available = get_available_slots(doctor_id, appointment_date, db)
        alternative_times = [slot["time"] for slot in available[:3]]
        
        return {
            "success": False,
            "conflict": True,
            "message": f"❌ {appointment_time.strftime('%I:%M %p')} is already booked.",
            "alternative_times": alternative_times,
            "suggestion": f"Available times on {appointment_date.strftime('%Y-%m-%d')}: {', '.join(alternative_times)}"
        }
    
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
    
    # Add severity info if provided
    if severity:
        appointment.severity = severity
    
    db.add(appointment)
    db.commit()
    
    return {
        "success": True,
        "appointment": {
            "id": str(appointment.id),
            "patient_name": patient.name,
            "date": appointment_date.isoformat(),
            "time": appointment_time.strftime("%I:%M %p"),
            "reason": reason,
            "status": "scheduled",
            "severity": severity
        },
        "message": f"✅ Appointment scheduled for {patient.name} on {appointment_date} at {appointment_time.strftime('%I:%M %p')}"
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
    
    appointments = query.order_by(Appointment.date).limit(50).all()
    
    result = []
    for apt in appointments:
        patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
        result.append({
            "id": str(apt.id),
            "patient_name": patient.name if patient else "Unknown",
            "date": apt.date.isoformat(),
            "time": apt.time.strftime("%I:%M %p"),
            "reason": apt.reason,
            "status": apt.status,
            "severity": getattr(apt, 'severity', None)
        })
    
    return {"appointments": result, "count": len(result)}

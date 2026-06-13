from sqlalchemy.orm import Session
from ..models.patient import Patient
from ..models.soap_note import SOAPNote
from ..models.prescription import Prescription
from ..models.appointment import Appointment

def search_patient(name: str, db: Session, doctor_id: str = None) -> dict:
    """Search for a patient by name - returns ALL patient data with existing records"""
    
    patients = db.query(Patient).filter(
        Patient.name.ilike(f"%{name}%")
    ).all()
    
    if not patients:
        return {"found": False, "message": f"No patient found with name '{name}'"}
    
    patient = patients[0]
    
    # Get all SOAP notes
    soap_notes = db.query(SOAPNote).filter(
        SOAPNote.patient_id == patient.id
    ).order_by(SOAPNote.visit_date.desc()).all()
    
    # Get all prescriptions
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id
    ).order_by(Prescription.prescribed_date.desc()).all()
    
    # Get all appointments
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.id
    ).order_by(Appointment.date.desc()).all()
    
    # Get image analysis count
    analysis_count = len(patient.analysis_history or [])
    
    # Format SOAP notes summary
    soap_summary = []
    for note in soap_notes:
        content = note.content if isinstance(note.content, dict) else {}
        soap_summary.append({
            "id": str(note.id),
            "date": note.visit_date.strftime("%Y-%m-%d") if note.visit_date else "Unknown",
            "chief_complaint": content.get('subjective', {}).get('chief_complaint', 'No data')[:50]
        })
    
    # Format prescriptions summary
    rx_summary = []
    for rx in prescriptions:
        content = rx.content if isinstance(rx.content, dict) else {}
        med = content.get('medication', {})
        rx_summary.append({
            "id": str(rx.id),
            "date": rx.prescribed_date.strftime("%Y-%m-%d") if rx.prescribed_date else "Unknown",
            "medication": med.get('name', 'Unknown'),
            "dosage": med.get('dosage', 'N/A')
        })
    
    # Format image analysis summary
    image_summary = []
    for img in patient.analysis_history or []:
        image_summary.append({
            "id": img.get('id', ''),
            "date": img.get('analyzed_at', '')[:10] if img.get('analyzed_at') else "Unknown",
            "findings": img.get('findings', 'No findings')[:60],
            "image_type": img.get('image_type', 'X-ray').replace('_', ' ').title()
        })
    
    # Format appointments summary
    apt_summary = []
    for apt in appointments:
        apt_summary.append({
            "id": str(apt.id),
            "date": apt.date.strftime("%Y-%m-%d") if apt.date else "Unknown",
            "time": apt.time.strftime("%H:%M") if apt.time else "Unknown",
            "reason": apt.reason or "Follow-up"
        })
    
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
            "analysis_count": analysis_count,
            "soap_count": len(soap_notes),
            "rx_count": len(prescriptions),
            "apt_count": len(appointments),
            "soap_notes": soap_summary,
            "prescriptions": rx_summary,
            "images": image_summary,
            "appointments": apt_summary
        }
    }

def get_all_patients(db: Session, limit: int = 20) -> dict:
    patients = db.query(Patient).limit(limit).all()
    
    patient_list = []
    for p in patients:
        patient_list.append({
            "name": p.name,
            "mrn": p.mrn,
            "age": p.age,
            "id": str(p.id)
        })
    
    return {
        "count": len(patients),
        "patients": patient_list
    }

def get_patient_by_id(patient_id: str, db: Session) -> dict:
    from uuid import UUID
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    
    if not patient:
        return {"found": False, "message": "Patient not found"}
    
    soap_notes = db.query(SOAPNote).filter(SOAPNote.patient_id == patient.id).order_by(SOAPNote.visit_date.desc()).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.prescribed_date.desc()).all()
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.date.desc()).all()
    analysis_count = len(patient.analysis_history or [])
    
    soap_summary = []
    for note in soap_notes:
        content = note.content if isinstance(note.content, dict) else {}
        soap_summary.append({
            "id": str(note.id),
            "date": note.visit_date.strftime("%Y-%m-%d") if note.visit_date else "Unknown",
            "chief_complaint": content.get('subjective', {}).get('chief_complaint', 'No data')[:50]
        })
    
    rx_summary = []
    for rx in prescriptions:
        content = rx.content if isinstance(rx.content, dict) else {}
        med = content.get('medication', {})
        rx_summary.append({
            "id": str(rx.id),
            "date": rx.prescribed_date.strftime("%Y-%m-%d") if rx.prescribed_date else "Unknown",
            "medication": med.get('name', 'Unknown'),
            "dosage": med.get('dosage', 'N/A')
        })
    
    image_summary = []
    for img in patient.analysis_history or []:
        image_summary.append({
            "id": img.get('id', ''),
            "date": img.get('analyzed_at', '')[:10] if img.get('analyzed_at') else "Unknown",
            "findings": img.get('findings', 'No findings')[:60],
            "image_type": img.get('image_type', 'X-ray').replace('_', ' ').title()
        })
    
    apt_summary = []
    for apt in appointments:
        apt_summary.append({
            "id": str(apt.id),
            "date": apt.date.strftime("%Y-%m-%d") if apt.date else "Unknown",
            "time": apt.time.strftime("%H:%M") if apt.time else "Unknown",
            "reason": apt.reason or "Follow-up"
        })
    
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
            "analysis_count": analysis_count,
            "soap_count": len(soap_notes),
            "rx_count": len(prescriptions),
            "apt_count": len(appointments),
            "soap_notes": soap_summary,
            "prescriptions": rx_summary,
            "images": image_summary,
            "appointments": apt_summary
        }
    }

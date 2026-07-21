from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from ..models.patient import Patient
from ..models.soap_note import SOAPNote
from ..models.prescription import Prescription
from ..models.appointment import Appointment
from ..models.image import Image  
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from difflib import get_close_matches

def search_patient(name: str, db: Session, doctor_id: str = None) -> dict:
    """Search for a patient by name - returns ALL patient data with existing records"""
    
    patients = db.query(Patient).filter(
        Patient.name.ilike(f"%{name}%")
    ).all()
    
    if not patients:
        return {"found": False, "message": f"No patient found with name '{name}'"}
    
    patient = patients[0]
    
    # Get all SOAP notes with FULL content
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
    
    # Format SOAP notes with FULL content - FIXED
    soap_summary = []
    for note in soap_notes:
        content = note.content if isinstance(note.content, dict) else {}
        
        # Format date properly
        if note.visit_date:
            if isinstance(note.visit_date, datetime):
                visit_date_str = note.visit_date.strftime("%Y-%m-%d")
            else:
                visit_date_str = str(note.visit_date)[:10]
        else:
            visit_date_str = "Unknown"
        
        # Get the full SOAP content
        subjective = content.get('subjective', {}).get('chief_complaint', 'Not documented')
        objective = content.get('objective', {}).get('physical_exam', 'Not documented')
        assessment = content.get('assessment', {}).get('diagnosis', 'Not documented')
        plan = content.get('plan', {}).get('follow_up', 'Not documented')
        
        # Create a readable summary
        full_text = f"Subj: {subjective[:100]}... | Diag: {assessment[:80]}"
        
        soap_summary.append({
            "id": str(note.id),
            "visit_date": visit_date_str,
            "subjective": subjective[:200],
            "objective": objective[:200],
            "assessment": assessment[:200],
            "plan": plan[:200],
            "full_text": full_text
        })
    
    # Format prescriptions summary
    rx_summary = []
    for rx in prescriptions:
        content = rx.content if isinstance(rx.content, dict) else {}
        med = content.get('medication', {})
        rx_date = rx.prescribed_date
        if rx_date:
            if isinstance(rx_date, datetime):
                date_str = rx_date.strftime("%Y-%m-%d")
            else:
                date_str = str(rx_date)[:10]
        else:
            date_str = "Unknown"
        
        rx_summary.append({
            "id": str(rx.id),
            "date": date_str,
            "medication": med.get('name', 'Unknown'),
            "dosage": med.get('dosage', 'N/A')
        })
    
    # Format image analysis summary
    image_summary = []
    for img in patient.analysis_history or []:
        img_date = img.get('analyzed_at', '')
        if img_date and len(img_date) > 10:
            img_date = img_date[:10]
        image_summary.append({
            "id": img.get('id', ''),
            "date": img_date or "Unknown",
            "findings": img.get('findings', 'No findings')[:60],
            "image_type": img.get('image_type', 'X-ray').replace('_', ' ').title()
        })
    
    # Format appointments summary
    apt_summary = []
    for apt in appointments:
        apt_summary.append({
            "id": str(apt.id),
            "date": apt.date.strftime("%Y-%m-%d") if apt.date else "Unknown",
            "time": apt.time.strftime("%I:%M %p") if apt.time else "Unknown",
            "reason": apt.reason or "Follow-up",
            "severity": getattr(apt, 'severity', None)
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
        
        if note.visit_date:
            if isinstance(note.visit_date, datetime):
                visit_date_str = note.visit_date.strftime("%Y-%m-%d")
            else:
                visit_date_str = str(note.visit_date)[:10]
        else:
            visit_date_str = "Unknown"
        
        subjective = content.get('subjective', {}).get('chief_complaint', 'Not documented')
        objective = content.get('objective', {}).get('physical_exam', 'Not documented')
        assessment = content.get('assessment', {}).get('diagnosis', 'Not documented')
        plan = content.get('plan', {}).get('follow_up', 'Not documented')
        
        soap_summary.append({
            "id": str(note.id),
            "visit_date": visit_date_str,
            "subjective": subjective[:200],
            "objective": objective[:200],
            "assessment": assessment[:200],
            "plan": plan[:200]
        })
    
    rx_summary = []
    for rx in prescriptions:
        content = rx.content if isinstance(rx.content, dict) else {}
        med = content.get('medication', {})
        rx_date = rx.prescribed_date
        if rx_date:
            if isinstance(rx_date, datetime):
                date_str = rx_date.strftime("%Y-%m-%d")
            else:
                date_str = str(rx_date)[:10]
        else:
            date_str = "Unknown"
        
        rx_summary.append({
            "id": str(rx.id),
            "date": date_str,
            "medication": med.get('name', 'Unknown'),
            "dosage": med.get('dosage', 'N/A')
        })
    
    image_summary = []
    for img in patient.analysis_history or []:
        img_date = img.get('analyzed_at', '')
        if img_date and len(img_date) > 10:
            img_date = img_date[:10]
        image_summary.append({
            "id": img.get('id', ''),
            "date": img_date or "Unknown",
            "findings": img.get('findings', 'No findings')[:60],
            "image_type": img.get('image_type', 'X-ray').replace('_', ' ').title()
        })
    
    apt_summary = []
    for apt in appointments:
        apt_summary.append({
            "id": str(apt.id),
            "date": apt.date.strftime("%Y-%m-%d") if apt.date else "Unknown",
            "time": apt.time.strftime("%I:%M %p") if apt.time else "Unknown",
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

# ========== NEW SEARCH FUNCTIONS ==========

def search_patients_by_condition(condition: str, db: Session) -> List[Dict[str, Any]]:
    """Find patients with a specific condition (case-insensitive)"""
    patients = db.query(Patient).filter(
        Patient.conditions.contains([condition])
    ).all()
    
    result = []
    for patient in patients:
        result.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "conditions": patient.conditions or [],
            "medications": patient.medications or []
        })
    
    return result

def search_patients_by_medication(medication: str, db: Session) -> List[Dict[str, Any]]:
    """Find patients on a specific medication"""
    patients = db.query(Patient).filter(
        Patient.medications.contains([medication])
    ).all()
    
    result = []
    for patient in patients:
        result.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "conditions": patient.conditions or [],
            "medications": patient.medications or []
        })
    
    return result

def search_patients_by_allergy(allergy: str, db: Session) -> List[Dict[str, Any]]:
    """Find patients with a specific allergy"""
    patients = db.query(Patient).filter(
        Patient.allergies.contains([allergy])
    ).all()
    
    result = []
    for patient in patients:
        result.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "allergies": patient.allergies or []
        })
    
    return result

def search_patients_by_age_range(min_age: int, max_age: int, db: Session) -> List[Dict[str, Any]]:
    """Find patients in a specific age range"""
    patients = db.query(Patient).filter(
        Patient.age >= min_age,
        Patient.age <= max_age
    ).all()
    
    result = []
    for patient in patients:
        result.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender
        })
    
    return result

def search_patients_by_gender(gender: str, db: Session) -> List[Dict[str, Any]]:
    """Find patients by gender"""
    patients = db.query(Patient).filter(
        Patient.gender.ilike(f"%{gender}%")
    ).all()
    
    result = []
    for patient in patients:
        result.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender
        })
    
    return result

def search_patients_without_soap(db: Session) -> List[Dict[str, Any]]:
    """Find patients who don't have any SOAP notes"""
    all_patients = db.query(Patient).all()
    
    result = []
    for patient in all_patients:
        soap_notes = db.query(SOAPNote).filter(
            SOAPNote.patient_id == patient.id
        ).first()
        if not soap_notes:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age
            })
    
    return result

def search_patients_without_appointments(db: Session) -> List[Dict[str, Any]]:
    """Find patients who don't have any upcoming appointments"""
    all_patients = db.query(Patient).all()
    today = datetime.now().date()
    
    result = []
    for patient in all_patients:
        appointments = db.query(Appointment).filter(
            Appointment.patient_id == patient.id,
            Appointment.date >= today,
            Appointment.status == "scheduled"
        ).first()
        if not appointments:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age
            })
    
    return result

def search_patients_without_prescriptions(db: Session) -> List[Dict[str, Any]]:
    """Find patients who don't have any active prescriptions"""
    all_patients = db.query(Patient).all()
    
    result = []
    for patient in all_patients:
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_id == patient.id,
            Prescription.status == "active"
        ).first()
        if not prescriptions:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age
            })
    
    return result

def search_patients_without_imaging(db: Session, image_type: str = None) -> List[Dict[str, Any]]:
    """Find patients who don't have any imaging (or specific type)"""
    all_patients = db.query(Patient).all()
    
    result = []
    for patient in all_patients:
        query = db.query(Image).filter(Image.patient_id == patient.id)
        if image_type:
            query = query.filter(Image.image_type.ilike(f"%{image_type}%"))
        images = query.first()
        if not images:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age
            })
    
    return result

def search_patients_with_imaging(db: Session, image_type: str = None) -> List[Dict[str, Any]]:
    """Find patients who have imaging (or specific type)"""
    all_patients = db.query(Patient).all()
    
    result = []
    for patient in all_patients:
        query = db.query(Image).filter(Image.patient_id == patient.id)
        if image_type:
            query = query.filter(Image.image_type.ilike(f"%{image_type}%"))
        images = query.first()
        if images:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age,
                "image_type": image_type or "Any"
            })
    
    return result

def search_images_by_type(image_type: str, patient_name: str, db: Session) -> List[Dict[str, Any]]:
    """Search for images by type, optionally for a specific patient"""
    query = db.query(Image)
    
    if image_type and image_type != "All":
        query = query.filter(Image.image_type.ilike(f"%{image_type}%"))
    
    if patient_name:
        patients = db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).all()
        if patients:
            patient_ids = [p.id for p in patients]
            query = query.filter(Image.patient_id.in_(patient_ids))
    
    images = query.order_by(Image.uploaded_at.desc()).all()
    
    result = []
    for img in images:
        patient = db.query(Patient).filter(Patient.id == img.patient_id).first()
        result.append({
            "id": str(img.id),
            "patient_name": patient.name if patient else "Unknown",
            "patient_id": str(img.patient_id),
            "image_type": img.image_type,
            "filename": img.filename,
            "analysis": img.analysis,
            "confidence": img.confidence,
            "uploaded_at": img.uploaded_at.strftime("%Y-%m-%d %H:%M") if img.uploaded_at else "Unknown"
        })
    
    return result

def search_similar_patients(patient_id: str, db: Session, max_results: int = 5) -> List[Dict[str, Any]]:
    """Find patients similar to a given patient (by conditions and medications)"""
    target = db.query(Patient).filter(Patient.id == patient_id).first()
    if not target:
        return []
    
    target_conditions = set(target.conditions or [])
    target_medications = set(target.medications or [])
    
    all_patients = db.query(Patient).filter(Patient.id != patient_id).all()
    
    scored = []
    for patient in all_patients:
        patient_conditions = set(patient.conditions or [])
        patient_medications = set(patient.medications or [])
        
        # Calculate similarity score
        condition_overlap = len(target_conditions & patient_conditions)
        medication_overlap = len(target_medications & patient_medications)
        total_target = len(target_conditions) + len(target_medications)
        
        if total_target > 0:
            score = (condition_overlap + medication_overlap) / total_target
        else:
            score = 0
        
        if score > 0:
            scored.append({
                "patient": {
                    "id": str(patient.id),
                    "name": patient.name,
                    "mrn": patient.mrn,
                    "age": patient.age,
                    "gender": patient.gender,
                    "conditions": patient.conditions or [],
                    "medications": patient.medications or []
                },
                "similarity_score": round(score * 100, 1)
            })
    
    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:max_results]

def search_combined(db: Session, 
                   condition: str = None, 
                   medication: str = None, 
                   allergy: str = None,
                   age_min: int = None, 
                   age_max: int = None, 
                   gender: str = None,
                   has_soap: bool = None,
                   has_appointment: bool = None,
                   has_prescription: bool = None,
                   has_imaging: bool = None,
                   image_type: str = None,
                   age: int = None) -> List[Dict[str, Any]]:
    """Combined search with multiple filters"""
    
    query = db.query(Patient)
    
    if condition:
        query = query.filter(Patient.conditions.contains([condition]))
    
    if medication:
        query = query.filter(Patient.medications.contains([medication]))
    
    if allergy:
        query = query.filter(Patient.allergies.contains([allergy]))
    
    if age_min is not None:
        query = query.filter(Patient.age >= age_min)
    
    if age_max is not None:
        query = query.filter(Patient.age <= age_max)
    
    if gender:
        query = query.filter(Patient.gender.ilike(f"%{gender}%"))
    
    patients = query.all()
    
    # Apply additional filters manually
    filtered = []
    for patient in patients:
        # Filter by SOAP status
        if has_soap is not None:
            soap = db.query(SOAPNote).filter(SOAPNote.patient_id == patient.id).first()
            if has_soap and not soap:
                continue
            if not has_soap and soap:
                continue
        
        # Filter by appointment status
        if has_appointment is not None:
            today = datetime.now().date()
            apt = db.query(Appointment).filter(
                Appointment.patient_id == patient.id,
                Appointment.date >= today,
                Appointment.status == "scheduled"
            ).first()
            if has_appointment and not apt:
                continue
            if not has_appointment and apt:
                continue
        
        # Filter by prescription status
        if has_prescription is not None:
            rx = db.query(Prescription).filter(
                Prescription.patient_id == patient.id,
                Prescription.status == "active"
            ).first()
            if has_prescription and not rx:
                continue
            if not has_prescription and rx:
                continue
        
        # Filter by imaging status
        if has_imaging is not None or image_type:
            img_query = db.query(Image).filter(Image.patient_id == patient.id)
            if image_type:
                img_query = img_query.filter(Image.image_type.ilike(f"%{image_type}%"))
            img = img_query.first()
            if has_imaging and not img:
                continue
            if not has_imaging and img:
                continue
        
        filtered.append({
            "id": str(patient.id),
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "conditions": patient.conditions or [],
            "medications": patient.medications or [],
            "allergies": patient.allergies or []
        })
    
    return filtered

def search_medical_term(term: str, db: Session) -> Dict[str, Any]:
    """Search for a medical term across patient data"""
    
    # Search in patient conditions
    condition_patients = db.query(Patient).filter(
        Patient.conditions.contains([term])
    ).all()
    
    # Search in patient medications
    medication_patients = db.query(Patient).filter(
        Patient.medications.contains([term])
    ).all()
    
    # Search in SOAP notes
    soap_notes = db.query(SOAPNote).filter(
        or_(
            SOAPNote.subjective.ilike(f"%{term}%"),
            SOAPNote.objective.ilike(f"%{term}%"),
            SOAPNote.assessment.ilike(f"%{term}%"),
            SOAPNote.plan.ilike(f"%{term}%")
        )
    ).all()
    
    result = {
        "term": term,
        "patients_with_condition": [],
        "patients_on_medication": [],
        "soap_notes_mentioning_term": []
    }
    
    for patient in condition_patients:
        result["patients_with_condition"].append({
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age
        })
    
    for patient in medication_patients:
        result["patients_on_medication"].append({
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age
        })
    
    for note in soap_notes:
        patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
        result["soap_notes_mentioning_term"].append({
            "patient_name": patient.name if patient else "Unknown",
            "date": note.visit_date.strftime("%Y-%m-%d") if note.visit_date else "Unknown",
            "content": note.content
        })
    
    return result

def search_fuzzy_patient_name(name: str, db: Session, threshold: float = 0.6) -> List[Dict[str, Any]]:
    """Search for patients with fuzzy name matching (handles typos)"""
    all_patients = db.query(Patient).all()
    patient_names = [p.name for p in all_patients]
    
    matches = get_close_matches(name, patient_names, n=5, cutoff=threshold)
    
    result = []
    for match_name in matches:
        patient = db.query(Patient).filter(Patient.name == match_name).first()
        if patient:
            result.append({
                "id": str(patient.id),
                "name": patient.name,
                "mrn": patient.mrn,
                "age": patient.age,
                "gender": patient.gender
            })
    
    return result
from sqlalchemy.orm import Session
from ..services.chroma_service import chroma_service
from ..models.patient import Patient

def find_similar_patients(patient_id: str, db: Session, top_k: int = 5) -> dict:
    """Find patients clinically similar to the given patient"""
    
    # Get the source patient
    source_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not source_patient:
        return {"found": False, "message": "Patient not found"}
    
    # Create query text from patient data
    query_text = f"{source_patient.name} {', '.join(source_patient.conditions or [])} {', '.join(source_patient.medications or [])}"
    
    # Search ChromaDB for similar patients
    results = chroma_service.search_patients(query_text, top_k=top_k + 1)  # +1 to exclude self
    
    # Filter out the source patient
    similar_patients = []
    for r in results:
        if r["patient_id"] != patient_id:
            patient = db.query(Patient).filter(Patient.id == r["patient_id"]).first()
            if patient:
                similar_patients.append({
                    "id": str(patient.id),
                    "name": patient.name,
                    "age": patient.age,
                    "gender": patient.gender,
                    "conditions": patient.conditions or [],
                    "similarity_score": r["similarity"]
                })
    
    if not similar_patients:
        return {"found": False, "message": "No similar patients found"}
    
    return {
        "found": True,
        "source_patient": {
            "id": str(source_patient.id),
            "name": source_patient.name,
            "age": source_patient.age,
            "conditions": source_patient.conditions or []
        },
        "similar_patients": similar_patients[:top_k],
        "count": len(similar_patients)
    }

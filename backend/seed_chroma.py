from app.db.database import SessionLocal
from app.models.patient import Patient
from app.services.chroma_service import chroma_service

db = SessionLocal()

# Get all patients
patients = db.query(Patient).all()
print(f"Seeding {len(patients)} patients to ChromaDB...")

for patient in patients:
    result = chroma_service.upsert_patient(
        patient_id=str(patient.id),
        name=patient.name,
        conditions=patient.conditions or []
    )

print("🎉 All patients seeded to ChromaDB!")
db.close()

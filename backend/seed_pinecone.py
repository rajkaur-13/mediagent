from app.db.database import SessionLocal
from app.models.patient import Patient
from app.services.pinecone_service import pinecone_service

db = SessionLocal()

# Get all patients
patients = db.query(Patient).all()
print(f"Seeding {len(patients)} patients to Pinecone...")

for patient in patients:
    result = pinecone_service.upsert_patient(
        patient_id=str(patient.id),
        name=patient.name,
        conditions=patient.conditions or []
    )
    print(f"✅ Seeded: {patient.name}")

print("🎉 All patients seeded to Pinecone!")
db.close()

#!/usr/bin/env python
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.user import User
from app.models.appointment import Appointment
from app.models.soap_note import SOAPNote

# Simple password hash (for demo only - use bcrypt in production)
def simple_hash(password: str) -> str:
    return f"hashed_{password}"

def seed_database():
    print("🌱 Seeding database...")
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_user = db.query(User).filter(User.email == "doctor@mediagent.com").first()
        if existing_user:
            print("⚠️  Database already seeded! Skipping...")
            return
        
        # Create test doctor
        doctor = User(
            id=uuid.uuid4(),
            email="doctor@mediagent.com",
            hashed_password=simple_hash("password123"),
            full_name="Dr. Sarah Wilson",
            role="doctor",
            is_active=True
        )
        db.add(doctor)
        db.flush()
        print(f"✅ Created doctor: {doctor.email}")
        
        # Create test patients
        patients_data = [
            {"mrn": "MRN001", "name": "Sarah Johnson", "age": 45, "gender": "F", 
             "phone": "+1-555-0101", "email": "sarah.j@example.com",
             "allergies": ["Penicillin"], "conditions": ["Hypertension"], "medications": ["Lisinopril"]},
            {"mrn": "MRN002", "name": "Michael Chen", "age": 62, "gender": "M",
             "phone": "+1-555-0102", "email": "michael.chen@example.com",
             "allergies": [], "conditions": ["Diabetes Type 2"], "medications": ["Metformin"]},
            {"mrn": "MRN003", "name": "Emily Rodriguez", "age": 34, "gender": "F",
             "phone": "+1-555-0103", "email": "emily.rod@example.com",
             "allergies": ["Sulfa"], "conditions": ["Asthma"], "medications": ["Albuterol"]},
            {"mrn": "MRN004", "name": "James Williams", "age": 58, "gender": "M",
             "phone": "+1-555-0104", "email": "james.w@example.com",
             "allergies": [], "conditions": ["COPD"], "medications": ["Spiriva"]},
            {"mrn": "MRN005", "name": "Maria Garcia", "age": 29, "gender": "F",
             "phone": "+1-555-0105", "email": "maria.g@example.com",
             "allergies": ["Latex"], "conditions": ["Anxiety"], "medications": ["Sertraline"]},
        ]
        
        patients = []
        for p_data in patients_data:
            patient = Patient(id=uuid.uuid4(), **p_data)
            db.add(patient)
            patients.append(patient)
        
        db.flush()
        print(f"✅ Created {len(patients_data)} patients")
        
        # Create appointments
        today = datetime.now().date()
        for i, patient in enumerate(patients[:3]):
            appointment = Appointment(
                id=uuid.uuid4(),
                patient_id=patient.id,
                doctor_id=doctor.id,
                date=today + timedelta(days=i+1),
                time=datetime.strptime("09:00", "%H:%M").time(),
                reason="Follow-up visit",
                status="scheduled"
            )
            db.add(appointment)
        
        print(f"✅ Created 3 appointments")
        
        # Commit all changes
        db.commit()
        
        print("\n" + "="*50)
        print("🎉 DATABASE SEEDED SUCCESSFULLY!")
        print("="*50)
        print(f"\n📋 Login Credentials:")
        print(f"   Email: doctor@mediagent.com")
        print(f"   Password: password123")
        print(f"\n📊 Summary:")
        print(f"   - 1 Doctor")
        print(f"   - {len(patients_data)} Patients")
        print(f"   - 3 Appointments")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

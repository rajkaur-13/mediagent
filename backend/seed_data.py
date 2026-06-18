#!/usr/bin/env python
import sys
import os

# Add the current directory to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.user import User
from app.models.appointment import Appointment
from app.models.soap_note import SOAPNote
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta

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
            hashed_password=get_password_hash("password123"),
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
            {"mrn": "MRN006", "name": "David Kim", "age": 71, "gender": "M",
             "phone": "+1-555-0106", "email": "david.kim@example.com",
             "allergies": [], "conditions": ["Arthritis", "Hypertension"], "medications": ["Ibuprofen", "Amlodipine"]},
            {"mrn": "MRN007", "name": "Lisa Patel", "age": 42, "gender": "F",
             "phone": "+1-555-0107", "email": "lisa.patel@example.com",
             "allergies": ["Codeine"], "conditions": ["Migraine"], "medications": ["Sumatriptan"]},
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
        appointments_data = [
            {"patient": patients[0], "days_from_now": 1, "time": "09:00", "reason": "Follow-up on hypertension"},
            {"patient": patients[1], "days_from_now": 1, "time": "10:30", "reason": "Diabetes management"},
            {"patient": patients[2], "days_from_now": 2, "time": "14:00", "reason": "Asthma follow-up"},
            {"patient": patients[3], "days_from_now": 3, "time": "11:15", "reason": "COPD exacerbation check"},
            {"patient": patients[4], "days_from_now": 5, "time": "15:30", "reason": "Anxiety medication review"},
            {"patient": patients[5], "days_from_now": 7, "time": "09:45", "reason": "Annual physical"},
        ]
        
        for apt_data in appointments_data:
            appointment = Appointment(
                id=uuid.uuid4(),
                patient_id=apt_data["patient"].id,
                doctor_id=doctor.id,
                date=today + timedelta(days=apt_data["days_from_now"]),
                time=datetime.strptime(apt_data["time"], "%H:%M").time(),
                reason=apt_data["reason"],
                status="scheduled"
            )
            db.add(appointment)
        
        print(f"✅ Created {len(appointments_data)} appointments")
        
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
        print(f"   - {len(appointments_data)} Appointments")
        print(f"\n🚀 You can now run: uvicorn app.main:app --reload")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
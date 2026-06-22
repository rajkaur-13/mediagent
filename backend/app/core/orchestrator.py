import re
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..services.llm_service import get_llm_response
from ..services.chroma_service import chroma_service
from ..services.redis_service import redis_service
from ..tools.patient_tools import search_patient, get_all_patients
from ..tools.appointment_tools import schedule_appointment, get_appointments, get_available_slots_in_timeframe
from ..tools.soap_tools import generate_soap_note, get_soap_notes
from ..tools.prescription_tools import generate_prescription, get_prescriptions
from ..tools.similar_patients_tool import find_similar_patients
from ..tools.severity_analyzer import analyze_severity, generate_slot_message
from ..models.patient import Patient
from ..models.appointment import Appointment
from ..models.soap_note import SOAPNote
from ..models.prescription import Prescription
from ..models.image import Image

class AgentOrchestrator:
    def __init__(self, db: Session, doctor_id: str):
        self.db = db
        self.doctor_id = doctor_id
        self.current_patient_id = None
        self.current_patient_name = None
        self.current_patient_data = None
        self.conversation_history = []
    
    def _format_patient_list(self, patients) -> str:
        if not patients:
            return "No patients found"
        
        lines = ["📋 Found {} patients in your clinic:".format(len(patients))]
        for p in patients:
            lines.append("• {} (MRN: {}, Age: {})".format(p['name'], p['mrn'], p['age']))
        lines.append("")
        lines.append("💡 Type a name above or click any name to select a patient.")
        return "\n".join(lines)
    
    def _display_full_soap_note(self, note, patient_name) -> str:
        """Display complete SOAP note in full with all 4 sections"""
        content = note.content if isinstance(note.content, dict) else {}
        
        subjective = content.get('subjective', {}).get('chief_complaint', 'Not documented')
        objective = content.get('objective', {}).get('physical_exam', 'Not documented')
        assessment = content.get('assessment', {}).get('diagnosis', 'Not documented')
        plan = content.get('plan', {}).get('follow_up', 'Not documented')
        
        visit_date = note.visit_date
        if visit_date:
            if isinstance(visit_date, datetime):
                date_str = visit_date.strftime("%Y-%m-%d")
            else:
                date_str = str(visit_date)[:10]
        else:
            date_str = "Unknown"
        
        result = f"📝 **SOAP Note for {patient_name}**\n"
        result += f"📅 **Date:** {date_str}\n\n"
        result += f"📋 **SUBJECTIVE (Patient's complaints):**\n{subjective}\n\n"
        result += f"🔬 **OBJECTIVE (Exam findings):**\n{objective}\n\n"
        result += f"🧠 **ASSESSMENT (Diagnosis):**\n{assessment}\n\n"
        result += f"📋 **PLAN (Treatment):**\n{plan}\n\n"
        
        return result
    
    def _get_meaningful_soap_notes(self, patient_id):
        """Get only SOAP notes with actual clinical content"""
        from ..models.soap_note import SOAPNote
        notes = self.db.query(SOAPNote).filter(
            SOAPNote.patient_id == patient_id
        ).order_by(SOAPNote.visit_date.desc()).all()
        
        meaningful = []
        for note in notes:
            content = note.content if isinstance(note.content, dict) else {}
            if content:
                subjective = content.get('subjective', {}).get('chief_complaint', '')
                if len(subjective) > 10:
                    meaningful.append(note)
            elif hasattr(note, 'assessment') and note.assessment:
                meaningful.append(note)
        
        if not meaningful and notes:
            return notes
        
        return meaningful
    
    def _get_latest_meaningful_soap_note(self, patient_id):
        meaningful = self._get_meaningful_soap_notes(patient_id)
        return meaningful[0] if meaningful else None
    
    def _format_existing_records(self, patient) -> str:
        sections = []
        
        soap_section = "\n📝 **Latest SOAP Note:**\n"
        latest_note = self._get_latest_meaningful_soap_note(self.current_patient_id)
        
        if latest_note:
            content = latest_note.content if isinstance(latest_note.content, dict) else {}
            
            # ✅ FIX: Extract the actual SOAP content properly
            subjective = content.get('subjective', {})
            objective = content.get('objective', {})
            assessment = content.get('assessment', {})
            plan = content.get('plan', {})
            
            # Extract from nested structure
            if isinstance(subjective, dict):
                chief_complaint = subjective.get('chief_complaint', 'Not documented')
            else:
                chief_complaint = str(subjective)
            
            if isinstance(objective, dict):
                physical_exam = objective.get('physical_exam', 'Not documented')
                vitals = objective.get('vitals', {})
                if vitals:
                    physical_exam = f"{physical_exam}\nVitals: BP {vitals.get('bp', 'N/A')} | HR {vitals.get('hr', 'N/A')}"
            else:
                physical_exam = str(objective)
            
            if isinstance(assessment, dict):
                diagnosis = assessment.get('diagnosis', 'Not documented')
            else:
                diagnosis = str(assessment)
            
            if isinstance(plan, dict):
                follow_up = plan.get('follow_up', 'Not documented')
            else:
                follow_up = str(plan)
            
            visit_date = latest_note.visit_date
            if visit_date:
                if isinstance(visit_date, datetime):
                    date_str = visit_date.strftime("%Y-%m-%d")
                else:
                    date_str = str(visit_date)[:10]
            else:
                date_str = "Unknown"
            
            soap_section += f"📅 **Date:** {date_str}\n\n"
            soap_section += f"📋 **SUBJECTIVE:**\n{chief_complaint}\n\n"
            soap_section += f"🔬 **OBJECTIVE:**\n{physical_exam}\n\n"
            soap_section += f"🧠 **ASSESSMENT:**\n{diagnosis}\n\n"
            soap_section += f"📋 **PLAN:**\n{follow_up}\n\n"
        else:
            soap_section += "• No SOAP notes yet. Type 'Generate SOAP note' to create one.\n"
        sections.append(soap_section)
        
        rx_section = "\n💊 **Prescriptions:**\n"
        if patient.get('prescriptions') and len(patient['prescriptions']) > 0:
            for rx in patient['prescriptions'][:3]:
                rx_section += "• {}: {} ({})\n".format(rx.get('date', 'Unknown'), rx.get('medication', 'Unknown'), rx.get('dosage', 'N/A'))
            if len(patient['prescriptions']) > 3:
                rx_section += "• + {} more prescriptions\n".format(len(patient['prescriptions']) - 3)
        else:
            rx_section += "• No prescriptions yet. Use the Rx tab to generate one.\n"
        sections.append(rx_section)
        
        img_section = "\n🩻 **Image Analyses:**\n"
        if patient.get('images') and len(patient['images']) > 0:
            for img in patient['images'][:3]:
                img_section += "• {}: {}...\n".format(img.get('date', 'Unknown'), img.get('findings', 'No findings')[:50])
            if len(patient['images']) > 3:
                img_section += "• + {} more images\n".format(len(patient['images']) - 3)
        else:
            img_section += "• No images analyzed yet. Use the Imaging tab to upload and analyze.\n"
        sections.append(img_section)
        
        apt_section = "\n📅 **Appointments:**\n"
        if patient.get('appointments') and len(patient['appointments']) > 0:
            for apt in patient['appointments'][:3]:
                severity_tag = f" [{apt.get('severity', '')}]" if apt.get('severity') else ""
                apt_section += "• {} at {} - {}{}\n".format(apt.get('date', 'Unknown'), apt.get('time', 'Unknown'), apt.get('reason', 'Follow-up'), severity_tag)
            if len(patient['appointments']) > 3:
                apt_section += "• + {} more appointments\n".format(len(patient['appointments']) - 3)
            apt_section += "\n📅 Type 'Schedule appointment' to book a new appointment.\n"
        else:
            apt_section += "• No appointments scheduled. Type 'Schedule appointment' to book one.\n"
        sections.append(apt_section)
        
        return "".join(sections)
    
    def _detect_intent_with_llm(self, message: str) -> Dict[str, Any]:
        """Use LLM to detect intent - handles ALL variations, typos, questions, and commands"""
        
        prompt = f"""
        You are an intent classifier for a medical AI assistant. Classify the doctor's message into ONE action.

        Doctor's message: "{message}"

        ACTIONS:
        1. "general" - ANY complex query, question, or multi-patient query
           Examples: 
           - "who hasn't had a SOAP note yet"
           - "show me patients without prescriptions"
           - "which patients need appointments"
           - "how to create SOAP note"
           - "what is hypertension"
           - "hello"
           - "help me with SOAP notes"
           - "show me patients with diabetes"
           - "show me patients with hypertension and diabetes"
           - "find patients with asthma"
           - "search for patients with high blood pressure"
           - "patients with multiple conditions"
           - "show me patients with similar symptoms"
           - "find similar patients for Sarah Johnson"
           - "what patients are like Michael"
           - "show me patients in same age group"
           - "show me patients above 50 with diabetes"
           - "show me female patients with hypertension"
           - "show me patients between 40 and 60"
           - "show me patients with chest pain"
           - "show me patients with fatigue"
           - "search for patients with symptoms of heart disease"
           - "show me patients with no SOAP notes"
           - "show me patients without appointments"
           - "show me patients without prescriptions"
           - "show me patients without imaging"
           - "show me patients without X-rays"
           - "show me patients without CT scans"
           - "show me patients without MRIs"
           - "show me patients without ECGs"
           - "show me patients without retinal scans"

        2. "search_patient" - ONLY if doctor wants ONE specific patient
           Examples: "show Sarah Johnson", "find Michael", "sarah"
           ⚠️ IMPORTANT: If action is "search_patient", you MUST extract the patient name.
           Return: {{"action": "search_patient", "params": {{"patient_name": "Sarah Johnson"}}}}

        3. "get_all_patients" - ONLY if doctor wants to see ALL patients (no filters)
           Examples: "show all patients", "list patients", "all my patients"

        4. "schedule_appointment" - Booking an appointment
           Examples: "schedule appointment for John", "book Michael tomorrow"

        5. "get_appointments" - Viewing appointments
           Examples: "show appointments", "list my appointments"

        6. "generate_soap_note" - Direct command to create SOAP note
           Examples: "generate SOAP note", "create SOAP note for Sarah"

        7. "get_soap_notes_status" - Asking if a SOAP note exists for current patient
           Examples: "is soap note created for her", "does she have a SOAP note"

        8. "generate_prescription" - Creating a prescription
           Examples: "write prescription", "prescribe amoxicillin"

        9. "search_images" - Searching for images by type
           Examples: 
           - "show me chest X-rays for Sarah Johnson"
           - "show me CT scans for patients"
           - "show me MRI for Michael"
           - "show me ECG results"
           - "show me retinal scans"
           - "show me all imaging for Sarah"
           - "show me abnormal imaging findings"
           - "show me normal X-rays"
           - "show me imaging from last week"
           - "show me patients with imaging"
           - "show me patients without imaging"
           - "show me brain CT scans"
           - "show me chest X-rays"
           ⚠️ IMPORTANT: Extract image_type (X-Ray, CT Scan, MRI, ECG, Retinal Scan) and patient_name if present

        IMPORTANT RULES:
        - If the message asks about MULTIPLE patients (contains "patients", "who", "which", "all without") → ALWAYS use "general"
        - If the message contains "how to", "how do i", "help me", "what is", "explain" → ALWAYS use "general"
        - If the message asks about patients without SOAP notes/prescriptions/appointments → ALWAYS use "general"
        - If the message asks about patients with specific conditions → ALWAYS use "general"
        - If the message asks about imaging (X-Ray, CT, MRI, ECG, Retinal) → use "search_images"
        - Only use "search_patient" if it's ONE specific name
        - When action is "search_patient", ALWAYS include "patient_name" in params
        - When action is "search_images", include "image_type" and "patient_name" if present

        Return ONLY JSON: {{"action": "action_name", "params": {{...}}}}
        """

        try:
            response = get_llm_response(prompt, [], max_tokens=200)
            response = response.replace('```json', '').replace('```', '').strip()
            result = json.loads(response)
            print(f"🤖 LLM Intent: {result}")
            return result
        except Exception as e:
            print(f"⚠️ LLM intent failed: {e}")
            return {"action": "general", "params": {}}
    
    def _find_patients_without_soap_notes(self) -> str:
        """Find all patients who don't have SOAP notes"""
        all_patients = self.db.query(Patient).all()
        
        patients_without_soap = []
        for patient in all_patients:
            meaningful = self._get_meaningful_soap_notes(patient.id)
            if not meaningful:
                patients_without_soap.append(patient)
        
        if not patients_without_soap:
            return "✅ All patients have SOAP notes created!"
        
        result = f"📋 Found {len(patients_without_soap)} patients without SOAP notes:\n\n"
        for patient in patients_without_soap:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += "\n💡 Type 'Generate SOAP note for [patient name]' to create one."
        return result
    
    def _find_patients_without_prescriptions(self) -> str:
        """Find all patients who don't have active prescriptions"""
        all_patients = self.db.query(Patient).all()
        
        patients_without_rx = []
        for patient in all_patients:
            prescriptions = self.db.query(Prescription).filter(
                Prescription.patient_id == patient.id,
                Prescription.status == "active"
            ).all()
            if not prescriptions:
                patients_without_rx.append(patient)
        
        if not patients_without_rx:
            return "✅ All patients have active prescriptions!"
        
        result = f"📋 Found {len(patients_without_rx)} patients without prescriptions:\n\n"
        for patient in patients_without_rx:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += "\n💡 Type 'Write prescription for [patient name]' to create one."
        return result
    
    def _find_patients_without_appointments(self) -> str:
        """Find all patients who don't have upcoming appointments"""
        all_patients = self.db.query(Patient).all()
        
        today = datetime.now().date()
        patients_without_appointments = []
        for patient in all_patients:
            appointments = self.db.query(Appointment).filter(
                Appointment.patient_id == patient.id,
                Appointment.date >= today,
                Appointment.status == "scheduled"
            ).all()
            if not appointments:
                patients_without_appointments.append(patient)
        
        if not patients_without_appointments:
            return "✅ All patients have upcoming appointments scheduled!"
        
        result = f"📋 Found {len(patients_without_appointments)} patients without upcoming appointments:\n\n"
        for patient in patients_without_appointments:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += "\n💡 Type 'Schedule appointment for [patient name]' to book one."
        return result
    
    def _find_patients_without_imaging(self, image_type: str = None) -> str:
        """Find all patients who don't have imaging (or specific type)"""
        all_patients = self.db.query(Patient).all()
        
        patients_without_imaging = []
        for patient in all_patients:
            query = self.db.query(Image).filter(Image.patient_id == patient.id)
            if image_type:
                query = query.filter(Image.image_type == image_type)
            images = query.all()
            if not images:
                patients_without_imaging.append(patient)
        
        if not patients_without_imaging:
            type_label = f"{image_type} " if image_type else ""
            return f"✅ All patients have {type_label}imaging!"
        
        type_label = f"{image_type} " if image_type else ""
        result = f"📋 Found {len(patients_without_imaging)} patients without {type_label}imaging:\n\n"
        for patient in patients_without_imaging:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += f"\n💡 Type 'Upload {image_type or 'an image'} for [patient name]' to add one."
        return result
    
    def _search_patients_by_condition(self, condition: str) -> str:
        """Find patients with a specific condition"""
        patients = self.db.query(Patient).filter(
            Patient.conditions.contains([condition])
        ).all()
        
        if not patients:
            return f"❌ No patients found with condition '{condition}'"
        
        result = f"📋 Found {len(patients)} patients with {condition}:\n\n"
        for patient in patients:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += f"\n💡 Type 'Show me [patient name]' to view their full profile."
        return result
    
    def _search_images_by_type(self, image_type: str, patient_name: str = None) -> str:
        """Search for images by type, optionally for a specific patient"""
        query = self.db.query(Image)
        
        if image_type:
            query = query.filter(Image.image_type.ilike(f"%{image_type}%"))
        
        if patient_name:
            patients = self.db.query(Patient).filter(Patient.name.ilike(f"%{patient_name}%")).all()
            if patients:
                patient_ids = [p.id for p in patients]
                query = query.filter(Image.patient_id.in_(patient_ids))
        
        images = query.order_by(Image.uploaded_at.desc()).all()
        
        if not images:
            patient_text = f" for {patient_name}" if patient_name else ""
            return f"❌ No {image_type or 'images'} found{patient_text}."
        
        result = f"📋 Found {len(images)} {image_type or 'image'}(s):\n\n"
        for img in images:
            patient = self.db.query(Patient).filter(Patient.id == img.patient_id).first()
            result += f"• {img.image_type} for {patient.name if patient else 'Unknown'}\n"
            result += f"  📅 {img.uploaded_at.strftime('%Y-%m-%d') if img.uploaded_at else 'Unknown date'}\n"
            result += f"  🔍 Findings: {img.analysis[:100] if img.analysis else 'No analysis'}\n"
            if img.confidence:
                result += f"  📊 Confidence: {img.confidence:.2%}\n"
            result += "\n"
        
        result += f"💡 Type 'Show me [patient name]' to view their full profile."
        return result
    
    def _search_combined(self, condition: str = None, medication: str = None, 
                         age_min: int = None, age_max: int = None, 
                         gender: str = None, has_soap: bool = None,
                         has_appointment: bool = None, has_prescription: bool = None,
                         has_imaging: bool = None, image_type: str = None) -> str:
        """Combined search with multiple filters"""
        
        query = self.db.query(Patient)
        
        if condition:
            query = query.filter(Patient.conditions.contains([condition]))
        
        if medication:
            query = query.filter(Patient.medications.contains([medication]))
        
        if age_min:
            query = query.filter(Patient.age >= age_min)
        
        if age_max:
            query = query.filter(Patient.age <= age_max)
        
        if gender:
            query = query.filter(Patient.gender == gender)
        
        patients = query.all()
        
        # Apply additional filters manually
        filtered_patients = []
        for patient in patients:
            # Filter by SOAP status
            if has_soap is not None:
                soap_notes = self.db.query(SOAPNote).filter(SOAPNote.patient_id == patient.id).all()
                if has_soap and not soap_notes:
                    continue
                if not has_soap and soap_notes:
                    continue
            
            # Filter by appointment status
            if has_appointment is not None:
                today = datetime.now().date()
                appointments = self.db.query(Appointment).filter(
                    Appointment.patient_id == patient.id,
                    Appointment.date >= today,
                    Appointment.status == "scheduled"
                ).all()
                if has_appointment and not appointments:
                    continue
                if not has_appointment and appointments:
                    continue
            
            # Filter by prescription status
            if has_prescription is not None:
                prescriptions = self.db.query(Prescription).filter(
                    Prescription.patient_id == patient.id,
                    Prescription.status == "active"
                ).all()
                if has_prescription and not prescriptions:
                    continue
                if not has_prescription and prescriptions:
                    continue
            
            # Filter by imaging status
            if has_imaging is not None or image_type:
                img_query = self.db.query(Image).filter(Image.patient_id == patient.id)
                if image_type:
                    img_query = img_query.filter(Image.image_type.ilike(f"%{image_type}%"))
                images = img_query.all()
                if has_imaging and not images:
                    continue
                if not has_imaging and images:
                    continue
            
            filtered_patients.append(patient)
        
        if not filtered_patients:
            return "❌ No patients match the specified criteria."
        
        result = f"📋 Found {len(filtered_patients)} patients matching your criteria:\n\n"
        for patient in filtered_patients:
            result += f"• {patient.name} (MRN: {patient.mrn}, Age: {patient.age})\n"
        
        result += f"\n💡 Type 'Show me [patient name]' to view their full profile."
        return result
    
    def _handle_complex_query(self, message: str) -> Optional[str]:
        """Handle complex queries that require database checks"""
        message_lower = message.lower().strip()
        
        # ✅ IMPORTANT: Skip if this is a SOAP generation request
        if "generate soap" in message_lower or "create soap" in message_lower or "soap note for" in message_lower:
            return None
        
        # Check for "without SOAP note" type queries
        if "soap note" in message_lower and ("without" in message_lower or "no" in message_lower or "haven't" in message_lower or "hasn't" in message_lower or "not created" in message_lower or "missing" in message_lower):
            return self._find_patients_without_soap_notes()
        
        # Check for "without prescription" type queries
        if "prescription" in message_lower and ("without" in message_lower or "no" in message_lower or "haven't" in message_lower or "missing" in message_lower):
            return self._find_patients_without_prescriptions()
        
        # Check for "without appointment" type queries
        if "appointment" in message_lower and ("without" in message_lower or "no" in message_lower or "need follow-up" in message_lower or "missing" in message_lower):
            return self._find_patients_without_appointments()
        
        # Check for "without imaging" type queries
        if "imaging" in message_lower or "image" in message_lower:
            if "without" in message_lower or "no" in message_lower:
                # Check for specific image type
                image_types = ["x-ray", "ct scan", "mri", "ecg", "retinal"]
                for img_type in image_types:
                    if img_type in message_lower:
                        return self._find_patients_without_imaging(img_type.title())
                return self._find_patients_without_imaging()
        
        # Check for "with condition" type queries
        if "with" in message_lower and any(cond in message_lower for cond in ["diabetes", "hypertension", "asthma", "high cholesterol", "heart disease", "cancer", "copd", "arthritis"]):
            conditions = ["diabetes", "hypertension", "asthma", "high cholesterol", "heart disease", "cancer", "copd", "arthritis"]
            for condition in conditions:
                if condition in message_lower:
                    return self._search_patients_by_condition(condition.title())
        
        # Check for "patients with no" type queries
        if "patients" in message_lower and "no" in message_lower:
            if "soap" in message_lower or "note" in message_lower:
                return self._find_patients_without_soap_notes()
            if "prescription" in message_lower or "rx" in message_lower:
                return self._find_patients_without_prescriptions()
            if "appointment" in message_lower:
                return self._find_patients_without_appointments()
            if "imaging" in message_lower or "image" in message_lower or "x-ray" in message_lower or "ct" in message_lower:
                image_types = ["x-ray", "ct scan", "mri", "ecg", "retinal"]
                for img_type in image_types:
                    if img_type in message_lower:
                        return self._find_patients_without_imaging(img_type.title())
                return self._find_patients_without_imaging()
        
        return None
    
    def _extract_patient_name_from_message(self, message: str) -> str:
        """Extract patient name from message using regex patterns"""
        patterns = [
            r'(?:Show me|Search for|Find|get|select)\s+([A-Za-z\s]+)',
            r'patient\s+([A-Za-z\s]+)',
            r'^(?:show|find|get)\s+([A-Za-z\s]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                name = re.sub(r'\s+(?:please|now|thanks|thank you)$', '', name, flags=re.IGNORECASE)
                if name and len(name) > 1:
                    return name
        
        message_clean = message.strip()
        if re.match(r'^[A-Za-z\s]{2,30}$', message_clean):
            return message_clean
        
        return ""
    
    def _extract_image_type_from_message(self, message: str) -> str:
        """Extract image type from message"""
        message_lower = message.lower()
        image_types = {
            "x-ray": "X-Ray",
            "xray": "X-Ray",
            "ct scan": "CT Scan",
            "ct": "CT Scan",
            "mri": "MRI",
            "ecg": "ECG",
            "retinal": "Retinal Scan",
            "retina": "Retinal Scan",
            "imaging": "All"
        }
        
        for key, value in image_types.items():
            if key in message_lower:
                return value
        
        return None
    
    def process_message(self, user_message: str, image_base64: str = None) -> Dict[str, Any]:
        self.conversation_history.append({"role": "user", "content": user_message})
        
        # FIRST: Check for complex queries BEFORE LLM intent detection
        complex_response = self._handle_complex_query(user_message)
        if complex_response:
            response_text = complex_response
            self.conversation_history.append({"role": "assistant", "content": response_text})
            return {
                "reply": response_text,
                "patient": None,
                "tool_calls": ["complex_query"],
                "session_id": None
            }
        
        # Use LLM for intent detection
        intent = self._detect_intent_with_llm(user_message)
        print(f"🔍 Detected intent: {intent}")
        
        result = None
        patient_data = None
        
        if intent["action"] == "search_patient":
            name = intent.get("params", {}).get("patient_name", "")
            
            if not name:
                name = self._extract_patient_name_from_message(user_message)
                print(f"🔍 Extracted patient name from message: {name}")
            
            if not name:
                name = user_message.strip()
                print(f"🔍 Using entire message as patient name: {name}")
            
            print(f"🔍 Searching for patient: {name}")
            result = search_patient(name, self.db)
            
            if result.get("found"):
                self.current_patient_id = result["patient"]["id"]
                self.current_patient_name = result["patient"]["name"]
                self.current_patient_data = result["patient"]
                patient_data = result["patient"]
                
                patient = result["patient"]
                
                response_text = "✅ **Patient Selected: {}**\n\n".format(patient['name'])
                response_text += "📋 **Demographics:** MRN: {} | Age: {} | Gender: {}\n\n".format(
                    patient['mrn'], patient['age'], patient['gender']
                )
                response_text += "🩺 **Medical History:** Allergies: {} | Conditions: {}\n\n".format(
                    ', '.join(patient.get('allergies', [])) if patient.get('allergies') else 'None',
                    ', '.join(patient.get('conditions', [])) if patient.get('conditions') else 'None'
                )
                response_text += "💊 **Current Medications:** {}\n\n".format(
                    ', '.join(patient.get('medications', [])) if patient.get('medications') else 'None'
                )
                
                existing_records = self._format_existing_records(patient)
                response_text += existing_records
                response_text += "\n✅ Tools are now active for {}.".format(patient['name'])
            else:
                vector_results = chroma_service.search_patients(name, top_k=5)
                if vector_results:
                    similar_list = []
                    for v_result in vector_results:
                        patient = self.db.query(Patient).filter(Patient.id == v_result["patient_id"]).first()
                        if patient:
                            similar_list.append("• {} (MRN: {}, Age: {})".format(patient.name, patient.mrn, patient.age))
                    
                    response_text = "❌ No patient found matching '{}'.\n\n📋 Did you mean one of these patients?\n\n".format(name)
                    response_text += "\n".join(similar_list)
                    response_text += "\n\n💡 Type the full name exactly as shown."
                else:
                    response_text = "❌ No patient found matching '{}'.".format(name)
                
        elif intent["action"] == "get_all_patients":
            result = get_all_patients(self.db)
            if result["patients"]:
                response_text = self._format_patient_list(result["patients"])
            else:
                response_text = "No patients found in your clinic"
        
        elif intent["action"] == "search_images":
            image_type = intent.get("params", {}).get("image_type")
            patient_name = intent.get("params", {}).get("patient_name")
            
            if not image_type:
                image_type = self._extract_image_type_from_message(user_message)
            
            if image_type == "All":
                image_type = None
            
            response_text = self._search_images_by_type(image_type, patient_name)
        
        elif intent["action"] == "get_soap_notes_status":
            if self.current_patient_id:
                meaningful = self._get_meaningful_soap_notes(self.current_patient_id)
                
                if meaningful and len(meaningful) > 0:
                    response_text = f"✅ Yes, {len(meaningful)} SOAP note(s) have been created for {self.current_patient_name}."
                    latest = meaningful[0]
                    content = latest.content if isinstance(latest.content, dict) else {}
                    diagnosis = content.get('assessment', {}).get('diagnosis', 'No diagnosis')
                    visit_date = latest.visit_date
                    if visit_date:
                        if isinstance(visit_date, datetime):
                            date_str = visit_date.strftime("%Y-%m-%d")
                        else:
                            date_str = str(visit_date)[:10]
                    else:
                        date_str = "Unknown"
                    response_text += f"\n\n📅 Latest SOAP note from {date_str}:\n🧠 Diagnosis: {diagnosis}"
                    response_text += f"\n\n💡 Type 'Show SOAP note' to view the full note."
                else:
                    response_text = f"❌ No SOAP notes have been created for {self.current_patient_name} yet.\n\n💡 Type 'Generate SOAP note' to create one."
            else:
                response_text = "❌ Please select a patient first. Type 'Show me [patient name]'"
        
        elif intent["action"] == "schedule_appointment":
            patient_name = intent.get("params", {}).get("patient_name")
            if not patient_name and self.current_patient_name:
                patient_name = self.current_patient_name
            
            if not patient_name:
                response_text = "❌ Please specify a patient name. Example: 'Schedule appointment for Michael Chen tomorrow at 2 PM'"
            else:
                result = schedule_appointment(
                    patient_name,
                    intent.get("params", {}).get("weeks_from_now", 0),
                    intent.get("params", {}).get("time", "09:00 AM"),
                    user_message,
                    self.db,
                    self.doctor_id
                )
                response_text = result.get("message", "Appointment scheduled" if result.get("success") else "Failed to schedule")
                
        elif intent["action"] == "get_appointments":
            result = get_appointments(intent.get("params", {}).get("patient_name"), self.db, self.doctor_id)
            if result["appointments"]:
                apt_list = []
                for a in result["appointments"]:
                    apt_list.append("• {} - {} at {} - {}".format(a['patient_name'], a['date'], a['time'], a['reason']))
                response_text = "📅 Found {} appointments:\n{}".format(result['count'], "\n".join(apt_list))
            else:
                response_text = "No appointments found"
                
        elif intent["action"] == "generate_soap_note":
            if self.current_patient_id:
                result = generate_soap_note(
                    self.current_patient_id,
                    self.doctor_id,
                    user_message,
                    self.db
                )
                if result.get("success"):
                    response_text = result.get("response_text", "SOAP note generated")
                else:
                    response_text = "Failed to generate SOAP note"
            else:
                response_text = "❌ Please select a patient first. Type: 'Show me patient [name]'"
        
        elif intent["action"] == "generate_prescription":
            if self.current_patient_id:
                medication = intent.get("params", {}).get("medication", "Unknown")
                
                result = generate_prescription(
                    patient_id=self.current_patient_id,
                    doctor_id=self.doctor_id,
                    medication=medication,
                    dosage="500mg",
                    frequency="Once daily",
                    duration="7 days",
                    instructions="Take as directed",
                    db=self.db
                )
                if result.get("success"):
                    rx = result["prescription"]
                    response_text = "💊 Prescription generated for {}:\n\n**Medication:** {}\n**Dosage:** {}\n**Frequency:** {}\n**Duration:** {}\n**Instructions:** {}".format(
                        rx['patient_name'], rx['medication'], rx['dosage'], rx['frequency'], rx['duration'], rx['instructions']
                    )
                else:
                    response_text = "Failed to generate prescription"
            else:
                response_text = "❌ Please select a patient first. Type: 'Show me patient [name]'"
        
        elif intent["action"] == "get_prescriptions":
            patient_name = intent.get("params", {}).get("patient_name")
            target_patient_id = self.current_patient_id
            
            if patient_name:
                result = search_patient(patient_name, self.db)
                if result.get("found"):
                    target_patient_id = result["patient"]["id"]
                else:
                    response_text = "❌ Patient '{}' not found".format(patient_name)
                    return {
                        "reply": response_text,
                        "patient": None,
                        "tool_calls": ["get_prescriptions"],
                        "session_id": None
                    }
            elif not target_patient_id:
                response_text = "❌ Please select a patient first. Type: 'Show me patient [name]'"
                return {
                    "reply": response_text,
                    "patient": None,
                    "tool_calls": ["get_prescriptions"],
                    "session_id": None
                }
            
            result = get_prescriptions(target_patient_id, self.db)
            if result.get("prescriptions") and len(result["prescriptions"]) > 0:
                rx_list = []
                for rx in result["prescriptions"]:
                    content = rx["content"]
                    rx_list.append("• {} - {} - Prescribed: {}".format(content['medication']['name'], content['medication']['dosage'], rx['prescribed_date'][:10]))
                
                response_text = "💊 **Prescriptions:**\n{}".format("\n".join(rx_list))
            else:
                response_text = "No prescriptions found"
                
        else:
            response_text = get_llm_response(user_message, self.conversation_history)
        
        self.conversation_history.append({"role": "assistant", "content": response_text})
        
        return {
            "reply": response_text,
            "patient": patient_data if patient_data else self.current_patient_data,
            "tool_calls": [intent["action"]] if intent["action"] != "general" else [],
            "session_id": None
        }
import re
from typing import Dict, Any
from sqlalchemy.orm import Session
from ..services.llm_service import get_llm_response
from ..services.chroma_service import chroma_service
from ..services.redis_service import redis_service
from ..tools.patient_tools import search_patient, get_all_patients
from ..tools.appointment_tools import schedule_appointment, get_appointments
from ..tools.soap_tools import generate_soap_note
from ..tools.prescription_tools import generate_prescription, get_prescriptions
from ..tools.similar_patients_tool import find_similar_patients
from ..models.patient import Patient

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
    
    def _format_existing_records(self, patient) -> str:
        """Format existing SOAP notes, prescriptions, images, and appointments"""
        sections = []
        
        # SOAP Notes section
        soap_section = "\n📝 **SOAP Notes:**\n"
        if patient.get('soap_notes') and len(patient['soap_notes']) > 0:
            for note in patient['soap_notes'][:3]:
                soap_section += "• {}: {}\n".format(note['date'], note['chief_complaint'])
            if len(patient['soap_notes']) > 3:
                soap_section += "• + {} more SOAP notes\n".format(len(patient['soap_notes']) - 3)
        else:
            soap_section += "• No SOAP notes yet. Type 'Generate SOAP note' to create one.\n"
        sections.append(soap_section)
        
        # Prescriptions section
        rx_section = "\n💊 **Prescriptions:**\n"
        if patient.get('prescriptions') and len(patient['prescriptions']) > 0:
            for rx in patient['prescriptions'][:3]:
                rx_section += "• {}: {} ({})\n".format(rx['date'], rx['medication'], rx['dosage'])
            if len(patient['prescriptions']) > 3:
                rx_section += "• + {} more prescriptions\n".format(len(patient['prescriptions']) - 3)
        else:
            rx_section += "• No prescriptions yet. Use the Rx tab to generate one.\n"
        sections.append(rx_section)
        
        # Image Analyses section
        img_section = "\n🩻 **Image Analyses:**\n"
        if patient.get('images') and len(patient['images']) > 0:
            for img in patient['images'][:3]:
                img_section += "• {}: {}...\n".format(img['date'], img['findings'][:50])
            if len(patient['images']) > 3:
                img_section += "• + {} more images\n".format(len(patient['images']) - 3)
        else:
            img_section += "• No images analyzed yet. Use the Imaging tab to upload and analyze.\n"
        sections.append(img_section)
        
        # Appointments section
        apt_section = "\n📅 **Appointments:**\n"
        if patient.get('appointments') and len(patient['appointments']) > 0:
            for apt in patient['appointments'][:3]:
                apt_section += "• {} at {} - {}\n".format(apt['date'], apt['time'], apt.get('reason', 'Follow-up'))
            if len(patient['appointments']) > 3:
                apt_section += "• + {} more appointments\n".format(len(patient['appointments']) - 3)
            apt_section += "\n📅 Type 'Schedule appointment' to book a new appointment.\n"
        else:
            apt_section += "• No appointments scheduled. Type 'Schedule appointment' to book one.\n"
        sections.append(apt_section)
        
        return "".join(sections)
    
    def process_message(self, user_message: str, image_base64: str = None) -> Dict[str, Any]:
        print("=" * 50)
        print(f"📨 PROCESSING: {user_message}")
        print("=" * 50)
        
        self.conversation_history.append({"role": "user", "content": user_message})
        
        intent = self._detect_intent(user_message)
        print(f"🔍 Intent: {intent}")
        
        result = None
        patient_data = None
        
        if intent["action"] == "search_patient":
            name = intent.get("patient_name", "")
            print(f"🔎 Searching for: {name}")
            
            result = search_patient(name, self.db)
            print(f"📊 Search result found: {result.get('found')}")
            
            if result.get("found"):
                self.current_patient_id = result["patient"]["id"]
                self.current_patient_name = result["patient"]["name"]
                self.current_patient_data = result["patient"]
                patient_data = result["patient"]
                
                patient = result["patient"]
                print(f"✅ Patient keys: {list(patient.keys())}")
                print(f"📝 soap_notes: {len(patient.get('soap_notes', []))}")
                print(f"💊 prescriptions: {len(patient.get('prescriptions', []))}")
                print(f"🩻 images: {len(patient.get('images', []))}")
                print(f"📅 appointments: {len(patient.get('appointments', []))}")
                
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
                
                # ADD EXISTING RECORDS
                print("🔍 CALLING _format_existing_records...")
                existing_records = self._format_existing_records(patient)
                print(f"📋 Existing records length: {len(existing_records)}")
                response_text += existing_records
                
                response_text += "\n✅ Tools are now active for {}.".format(patient['name'])
            else:
                response_text = "❌ Patient not found"
                
        elif intent["action"] == "get_all_patients":
            result = get_all_patients(self.db)
            if result["patients"]:
                response_text = self._format_patient_list(result["patients"])
            else:
                response_text = "No patients found"
                
        elif intent["action"] == "schedule_appointment":
            patient_name = intent.get("patient_name")
            if not patient_name and self.current_patient_name:
                patient_name = self.current_patient_name
            
            if not patient_name:
                response_text = "❌ Please specify a patient name."
            else:
                result = schedule_appointment(
                    patient_name,
                    intent.get("weeks_from_now", 0),
                    intent.get("time", "09:00 AM"),
                    intent.get("reason", "General consultation"),
                    self.db,
                    self.doctor_id
                )
                response_text = result.get("message", "Appointment scheduled")
                
        elif intent["action"] == "get_appointments":
            result = get_appointments(intent.get("patient_name"), self.db, self.doctor_id)
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
                    str(self.conversation_history),
                    self.db
                )
                if result.get("success"):
                    note = result["soap_note"]
                    content = note["content"]
                    response_text = "📝 SOAP Note generated for {}:\n\n**Subjective:** {}\n\n**Objective:** {}\n\n**Assessment:** {}\n\n**Plan:** {}".format(
                        note['patient_name'],
                        content['subjective']['chief_complaint'],
                        content['objective']['vitals']['bp'],
                        content['assessment']['diagnosis'],
                        content['plan']['follow_up']
                    )
                else:
                    response_text = "Failed to generate SOAP note"
            else:
                response_text = "❌ Please select a patient first"
        
        elif intent["action"] == "generate_prescription":
            if self.current_patient_id:
                result = generate_prescription(
                    patient_id=self.current_patient_id,
                    doctor_id=self.doctor_id,
                    medication=intent.get("medication", "Unknown"),
                    dosage=intent.get("dosage", "500mg"),
                    frequency=intent.get("frequency", "Once daily"),
                    duration=intent.get("duration", "7 days"),
                    instructions=intent.get("instructions", "Take as directed"),
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
                response_text = "❌ Please select a patient first"
                
        else:
            response_text = get_llm_response(user_message, self.conversation_history)
        
        print(f"📤 Response length: {len(response_text)}")
        print("=" * 50)
        
        self.conversation_history.append({"role": "assistant", "content": response_text})
        
        return {
            "reply": response_text,
            "patient": patient_data if patient_data else self.current_patient_data,
            "tool_calls": [intent["action"]] if intent["action"] != "general" else [],
            "session_id": None
        }
    
    def _detect_intent(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower().strip()
        
        if "all patients" in message_lower or "show all patients" in message_lower or "list patients" in message_lower:
            return {"action": "get_all_patients"}
        
        if "show me" in message_lower or "find" in message_lower:
            name_match = re.search(r'(?:show me|find)\s+(?:patient\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
            if name_match:
                return {"action": "search_patient", "patient_name": name_match.group(1).title()}
        
        known_patients = ['sarah', 'michael', 'emily', 'james', 'maria', 'robert']
        for name in known_patients:
            if message_lower == name:
                return {"action": "search_patient", "patient_name": name.title()}
        
        if "appointment" in message_lower:
            if "schedule" in message_lower or "book" in message_lower:
                name_match = re.search(r'(?:for|with)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
                patient_name = name_match.group(1).title() if name_match else None
                weeks = 1 if "next week" in message_lower else 0
                return {
                    "action": "schedule_appointment",
                    "patient_name": patient_name,
                    "weeks_from_now": weeks,
                    "time": "09:00 AM",
                    "reason": message
                }
            else:
                return {"action": "get_appointments"}
        
        if "soap" in message_lower:
            return {"action": "generate_soap_note"}
        
        if "prescription" in message_lower or "rx" in message_lower:
            return {"action": "generate_prescription"}
        
        return {"action": "general"}

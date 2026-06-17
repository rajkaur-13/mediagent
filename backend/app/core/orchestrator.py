import re
from typing import Dict, Any
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
        notes = self.db.query(SOAPNote).filter(
            SOAPNote.patient_id == patient_id
        ).order_by(SOAPNote.visit_date.desc()).all()
        
        meaningful = []
        for note in notes:
            content = note.content if isinstance(note.content, dict) else {}
            subjective = content.get('subjective', {}).get('chief_complaint', '')
            # Only keep notes with real content (length > 100 chars and not the default text)
            if len(subjective) > 100 and 'Patient' not in subjective[:30]:
                meaningful.append(note)
        
        return meaningful
    
    def _get_latest_meaningful_soap_note(self, patient_id):
        meaningful = self._get_meaningful_soap_notes(patient_id)
        return meaningful[0] if meaningful else None
    
    def _format_existing_records(self, patient) -> str:
        sections = []
        
        # Show the LATEST FULL SOAP note only
        soap_section = "\n📝 **Latest SOAP Note:**\n"
        latest_note = self._get_latest_meaningful_soap_note(self.current_patient_id)
        
        if latest_note:
            content = latest_note.content if isinstance(latest_note.content, dict) else {}
            subjective = content.get('subjective', {}).get('chief_complaint', 'Not documented')
            objective = content.get('objective', {}).get('physical_exam', 'Not documented')
            assessment = content.get('assessment', {}).get('diagnosis', 'Not documented')
            plan = content.get('plan', {}).get('follow_up', 'Not documented')
            
            visit_date = latest_note.visit_date
            if visit_date:
                if isinstance(visit_date, datetime):
                    date_str = visit_date.strftime("%Y-%m-%d")
                else:
                    date_str = str(visit_date)[:10]
            else:
                date_str = "Unknown"
            
            soap_section += f"📅 **Date:** {date_str}\n\n"
            soap_section += f"📋 **SUBJECTIVE:**\n{subjective}\n\n"
            soap_section += f"🔬 **OBJECTIVE:**\n{objective}\n\n"
            soap_section += f"🧠 **ASSESSMENT:**\n{assessment}\n\n"
            soap_section += f"📋 **PLAN:**\n{plan}\n\n"
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
    
    def process_message(self, user_message: str, image_base64: str = None) -> Dict[str, Any]:
        self.conversation_history.append({"role": "user", "content": user_message})
        
        intent = self._detect_intent(user_message)
        print(f"🔍 Detected intent: {intent}")
        
        result = None
        patient_data = None
        
        if intent["action"] == "search_patient":
            name = intent.get("patient_name", "")
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
        
        elif intent["action"] == "schedule_appointment":
            name_match = re.search(r'(?:for|with)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', user_message, re.IGNORECASE)
            patient_name = name_match.group(1).title() if name_match else self.current_patient_name
            
            if not patient_name:
                response_text = "❌ Please specify a patient name. Example: 'Schedule appointment for Michael Chen tomorrow at 2 PM'"
            else:
                result = schedule_appointment(
                    patient_name,
                    0,
                    "09:00 AM",
                    user_message,
                    self.db,
                    self.doctor_id
                )
                response_text = result.get("message", "Appointment scheduled" if result.get("success") else "Failed to schedule")
                
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
                med_match = re.search(r'(?:prescribe|for)\s+(\w+(?:\s+\w+)?)', user_message, re.IGNORECASE)
                medication = med_match.group(1).title() if med_match else "Unknown"
                
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
            patient_name = intent.get("patient_name")
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
    
    def _detect_intent(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower().strip()
        
        if re.search(r'(?:generate|create|make|new).*soap note', message_lower):
            return {"action": "generate_soap_note"}
        
        if "all patients" in message_lower or "show all patients" in message_lower or "list patients" in message_lower:
            return {"action": "get_all_patients"}
        
        if "show me" in message_lower or "find" in message_lower:
            name_match = re.search(r'(?:show me|find)\s+(?:patient\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
            if name_match:
                return {"action": "search_patient", "patient_name": name_match.group(1).title()}
        
        known_patients = ['sarah', 'michael', 'emily', 'james', 'maria', 'robert', 'john']
        for name in known_patients:
            if message_lower == name or message_lower.startswith(name):
                return {"action": "search_patient", "patient_name": name.title()}
        
        if "soap" in message_lower:
            return {"action": "generate_soap_note"}
        
        if "prescription" in message_lower or "rx" in message_lower or "prescribe" in message_lower:
            return {"action": "generate_prescription"}
        
        if "appointment" in message_lower:
            if "schedule" in message_lower or "book" in message_lower or "make" in message_lower:
                return {"action": "schedule_appointment"}
            else:
                return {"action": "get_appointments"}
        
        return {"action": "general"}

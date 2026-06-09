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
    
    def process_message(self, user_message: str, image_base64: str = None) -> Dict[str, Any]:
        self.conversation_history.append({"role": "user", "content": user_message})
        
        intent = self._detect_intent(user_message)
        print(f"🔍 Detected intent: {intent}")
        
        result = None
        patient_data = None
        
        if intent["action"] == "search_patient":
            name = intent.get("patient_name", "")
            
            result = search_patient(name, self.db)
            
            if not result.get("found"):
                # Try vector search for similar names
                print(f"🔍 No exact match for '{name}', searching similar patients...")
                vector_results = chroma_service.search_patients(name, top_k=5)
                
                if vector_results:
                    similar_list = []
                    for v_result in vector_results:
                        patient = self.db.query(Patient).filter(Patient.id == v_result["patient_id"]).first()
                        if patient:
                            similar_list.append(
                                f"• **{patient.name}** (MRN: {patient.mrn}, Age: {patient.age}, Phone: {patient.phone or 'N/A'})"
                            )
                    
                    response_text = f"❌ No patient found matching '{name}'.\n\n📋 **Did you mean one of these patients?**\n\n"
                    response_text += "\n".join(similar_list)
                    response_text += "\n\n💡 Type 'Show me [full name]' to select a patient."
                    
                    return {
                        "reply": response_text,
                        "patient": None,
                        "tool_calls": ["search_patient"],
                        "session_id": None
                    }
                else:
                    response_text = f"❌ No patient found matching '{name}'. Please check the spelling."
            else:
                # Set as current patient
                self.current_patient_id = result["patient"]["id"]
                self.current_patient_name = result["patient"]["name"]
                self.current_patient_data = result["patient"]
                patient_data = result["patient"]
                
                patient = result["patient"]
                
                response_text = f"✅ **Patient Selected: {patient['name']}**\n\n"
                response_text += f"📋 **Demographics:**\n- MRN: {patient['mrn']}\n- Age: {patient['age']}\n- Gender: {patient['gender']}\n- Phone: {patient.get('phone', 'N/A')}\n\n"
                response_text += f"🩺 **Medical History:**\n- Allergies: {', '.join(patient.get('allergies', [])) if patient.get('allergies') else 'None'}\n- Conditions: {', '.join(patient.get('conditions', [])) if patient.get('conditions') else 'None'}\n- Medications: {', '.join(patient.get('medications', [])) if patient.get('medications') else 'None'}"
                
                response_text += f"\n\n✅ Tools are now active for {patient['name']}. You can create SOAP notes, prescriptions, or upload images."
                
                redis_service.set_patient_search(name, result)
                
        elif intent["action"] == "get_all_patients":
            result = get_all_patients(self.db)
            if result["patients"]:
                patient_list = "\n".join([f"• {p['name']} (MRN: {p['mrn']}, Age: {p['age']})" for p in result["patients"]])
                response_text = f"📋 Found {result['count']} patients in your clinic:\n{patient_list}\n\n💡 Type 'Show me [patient name]' to select a patient."
            else:
                response_text = "No patients found in your clinic"
                
        elif intent["action"] == "schedule_appointment":
            patient_name = intent.get("patient_name")
            if not patient_name and self.current_patient_name:
                patient_name = self.current_patient_name
            
            if not patient_name:
                response_text = "❌ Please specify a patient name. Example: 'Schedule appointment for Michael Chen tomorrow at 2 PM'"
            else:
                result = schedule_appointment(
                    patient_name,
                    intent.get("weeks_from_now", 0),
                    intent.get("time", "09:00 AM"),
                    intent.get("reason", "General consultation"),
                    self.db,
                    self.doctor_id
                )
                response_text = result.get("message", "Appointment scheduled" if result.get("success") else "Failed to schedule")
                
        elif intent["action"] == "get_appointments":
            result = get_appointments(intent.get("patient_name"), self.db, self.doctor_id)
            if result["appointments"]:
                apt_list = "\n".join([f"• {a['patient_name']} - {a['date']} at {a['time']} - {a['reason']}" for a in result["appointments"]])
                response_text = f"📅 Found {result['count']} appointments:\n{apt_list}"
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
                    response_text = f"📝 SOAP Note generated for {note['patient_name']}:\n\n**Subjective:** {content['subjective']['chief_complaint']}\n\n**Objective:** {content['objective']['vitals']['bp']}\n\n**Assessment:** {content['assessment']['diagnosis']}\n\n**Plan:** {content['plan']['follow_up']}"
                else:
                    response_text = "Failed to generate SOAP note"
            else:
                response_text = "❌ Please select a patient first. Type: 'Show me [patient name]'"
        
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
                    response_text = f"💊 Prescription generated for {rx['patient_name']}:\n\n**Medication:** {rx['medication']}\n**Dosage:** {rx['dosage']}\n**Frequency:** {rx['frequency']}\n**Duration:** {rx['duration']}\n**Instructions:** {rx['instructions']}"
                else:
                    response_text = "Failed to generate prescription"
            else:
                response_text = "❌ Please select a patient first. Type: 'Show me [patient name]'"
        
        elif intent["action"] == "get_prescriptions":
            patient_name = intent.get("patient_name")
            target_patient_id = self.current_patient_id
            
            if patient_name:
                result = search_patient(patient_name, self.db)
                if result.get("found"):
                    target_patient_id = result["patient"]["id"]
            elif not target_patient_id:
                response_text = "❌ Please select a patient first. Type: 'Show me [patient name]'"
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
                    rx_list.append(f"• **{content['medication']['name']}** - {content['medication']['dosage']} - Prescribed: {rx['prescribed_date'][:10]}")
                
                response_text = f"💊 Prescriptions:\n\n" + "\n".join(rx_list)
            else:
                response_text = "No prescriptions found"
                
        else:
            response_text = get_llm_response(user_message, self.conversation_history)
        
        self.conversation_history.append({"role": "assistant", "content": response_text})
        
        return {
            "reply": response_text,
            "patient": patient_data,
            "tool_calls": [intent["action"]] if intent["action"] != "general" else [],
            "session_id": None
        }
    
    def _detect_intent(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower().strip()
        
        # First check: Is this a patient name without "show me"?
        # List of known patient names from your database
        known_patients = ['sarah', 'johnson', 'michael', 'chen', 'emily', 'rodriguez', 'james', 'williams', 'maria', 'garcia', 'robert']
        
        # If message is just a name (like "emily" or "sarah") - treat as patient search
        if message_lower.strip() in known_patients or any(p in message_lower for p in known_patients):
            # Extract the name
            for name in known_patients:
                if name in message_lower:
                    return {"action": "search_patient", "patient_name": name.title()}
        
        # Check for "show me" or "select" commands
        if re.search(r'(?:show me|select|find|get|search for)\s+(?:patient\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower):
            name_match = re.search(r'(?:show me|select|find|get|search for)\s+(?:patient\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
            if name_match:
                return {"action": "search_patient", "patient_name": name_match.group(1).title()}
        
        # Check for "all patients"
        if re.search(r'(?:all|list|show).*patients', message_lower):
            return {"action": "get_all_patients"}
        
        # Check for appointments
        if "appointment" in message_lower:
            if "schedule" in message_lower or "book" in message_lower:
                name_match = re.search(r'(?:for|with)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
                patient_name = name_match.group(1).title() if name_match else None
                
                weeks = 1 if "next week" in message_lower else 0
                
                time_match = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)?', message_lower)
                time_str = "09:00 AM"
                if time_match:
                    hour = int(time_match.group(1))
                    minute = int(time_match.group(2)) if time_match.group(2) else 0
                    ampm = time_match.group(3) if time_match.group(3) else ("am" if hour < 12 else "pm")
                    time_str = f"{hour}:{minute:02d} {ampm.upper()}"
                
                return {
                    "action": "schedule_appointment",
                    "patient_name": patient_name,
                    "weeks_from_now": weeks,
                    "time": time_str,
                    "reason": message
                }
            else:
                return {"action": "get_appointments"}
        
        # Check for SOAP note
        if "soap" in message_lower:
            return {"action": "generate_soap_note"}
        
        # Check for prescription
        if "prescription" in message_lower or "rx" in message_lower or "prescribe" in message_lower:
            if "show" in message_lower or "view" in message_lower:
                return {"action": "get_prescriptions"}
            else:
                return {"action": "generate_prescription"}
        
        return {"action": "general"}

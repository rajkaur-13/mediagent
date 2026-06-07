import re
from typing import Dict, Any
from sqlalchemy.orm import Session
from ..services.llm_service import get_llm_response
from ..services.chroma_service import chroma_service
from ..services.redis_service import redis_service
from ..tools.patient_tools import search_patient, get_all_patients
from ..tools.appointment_tools import schedule_appointment, get_appointments
from ..tools.soap_tools import generate_soap_note
from ..tools.xray_tools import analyze_xray

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
            
            # Check cache first
            cached_result = redis_service.get_patient_search(name)
            if cached_result:
                print(f"⚡ Cache hit for: {name}")
                result = cached_result
            else:
                # First try exact search
                result = search_patient(name, self.db)
                
                # If no exact match, try vector search
                if not result.get("found"):
                    print(f"🔍 No exact match for '{name}', trying vector search...")
                    vector_results = chroma_service.search_patients(name, top_k=5)
                    
                    if vector_results:
                        similar_list = []
                        for v_result in vector_results:
                            similar_list.append(f"• {v_result['name']} ({v_result['similarity']} similar)")
                        
                        response_text = f"❌ No exact match found for '{name}'.\n\n📋 Did you mean one of these patients?\n\n" + "\n".join(similar_list) + "\n\n💡 Please type the full name exactly as shown."
                        
                        return {
                            "reply": response_text,
                            "patient": None,
                            "tool_calls": ["search_patient"],
                            "session_id": None
                        }
                    else:
                        response_text = f"❌ No patient found matching '{name}'. Please check the spelling."
                
                # Cache the result
                if result.get("found"):
                    redis_service.set_patient_search(name, result)
            
            if result.get("found"):
                self.current_patient_id = result["patient"]["id"]
                self.current_patient_name = result["patient"]["name"]
                self.current_patient_data = result["patient"]
                patient_data = result["patient"]
                response_text = f"✅ Found patient: {result['patient']['name']}\n\n📋 Details:\n- ID: {result['patient']['id']}\n- MRN: {result['patient']['mrn']}\n- Age: {result['patient']['age']}\n- Phone: {result['patient']['phone']}\n- Allergies: {', '.join(result['patient']['allergies']) if result['patient']['allergies'] else 'None'}\n- Conditions: {', '.join(result['patient']['conditions']) if result['patient']['conditions'] else 'None'}"
            else:
                response_text = result.get("message", f"❌ No patient found with name '{name}'")
                
        elif intent["action"] == "get_all_patients":
            result = get_all_patients(self.db)
            if result["patients"]:
                patient_list = "\n".join([f"• {p['name']} (ID: {p['id']}, MRN: {p['mrn']}, Age: {p['age']})" for p in result["patients"]])
                response_text = f"📋 Found {result['count']} patients:\n{patient_list}"
            else:
                response_text = "No patients found"
                
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
                # Clear cache when appointment is scheduled (patient data changed)
                redis_service.clear_patient_cache(patient_name)
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
                # Check cache for SOAP notes
                cached_soap = redis_service.get_soap_notes(self.current_patient_id)
                if cached_soap:
                    print(f"⚡ Cache hit for SOAP notes of {self.current_patient_name}")
                    result = cached_soap
                else:
                    result = generate_soap_note(
                        self.current_patient_id,
                        self.doctor_id,
                        str(self.conversation_history),
                        self.db
                    )
                    if result.get("success"):
                        redis_service.set_soap_notes(self.current_patient_id, result)
                
                if result.get("success"):
                    note = result["soap_note"]
                    content = note["content"]
                    response_text = f"📝 SOAP Note generated for {note['patient_name']}:\n\n**Subjective:** {content['subjective']['chief_complaint']}\n\n**Objective:** {content['objective']['vitals']['bp']}\n\n**Assessment:** {content['assessment']['diagnosis']}\n\n**Plan:** {content['plan']['follow_up']}"
                else:
                    response_text = "Failed to generate SOAP note"
            else:
                response_text = "❌ Please select a patient first. Type: 'Show me patient [name]'"
                
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
        
        if "soap" in message_lower or "generate note" in message_lower:
            return {"action": "generate_soap_note"}
        
        if "all patients" in message_lower or "list all patients" in message_lower:
            return {"action": "get_all_patients"}
        
        if "show me" in message_lower or "find" in message_lower or "search" in message_lower:
            name_match = re.search(r'(?:show me|find|search for)\s+(?:patient\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
            if name_match:
                return {"action": "search_patient", "patient_name": name_match.group(1).title()}
        
        if "schedule" in message_lower or "book" in message_lower:
            if "appointment" in message_lower:
                name_match = re.search(r'(?:for|with)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)', message_lower)
                patient_name = name_match.group(1).title() if name_match else self.current_patient_name
                
                weeks = 0
                if "next week" in message_lower:
                    weeks = 1
                
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
        
        if "appointment" in message_lower and any(x in message_lower for x in ['list', 'show', 'view', 'all']):
            return {"action": "get_appointments"}
        
        return {"action": "general"}

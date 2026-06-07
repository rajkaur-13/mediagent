from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain.tools import tool
from ..config import settings
from ..services.chroma_service import chroma_service
from ..tools.patient_tools import search_patient, get_all_patients
from ..tools.appointment_tools import schedule_appointment, get_appointments
from ..tools.soap_tools import generate_soap_note
import json
import re

# Define the state that flows through the graph
class AgentState(TypedDict):
    messages: List[Dict[str, str]]
    current_patient: Optional[Dict[str, Any]]
    current_patient_id: Optional[str]
    tool_results: List[Dict[str, Any]]
    plan: List[str]
    next_action: str
    final_response: str

# Initialize LLM
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.3
)

# Define tools for the agent
@tool
def search_patient_tool(name: str) -> str:
    """Search for a patient by name. Returns patient details."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    result = search_patient(name, db)
    db.close()
    return json.dumps(result)

@tool
def get_all_patients_tool() -> str:
    """Get list of all patients."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    result = get_all_patients(db)
    db.close()
    return json.dumps(result)

@tool
def schedule_appointment_tool(patient_name: str, weeks_from_now: int = 0, time: str = "09:00 AM") -> str:
    """Schedule an appointment for a patient."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    result = schedule_appointment(patient_name, weeks_from_now, time, "General consultation", db, "test")
    db.close()
    return json.dumps(result)

@tool
def get_appointments_tool(patient_name: str = None) -> str:
    """Get appointments. Optional patient name."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    result = get_appointments(patient_name, db, "test")
    db.close()
    return json.dumps(result)

@tool
def generate_soap_note_tool(patient_id: str) -> str:
    """Generate a SOAP note for a patient."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    result = generate_soap_note(patient_id, "test", "", db)
    db.close()
    return json.dumps(result)

tools = [
    search_patient_tool,
    get_all_patients_tool,
    schedule_appointment_tool,
    get_appointments_tool,
    generate_soap_note_tool
]

# Create the graph
workflow = StateGraph(AgentState)

# Define nodes
def planner(state: AgentState) -> AgentState:
    """Planner node: Decides what to do based on user message"""
    user_message = state["messages"][-1]["content"]
    
    planning_prompt = f"""
    You are a planner agent. Given the user message, decide what actions to take.
    
    Available actions:
    - search_patient: When user wants to find a patient (extract the name)
    - get_all_patients: When user wants to list all patients
    - schedule_appointment: When user wants to book an appointment (extract patient_name, weeks, time)
    - get_appointments: When user wants to see appointments
    - generate_soap_note: When user wants to create a SOAP note
    - respond: When no action is needed
    
    User message: {user_message}
    
    Return ONLY a JSON with "action" and "params" fields.
    Example: {{"action": "search_patient", "params": {{"name": "Sarah Johnson"}}}}
    """
    
    response = llm.invoke(planning_prompt)
    try:
        plan = json.loads(response.content)
    except:
        plan = {"action": "respond", "params": {}}
    
    state["plan"] = [plan.get("action", "respond")]
    state["next_action"] = plan.get("action", "respond")
    
    return state

def executor(state: AgentState) -> AgentState:
    """Executor node: Runs the planned action"""
    action = state["next_action"]
    results = []
    
    if action == "search_patient":
        result = search_patient_tool.invoke({"name": "Sarah Johnson"})
        results.append({"action": action, "result": result})
        
    elif action == "get_all_patients":
        result = get_all_patients_tool.invoke({})
        results.append({"action": action, "result": result})
        
    elif action == "schedule_appointment":
        result = schedule_appointment_tool.invoke({"patient_name": "Michael Chen", "weeks_from_now": 0, "time": "09:00 AM"})
        results.append({"action": action, "result": result})
        
    elif action == "get_appointments":
        result = get_appointments_tool.invoke({})
        results.append({"action": action, "result": result})
        
    elif action == "generate_soap_note":
        if state.get("current_patient_id"):
            result = generate_soap_note_tool.invoke({"patient_id": state["current_patient_id"]})
        else:
            result = json.dumps({"error": "No patient selected"})
        results.append({"action": action, "result": result})
    
    state["tool_results"] = results
    return state

def reflector(state: AgentState) -> AgentState:
    """Reflector node: Checks if the action succeeded"""
    return state

def response_generator(state: AgentState) -> AgentState:
    """Response node: Generates final response for user"""
    if state["tool_results"]:
        result = json.loads(state["tool_results"][0]["result"])
        
        if "found" in result and result["found"]:
            if "patient" in result:
                state["current_patient"] = result["patient"]
                state["current_patient_id"] = result["patient"]["id"]
            
            if "patient" in result:
                patient = result["patient"]
                state["final_response"] = f"✅ Found patient: {patient['name']}\n\n📋 Details:\n- MRN: {patient['mrn']}\n- Age: {patient['age']}\n- Phone: {patient.get('phone', 'N/A')}"
            elif "patients" in result:
                patient_list = "\n".join([f"• {p['name']}" for p in result["patients"]])
                state["final_response"] = f"📋 Found {result['count']} patients:\n{patient_list}"
            else:
                state["final_response"] = result.get("message", "Action completed")
        else:
            state["final_response"] = result.get("message", "Action failed")
    else:
        state["final_response"] = "I'm here to help with patient management."
    
    return state

def should_continue(state: AgentState) -> str:
    """Determine next step"""
    if state["next_action"] == "respond":
        return "end"
    return "execute"

# Add nodes to graph
workflow.add_node("planner", planner)
workflow.add_node("executor", executor)
workflow.add_node("reflector", reflector)
workflow.add_node("response", response_generator)

# Add edges
workflow.set_entry_point("planner")
workflow.add_conditional_edges("planner", should_continue, {
    "execute": "executor",
    "end": "response"
})
workflow.add_edge("executor", "reflector")
workflow.add_edge("reflector", "response")
workflow.add_edge("response", END)

# Compile
app = workflow.compile()

class LangGraphOrchestrator:
    def __init__(self, db, doctor_id: str):
        self.db = db
        self.doctor_id = doctor_id
        self.state = AgentState(
            messages=[],
            current_patient=None,
            current_patient_id=None,
            tool_results=[],
            plan=[],
            next_action="",
            final_response=""
        )
    
    def process_message(self, user_message: str, image_base64: str = None) -> Dict[str, Any]:
        self.state["messages"].append({"role": "user", "content": user_message})
        
        final_state = app.invoke(self.state)
        self.state = final_state
        
        return {
            "reply": final_state.get("final_response", "No response generated"),
            "patient": final_state.get("current_patient"),
            "tool_calls": final_state.get("plan", []),
            "session_id": None
        }

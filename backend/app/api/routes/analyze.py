from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ...db.database import get_db
from ...api.dependencies.auth import get_current_user
from ...models.patient import Patient
from ...models.soap_note import SOAPNote
from ...models.prescription import Prescription
from ...models.appointment import Appointment
from ...services.llm_service import get_llm_response
from ...services.research_service import research_service
from datetime import datetime
import json
import re
from uuid import UUID

router = APIRouter()

class AnalyzeResponse(BaseModel):
    success: bool
    summary: str
    critical_issues: List[str]
    prescription_recommendations: List[str]
    test_recommendations: List[str]
    follow_up_recommendations: List[str]
    warnings: List[str]
    what_is_good: List[str]
    overall_status: str
    action_items: List[str]
    research_citations: List[dict]
    formatted_response: str

@router.post("/full/{patient_id}")
async def analyze_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Analyze ALL patient data with latest research (RAG)"""
    
    # Get patient
    patient = db.query(Patient).filter(Patient.id == UUID(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Gather patient data
    soap_notes = db.query(SOAPNote).filter(
        SOAPNote.patient_id == patient.id
    ).order_by(SOAPNote.visit_date.desc()).limit(1).all()
    
    prescriptions = db.query(Prescription).filter(
        Prescription.patient_id == patient.id,
        Prescription.status == "active"
    ).order_by(Prescription.prescribed_date.desc()).all()
    
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient.id,
        Appointment.status == "scheduled"
    ).order_by(Appointment.date).all()
    
    image_analyses = patient.analysis_history or []
    
    # Extract diagnosis from latest SOAP note
    latest_soap = soap_notes[0] if soap_notes else None
    soap_content = latest_soap.content if latest_soap else {}
    diagnosis = soap_content.get('assessment', {}).get('diagnosis', '')
    
    # RAG: Search latest research based on diagnosis
    research_papers = []
    if diagnosis and len(diagnosis) > 10:
        print(f"🔍 Searching research for: {diagnosis}")
        research_papers = research_service.search_by_diagnosis(diagnosis)
        print(f"📚 Found {len(research_papers)} research papers")
    
    # Prepare research context for LLM
    research_context = ""
    citations = []
    if research_papers:
        research_context = "\n\n--- LATEST RESEARCH PAPERS ---\n"
        for i, paper in enumerate(research_papers):
            research_context += f"\n[{i+1}] {paper['title']}\n"
            research_context += f"    Journal: {paper['journal']}, {paper['date']}\n"
            research_context += f"    Key finding: {paper['abstract'][:200]}...\n"
            citations.append({
                "number": i+1,
                "title": paper['title'],
                "journal": paper['journal'],
                "date": paper['date'],
                "url": paper['url']
            })
        research_context += "\n--- END OF RESEARCH ---\n"
    
    # Build prompt for LLM
    prompt = f"""You are a clinical decision support AI. Analyze this patient and provide recommendations using the latest research.

PATIENT: {patient.name}, Age: {patient.age}
CONDITIONS: {', '.join(patient.conditions or [])}
CURRENT MEDICATIONS: {', '.join(patient.medications or [])}
ALLERGIES: {', '.join(patient.allergies or [])}

LATEST SOAP NOTE:
Subjective: {soap_content.get('subjective', {}).get('chief_complaint', 'N/A')}
Objective: {soap_content.get('objective', {}).get('physical_exam', 'N/A')}
Assessment: {soap_content.get('assessment', {}).get('diagnosis', 'N/A')}
Plan: {soap_content.get('plan', {}).get('follow_up', 'N/A')}

ACTIVE PRESCRIPTIONS ({len(prescriptions)}):
{chr(10).join([f"- {p.content.get('medication', {}).get('name', 'Unknown')} {p.content.get('medication', {}).get('dosage', '')}" for p in prescriptions[:3]]) if prescriptions else 'None'}

UPCOMING APPOINTMENTS ({len(appointments)}):
{chr(10).join([f"- {apt.date} at {apt.time}: {apt.reason}" for apt in appointments[:3]]) if appointments else 'None'}

IMAGE ANALYSES ({len(image_analyses)}):
{chr(10).join([f"- {img.get('date', 'Unknown')}: {img.get('findings', 'No findings')[:100]}" for img in image_analyses[:3]]) if image_analyses else 'None'}

{research_context}

Based on ALL the above information INCLUDING THE LATEST RESEARCH PAPERS, provide recommendations in this EXACT JSON format:

{{
    "summary": "Brief overall assessment (1-2 sentences)",
    "critical_issues": ["Issue 1", "Issue 2"],
    "prescription_recommendations": ["Recommendation 1", "Recommendation 2"],
    "test_recommendations": ["Test 1", "Test 2"],
    "follow_up_recommendations": ["Follow-up 1", "Follow-up 2"],
    "warnings": ["Warning 1", "Warning 2"],
    "what_is_good": ["Good thing 1", "Good thing 2"],
    "overall_status": "critical|high|medium|low|stable",
    "action_items": ["Action 1", "Action 2"]
}}

If research papers are available, cite them in your recommendations (e.g., "According to [1], ..."). Be specific and actionable."""
    
    try:
        response = get_llm_response(prompt, [], max_tokens=1000)
        response = response.replace('```json', '').replace('```', '').strip()
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            response = json_match.group(0)
        result = json.loads(response)
        
        # Format the response
        formatted = "🔍 **COMPREHENSIVE PATIENT ANALYSIS**\n\n"
        
        formatted += f"📊 **Summary:** {result.get('summary', 'Analysis complete')}\n\n"
        
        if result.get('critical_issues'):
            formatted += "🚨 **CRITICAL ISSUES:**\n"
            for issue in result['critical_issues']:
                formatted += f"  • {issue}\n"
            formatted += "\n"
        
        if result.get('prescription_recommendations'):
            formatted += "💊 **PRESCRIPTION RECOMMENDATIONS:**\n"
            for rec in result['prescription_recommendations']:
                formatted += f"  • {rec}\n"
            formatted += "\n"
        
        if result.get('test_recommendations'):
            formatted += "🧪 **TEST RECOMMENDATIONS:**\n"
            for rec in result['test_recommendations']:
                formatted += f"  • {rec}\n"
            formatted += "\n"
        
        if result.get('follow_up_recommendations'):
            formatted += "📅 **FOLLOW-UP RECOMMENDATIONS:**\n"
            for rec in result['follow_up_recommendations']:
                formatted += f"  • {rec}\n"
            formatted += "\n"
        
        if result.get('warnings'):
            formatted += "⚠️ **WARNINGS:**\n"
            for warning in result['warnings']:
                formatted += f"  • {warning}\n"
            formatted += "\n"
        
        if result.get('what_is_good'):
            formatted += "✅ **WHAT'S BEING DONE RIGHT:**\n"
            for good in result['what_is_good']:
                formatted += f"  • {good}\n"
            formatted += "\n"
        
        # Add research citations if available
        if citations:
            formatted += "📚 **LATEST RESEARCH CITED:**\n"
            for citation in citations[:3]:
                formatted += f"  • [{citation['number']}] {citation['title']}\n"
                formatted += f"    {citation['journal']}, {citation['date']}\n"
            formatted += "\n"
        
        if result.get('action_items'):
            formatted += "📋 **ACTION ITEMS:**\n"
            for action in result['action_items']:
                formatted += f"  • {action}\n"
            formatted += "\n"
        
        status_icon = {"critical": "🚨", "high": "⚠️", "medium": "🟡", "low": "✅", "stable": "🟢"}
        formatted += f"📈 **Overall Status:** {status_icon.get(result.get('overall_status', 'medium'), '🟡')} {result.get('overall_status', 'medium').upper()}\n\n"
        formatted += "---\n💡 This analysis is AI-generated using latest research. Final clinical judgment rests with the treating physician."
        
        return {
            "success": True,
            "summary": result.get('summary', ''),
            "critical_issues": result.get('critical_issues', []),
            "prescription_recommendations": result.get('prescription_recommendations', []),
            "test_recommendations": result.get('test_recommendations', []),
            "follow_up_recommendations": result.get('follow_up_recommendations', []),
            "warnings": result.get('warnings', []),
            "what_is_good": result.get('what_is_good', []),
            "overall_status": result.get('overall_status', 'medium'),
            "action_items": result.get('action_items', []),
            "research_citations": citations,
            "formatted_response": formatted
        }
        
    except Exception as e:
        print(f"Analysis error: {e}")
        return {
            "success": False,
            "summary": "Analysis encountered an error",
            "critical_issues": [],
            "prescription_recommendations": [],
            "test_recommendations": [],
            "follow_up_recommendations": [],
            "warnings": [],
            "what_is_good": [],
            "overall_status": "medium",
            "action_items": [],
            "research_citations": [],
            "formatted_response": f"❌ Analysis failed: {str(e)}. Please ensure patient has SOAP notes and try again."
        }

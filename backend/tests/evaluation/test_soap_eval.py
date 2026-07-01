import pytest
from app.tools.soap_tools import generate_soap_note
from app.db.database import SessionLocal

class TestSOAPEvaluation:
    
    def test_soap_structure_completeness(self, db_session):
        """Test that SOAP notes have all required sections"""
        from app.models.patient import Patient
        
        patient = db_session.query(Patient).first()
        
        result = generate_soap_note(
            patient_id=str(patient.id),
            doctor_id="test_doctor",
            user_message="Generate SOAP note with: Subjective: Headache Objective: BP 130/85 Assessment: Hypertension Plan: Follow-up",
            db=db_session
        )
        
        assert result["success"], "SOAP generation failed"
        
        content = result["soap_note"]["content"]
        
        # Check all required sections exist
        assert "subjective" in content
        assert "objective" in content
        assert "assessment" in content
        assert "plan" in content
        
        # Check they have content
        assert len(content["subjective"]["chief_complaint"]) > 0
        assert len(content["assessment"]["diagnosis"]) > 0

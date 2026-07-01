import json
import pytest
from app.core.orchestrator import AgentOrchestrator
from app.db.database import SessionLocal

class TestIntentEvaluation:
    
    @pytest.fixture
    def orchestrator(self):
        db = SessionLocal()
        return AgentOrchestrator(db, "test_doctor_id")
    
    @pytest.fixture
    def test_cases(self):
        with open("tests/fixtures/test_prompts.json", "r") as f:
            return json.load(f)
    
    def test_intent_detection_accuracy(self, orchestrator, test_cases):
        """Test that intent detection is accurate for all test cases"""
        results = []
        
        for case in test_cases:
            # Process the message
            result = orchestrator._detect_intent_with_llm(case["input"])
            
            # Check if intent matches expected
            is_correct = result.get("action") == case["expected_intent"]
            
            results.append({
                "name": case["name"],
                "input": case["input"],
                "expected": case["expected_intent"],
                "actual": result.get("action"),
                "correct": is_correct
            })
        
        # Calculate accuracy
        correct = sum(1 for r in results if r["correct"])
        accuracy = correct / len(results) * 100
        
        print(f"\n📊 Intent Detection Accuracy: {accuracy:.1f}%")
        print(f"   ✅ Correct: {correct}/{len(results)}")
        
        # Print failures
        failures = [r for r in results if not r["correct"]]
        if failures:
            print("\n❌ Failures:")
            for f in failures:
                print(f"   - {f['name']}: Expected '{f['expected']}', got '{f['actual']}'")
        
        assert accuracy >= 80, f"Accuracy too low: {accuracy:.1f}%"
    
    def test_patient_name_extraction(self, orchestrator, test_cases):
        """Test that patient names are correctly extracted"""
        patient_cases = [c for c in test_cases if "expected_patient" in c]
        
        for case in patient_cases:
            name = orchestrator._extract_patient_name_from_message(case["input"])
            assert name == case["expected_patient"], \
                f"Failed to extract patient name from: {case['input']}"

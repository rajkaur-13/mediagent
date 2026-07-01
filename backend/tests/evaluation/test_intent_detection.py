import json
import pytest
from app.core.orchestrator import AgentOrchestrator
from app.db.database import SessionLocal

class TestIntentDetection:
    """Critical: Test that the LLM correctly understands doctor's intent"""

    @pytest.fixture
    def orchestrator(self):
        db = SessionLocal()
        return AgentOrchestrator(db, "test_doctor_id")

    @pytest.fixture
    def test_cases(self):
        """Every doctor message must trigger the right action"""
        return [
            {
                "name": "search_patient_by_full_name",
                "input": "Show me Sarah Johnson",
                "expected_intent": "search_patient",
                "expected_patient": "Sarah Johnson"
            },
            {
                "name": "search_patient_by_first_name",
                "input": "Show me Sarah",
                "expected_intent": "search_patient",
                "expected_patient": "Sarah"
            },
            {
                "name": "search_patient_by_mrn",
                "input": "Show me MRN001",
                "expected_intent": "search_patient",
                "expected_patient": "MRN001"
            },
            {
                "name": "show_all_patients",
                "input": "Show all patients",
                "expected_intent": "get_all_patients",
                "expected_patient": None
            },
            {
                "name": "generate_soap_note",
                "input": "Generate SOAP note for Sarah Johnson with: Subjective: Chest pain Objective: BP 140/90 Assessment: Hypertension Plan: Follow-up",
                "expected_intent": "generate_soap_note",
                "expected_patient": "Sarah Johnson"
            },
            {
                "name": "schedule_appointment",
                "input": "Schedule appointment for Sarah Johnson tomorrow at 2 PM",
                "expected_intent": "schedule_appointment",
                "expected_patient": "Sarah Johnson"
            },
            {
                "name": "write_prescription",
                "input": "Write prescription for Sarah Johnson with: Medication: Lisinopril Dosage: 10mg Frequency: Once daily Duration: 30 days",
                "expected_intent": "generate_prescription",
                "expected_patient": "Sarah Johnson"
            },
            {
                "name": "find_patients_with_condition",
                "input": "Show me patients with diabetes",
                "expected_intent": "general",
                "expected_patient": None
            },
            {
                "name": "find_patients_without_soap",
                "input": "Show me patients without SOAP notes",
                "expected_intent": "general",
                "expected_patient": None
            },
            {
                "name": "find_patients_on_medication",
                "input": "Show me patients on Metformin",
                "expected_intent": "general",
                "expected_patient": None
            },
            {
                "name": "analyze_xray",
                "input": "Analyze chest X-ray for Sarah Johnson",
                "expected_intent": "search_images",
                "expected_patient": "Sarah Johnson"
            },
            {
                "name": "greeting",
                "input": "Hello",
                "expected_intent": "general",
                "expected_patient": None
            }
        ]

    def test_intent_detection_accuracy(self, orchestrator, test_cases):
        """Test that the LLM correctly identifies doctor's intent"""

        results = []
        total = len(test_cases)
        correct = 0

        print("\n" + "="*70)
        print("📊 INTENT DETECTION TEST RESULTS")
        print("="*70)

        for case in test_cases:
            # Process the message
            result = orchestrator._detect_intent_with_llm(case["input"])
            actual_intent = result.get("action", "unknown")

            # Check if intent matches expected
            is_correct = actual_intent == case["expected_intent"]

            if is_correct:
                correct += 1
                status = "✅ PASS"
            else:
                status = "❌ FAIL"

            results.append({
                "name": case["name"],
                "input": case["input"][:50] + "...",
                "expected": case["expected_intent"],
                "actual": actual_intent,
                "correct": is_correct
            })

            # Print each result
            print(f"\n{status} | {case['name']}")
            print(f"   Input: {case['input'][:60]}...")
            print(f"   Expected: {case['expected_intent']}")
            print(f"   Actual:   {actual_intent}")

        # Calculate accuracy
        accuracy = (correct / total) * 100

        print("\n" + "="*70)
        print(f"📈 ACCURACY: {accuracy:.1f}% ({correct}/{total})")
        print("="*70)

        # Print failures summary
        failures = [r for r in results if not r["correct"]]
        if failures:
            print("\n❌ FAILURES:")
            for f in failures:
                print(f"   - {f['name']}: Expected '{f['expected']}', got '{f['actual']}'")

        # Assert minimum accuracy
        min_accuracy = 70.0
        assert accuracy >= min_accuracy, f"Intent detection accuracy {accuracy:.1f}% below minimum {min_accuracy}%"

        return results

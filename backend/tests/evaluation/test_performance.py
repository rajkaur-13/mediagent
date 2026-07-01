import time
import pytest
from app.core.orchestrator import AgentOrchestrator
from app.db.database import SessionLocal

class TestPerformance:
    
    @pytest.mark.performance
    def test_response_time(self):
        """Test that API responses are fast"""
        db = SessionLocal()
        orchestrator = AgentOrchestrator(db, "test_doctor")
        
        # Test multiple queries
        queries = [
            "Show me patients with diabetes",
            "Generate SOAP note for Sarah Johnson",
            "Show all patients"
        ]
        
        times = []
        for query in queries:
            start = time.time()
            orchestrator.process_message(query)
            elapsed = time.time() - start
            times.append(elapsed)
            print(f"   {query[:30]}...: {elapsed:.2f}s")
        
        avg_time = sum(times) / len(times)
        print(f"\n📊 Average Response Time: {avg_time:.2f}s")
        
        # Assert under 3 seconds (your spec)
        assert avg_time < 3.0, f"Average response time too high: {avg_time:.2f}s"

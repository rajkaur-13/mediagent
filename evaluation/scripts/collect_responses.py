import requests
import json
import time

API_URL = "http://localhost:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb2N0b3JAbWVkaWFnZW50LmNvbSIsImlkIjoiYTBmNjg1YzktMDQzOC00N2NiLWE2MmItYTAxNWNhYjU3YzkzIiwicm9sZSI6ImRvY3RvciIsImV4cCI6MTc4MzE4MTAyOX0.Uys_R53AKtVBdUIjE4yxi5S9hTbn4afdtwomam-W58Y"

test_queries = [
    "Find patient with last name Smith",
    "Show me upcoming appointments for today",
    "Generate SOAP note for patient with hypertension",
    "Schedule appointment for patient Brown with Dr. Patel",
    "What medications is patient Johnson currently taking?"
]

results = []

for query in test_queries:
    print(f"🔄 Processing: {query}")
    
    try:
        headers = {"Authorization": f"Bearer {TOKEN}"}
        response = requests.post(
            f"{API_URL}/api/chat/",
            json={"message": query},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract contexts from the response
            contexts = data.get("contexts", [])
            
            # If no contexts, use a placeholder
            if not contexts:
                contexts = ["No context available"]
            
            results.append({
                "question": query,
                "answer": data.get("reply", ""),
                "contexts": contexts,  # ← Now captures real contexts
                "ground_truth": ""
            })
            print(f"✅ Success - Contexts: {len(contexts)} items")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    time.sleep(1)

with open("evaluation/data/collected_responses.json", "w") as f:
    json.dump(results, f, indent=2)

print("\n💾 Responses saved to evaluation/data/collected_responses.json")
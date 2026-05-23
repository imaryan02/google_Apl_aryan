import sys
import os
from fastapi.testclient import TestClient

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from app.main import app
from app.core.seed import seed_db

def run_ai_copilot_verification():
    print("=== STARTING AI COPILOT ENDPOINT VERIFICATION ===")
    seed_db()
    client = TestClient(app)

    # 1. Test general analytics query (fallback/AI checks)
    print("[1/4] Testing general analytics operator query...")
    response = client.post("/api/ai/chat", json={"query": "What is the status of the stadium?"})
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    assert "response" in data, "No conversational response"
    assert "action" in data, "No action block returned"
    print(f"SUCCESS: AI Response: {data['response']}")
    print(f"SUCCESS: Action block: {data['action']}")

    # 2. Test route unblock command action parsing
    print("\n[2/4] Testing Route Update command action parsing...")
    response = client.post("/api/ai/chat", json={"query": "Force unblock Route R-08 Bypass immediately"})
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    action = data["action"]
    assert action["type"] == "update_route", f"Expected update_route action, got {action['type']}"
    assert "R-08" in action["route_name"], f"Expected route name R-08, got {action['route_name']}"
    assert action["route_status"] == "open", f"Expected status open, got {action['route_status']}"
    print(f"SUCCESS: Command parsed as update_route for {action['route_name']} -> {action['route_status']}")

    # 3. Test emergency trigger override parsing
    print("\n[3/4] Testing Emergency Evacuation command action parsing...")
    response = client.post("/api/ai/chat", json={"query": "Commander override: trigger emergency evacuation alert"})
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    action = data["action"]
    assert action["type"] == "emergency", f"Expected emergency action, got {action['type']}"
    assert action["emergency_active"] is True, f"Expected emergency_active to be True"
    print("SUCCESS: Command parsed emergency active override.")

    # 4. Test alert resolution parsing
    print("\n[4/4] Testing Alert Resolution command action parsing...")
    response = client.post("/api/ai/chat", json={"query": "Clear and resolve active alert a1"})
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    action = data["action"]
    assert action["type"] == "resolve_alert", f"Expected resolve_alert action, got {action['type']}"
    assert "a1" in action["alert_id"], f"Expected alert ID containing a1, got {action['alert_id']}"
    print(f"SUCCESS: Command parsed resolve_alert for alert {action['alert_id']}")

    print("\n=== AI COPILOT ENDPOINT VERIFICATION SUCCESSFUL ===")

if __name__ == "__main__":
    run_ai_copilot_verification()

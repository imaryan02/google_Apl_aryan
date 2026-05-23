import sys
import os

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.seed import seed_db
from app.core import models

def run_verification():
    print("=== STARTING ALERT CENTER ENDPOINTS VERIFICATION ===")
    
    # 1. Reset database to baseline seed state
    print("[1/4] Seeding database to baseline...")
    seed_db()
    
    db = SessionLocal()
    client = TestClient(app)
    
    try:
        # 2. Query /api/alerts/ and check seeded alerts (there are two active alerts by default: a1, a2)
        print("\n[2/4] Testing GET /api/alerts/ endpoint...")
        response = client.get("/api/alerts/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        all_alerts = response.json()
        assert len(all_alerts) >= 2, f"Expected at least 2 seeded alerts, found {len(all_alerts)}"
        print(f"SUCCESS: Retrieved {len(all_alerts)} alerts successfully.")

        # Query /api/alerts/active
        response_active = client.get("/api/alerts/active")
        assert response_active.status_code == 200, f"Expected 200, got {response_active.status_code}"
        active_alerts = response_active.json()
        assert any(a["id"] == "a1" for a in active_alerts), "Seeded alert 'a1' should be active"
        print("SUCCESS: Seeded active alerts verified.")

        # 3. Test PATCH /api/alerts/{alert_id}/resolve
        print("\n[3/4] Testing PATCH /api/alerts/a1/resolve...")
        response_resolve = client.patch("/api/alerts/a1/resolve")
        assert response_resolve.status_code == 200, f"Expected 200, got {response_resolve.status_code}: {response_resolve.text}"
        
        data = response_resolve.json()
        assert data["status"] == "resolved", f"Expected resolved status, got {data['status']}"
        assert data["resolved_at"] is not None, "resolved_at timestamp must be set"
        print("SUCCESS: Alert a1 resolved on the server.")

        # Re-check db directly
        alert_db = db.query(models.Alert).filter(models.Alert.id == "a1").first()
        assert alert_db.status == "resolved", f"DB status not updated for a1: {alert_db.status}"
        print("SUCCESS: Confirmed resolved status in SQLite database.")

        # 4. Check active alerts feed again (should exclude resolved alert)
        print("\n[4/4] Verifying resolved alerts are excluded from /active feed...")
        response_active_again = client.get("/api/alerts/active")
        active_alerts_again = response_active_again.json()
        assert not any(a["id"] == "a1" for a in active_alerts_again), "Resolved alert a1 must not appear in active feed"
        print("SUCCESS: Checked active list excludes resolved alerts.")

        print("\n=== ALERT VERIFICATION SUCCESSFUL: ALL ENDPOINT CHECKS PASSED ===")

    except Exception as e:
        print(f"\nAssertion/Execution Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()

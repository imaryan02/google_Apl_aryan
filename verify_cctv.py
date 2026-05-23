import sys
import os
from datetime import datetime

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.seed import seed_db
from app.core import models

def run_verification():
    print("=== STARTING CCTV TELEMETRY & THRESHOLD ENDPOINTS VERIFICATION ===")
    
    # 1. Reset database to baseline seed state
    print("[1/5] Seeding database to baseline...")
    seed_db()
    
    db = SessionLocal()
    client = TestClient(app)
    
    try:
        # Clear existing alerts and recommendations to ensure a clean test slate
        db.query(models.AgentRecommendation).delete()
        db.query(models.Alert).delete()
        db.commit()
        print("Confirmed clean database slate (alerts & recommendations wiped).")

        # Fetch Zone A to retrieve its ID
        zone_a = db.query(models.Zone).filter(models.Zone.code == "ZONE_A").first()
        assert zone_a is not None, "Zone A must exist in seed data"
        zone_id = zone_a.id
        print(f"Zone A details: ID={zone_id}, Warning={zone_a.warning_threshold}%, Critical={zone_a.critical_threshold}%")

        # 2. Test PATCH /api/zones/{zone_id}/thresholds
        print("\n[2/5] Testing PATCH /api/zones/{zone_id}/thresholds override...")
        new_thresholds = {
            "warning_threshold": 60.0,
            "critical_threshold": 80.0
        }
        response = client.patch(f"/api/zones/{zone_id}/thresholds", json=new_thresholds)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert float(data["warning_threshold"]) == 60.0, f"Expected warning_threshold 60.0, got {data['warning_threshold']}"
        assert float(data["critical_threshold"]) == 80.0, f"Expected critical_threshold 80.0, got {data['critical_threshold']}"
        
        # Verify db persistence
        db.refresh(zone_a)
        assert float(zone_a.warning_threshold) == 60.0, f"DB warning threshold not updated: {zone_a.warning_threshold}"
        assert float(zone_a.critical_threshold) == 80.0, f"DB critical threshold not updated: {zone_a.critical_threshold}"
        print("SUCCESS: Zone capacity threshold override saved and verified in DB.")

        # 3. Test PATCH /api/zones/code/{zone_code}/density (Inject warning level density)
        print("\n[3/5] Testing PATCH /api/zones/code/ZONE_A/density (Injecting 75.0% Warning density)...")
        # 75% density is between 60.0% warning and 80.0% critical -> should set risk to "warning" and speed to "slow"
        response = client.patch("/api/zones/code/ZONE_A/density?density=75.0")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert float(data["current_density"]) == 75.0, f"Expected 75.0, got {data['current_density']}"
        assert data["risk_level"] == "warning", f"Expected risk_level warning, got {data['risk_level']}"
        assert data["movement_speed"] == "slow", f"Expected movement_speed slow, got {data['movement_speed']}"
        
        # Verify congestion alert is raised dynamically
        active_congestion_alert = db.query(models.Alert).filter(
            models.Alert.zone_id == zone_id,
            models.Alert.alert_type == "congestion",
            models.Alert.status == "active"
        ).first()
        assert active_congestion_alert is not None, "Active congestion alert should be created"
        assert active_congestion_alert.severity == "high", f"Expected severity 'high', got {active_congestion_alert.severity}"
        print(f"SUCCESS: Density injected. Alert raised: '{active_congestion_alert.title}' ({active_congestion_alert.severity})")

        # 4. Test POST /api/zones/code/{zone_code}/unusual-activity
        print("\n[4/5] Testing POST /api/zones/code/ZONE_A/unusual-activity (Simulating Fight)...")
        payload = {
            "activity_type": "fight",
            "details": "CCTV Analyst flagged fight in Sector A turnstile corridor",
            "severity": "high"
        }
        response = client.post("/api/zones/code/ZONE_A/unusual-activity", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify fight alert created
        fight_alert = db.query(models.Alert).filter(
            models.Alert.zone_id == zone_id,
            models.Alert.alert_type == "unusual_activity",
            models.Alert.status == "active"
        ).first()
        assert fight_alert is not None, "Active unusual activity alert should be created in DB"
        print(f"SUCCESS: Unusual activity alert created in DB: '{fight_alert.title}'")

        # Verify emergency response recommendation spawned
        rec = db.query(models.AgentRecommendation).filter(
            models.AgentRecommendation.alert_id == fight_alert.id,
            models.AgentRecommendation.agent_type == "emergency_response"
        ).first()
        assert rec is not None, "AI Recommendation should be spawned for unusual activity"
        print(f"SUCCESS: AI Emergency Recommendation spawned: '{rec.recommendation}'")

        # 5. Test PATCH /api/zones/code/{zone_code}/density (Injecting safe level density to test self-healing)
        print("\n[5/5] Testing Self-Healing: Injecting safe density 40.0% to resolve alerts...")
        # 40% density is below 60.0% warning -> should resolve active congestion alert
        response = client.patch("/api/zones/code/ZONE_A/density?density=40.0")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        db.refresh(active_congestion_alert)
        assert active_congestion_alert.status == "resolved", f"Expected alert status 'resolved', got '{active_congestion_alert.status}'"
        print("SUCCESS: Congestion alert self-healed and status updated to 'resolved'.")

        print("\n=== VERIFICATION SUCCESSFUL: ALL ENDPOINT CHECKS PASSED ===")

    except Exception as e:
        print(f"\nAssertion/Execution Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_verification()

import sys
import os
import asyncio

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.seed import seed_db
from app.core import models

async def test_cv_analysis():
    print("=== STARTING VIDEO ANALYSIS FEED VERIFICATION ===")
    
    # 1. Reset database to baseline seed state
    print("[1/3] Seeding database to baseline...")
    seed_db()
    
    db = SessionLocal()
    client = TestClient(app)
    
    try:
        # 2. Call POST /api/zones/code/ZONE_A/analyze-feed
        video_url = "https://assets.mixkit.co/videos/preview/mixkit-people-walking-in-a-crowded-street-34190-large.mp4"
        print(f"[2/3] Calling POST /api/zones/code/ZONE_A/analyze-feed with URL:\n      {video_url}\n      (This will run OpenCV/YOLO video frame decoders...)")
        
        # Let's call the endpoint
        response = client.post("/api/zones/code/ZONE_A/analyze-feed", json={"video_url": video_url})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print("\nAPI Response:")
        print(f"  - Status: {data.get('status')}")
        print(f"  - Detected Count: {data.get('detected_count')} persons")
        print(f"  - Calculated Density: {data.get('density')}%")
        print(f"  - Estimated Flow Speed: {data.get('movement_speed')}")
        print(f"  - Anomaly Flagged: {data.get('anomaly')}")
        print(f"  - Confidence: {data.get('confidence')}")
        print(f"  - Alert Triggered: {data.get('alert_triggered')}")
        print(f"  - Alert Title: {data.get('alert_title')}")
        
        assert data.get("status") == "success", "Response status should be 'success'"
        assert isinstance(data.get("detected_count"), int), "detected_count should be an integer"
        assert isinstance(data.get("density"), float), "density should be a float"
        assert data.get("movement_speed") in ["normal", "slow", "stagnant"], "Invalid movement_speed value"
        
        # 3. Verify database updates
        print("\n[3/3] Checking database updates for ZONE_A...")
        zone_a = db.query(models.Zone).filter(models.Zone.code == "ZONE_A").first()
        assert zone_a is not None, "Zone A must exist in DB"
        
        print(f"Database Zone State:")
        print(f"  - Code: {zone_a.code}")
        print(f"  - Name: {zone_a.name}")
        print(f"  - Density: {float(zone_a.current_density)}%")
        print(f"  - Speed: {zone_a.movement_speed}")
        print(f"  - Risk Level: {zone_a.risk_level}")
        
        assert float(zone_a.current_density) == data.get("density"), "Zone density in DB doesn't match API result"
        assert zone_a.movement_speed == data.get("movement_speed"), "Zone speed in DB doesn't match API result"
        
        # Check alerts created if any
        if data.get("alert_triggered"):
            alerts = db.query(models.Alert).filter(
                models.Alert.zone_code == "ZONE_A", 
                models.Alert.status == "active"
            ).all()
            print(f"Active Alerts in Zone A:")
            for a in alerts:
                print(f"  - Alert: {a.title} ({a.alert_type}, Severity={a.severity})")
                
        print("\n=== VERIFICATION SUCCESSFUL: ALL VIDEO ANALYSIS CHECKS PASSED ===")
        
    except Exception as e:
        print(f"\nAssertion/Execution Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_cv_analysis())

import sys
import os
from fastapi.testclient import TestClient

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from app.main import app
from app.core.database import SessionLocal
from app.core import models
from app.core.seed import seed_db

def run_crud_verification():
    print("=== STARTING VIP CRUD ENDPOINTS VERIFICATION ===")
    seed_db()
    client = TestClient(app)

    db = SessionLocal()
    try:
        # Clean up any leftover VIP with test ID if exists
        test_vips = db.query(models.VipMovement).filter(models.VipMovement.vip_name.like("%TEST-CONVOY%")).all()
        for v in test_vips:
            db.delete(v)
        db.commit()

        # Query dynamic IDs for routes/teams to match database state
        routes = db.query(models.Route).all()
        primary_route_id = routes[0].id if len(routes) > 0 else None
        backup_route_id = routes[1].id if len(routes) > 1 else None
        
        team = db.query(models.SecurityTeam).first()
        assigned_team_id = team.id if team else None
        
        stadium = db.query(models.Stadium).first()
        stadium_id = stadium.id if stadium else "s1"
    finally:
        db.close()

    # 1. Create a VVIP Convoy
    print("[1/3] Testing POST /api/vip-movements/...")
    payload = {
        "stadium_id": stadium_id,
        "vip_name": "TEST-CONVOY-001",
        "arrival_time": "14:30 PM",
        "entry_gate": "Gate G VVIP Entrance",
        "destination": "VIP Suite 01",
        "security_level": "VVIP",
        "expected_people": 5,
        "convoy_size": 2,
        "primary_route_id": primary_route_id,
        "backup_route_id": backup_route_id,
        "assigned_team_id": assigned_team_id,
        "movement_status": "planned"
    }
    
    response = client.post("/api/vip-movements/", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    created_data = response.json()
    assert created_data["vip_name"] == "TEST-CONVOY-001", "VIP Name mismatch"
    assert created_data["security_level"] == "VVIP", "Security level mismatch"
    vip_id = created_data["id"]
    print(f"SUCCESS: VVIP Convoy created with ID: {vip_id}")

    # 2. Modify VVIP Convoy
    print("\n[2/3] Testing PUT /api/vip-movements/{id}...")
    update_payload = {
        "stadium_id": stadium_id,
        "vip_name": "TEST-CONVOY-001-MODIFIED",
        "arrival_time": "15:00 PM",
        "entry_gate": "Gate G VVIP Entrance",
        "destination": "VIP Suite 01",
        "security_level": "VVIP",
        "expected_people": 10,
        "convoy_size": 3,
        "primary_route_id": primary_route_id,
        "backup_route_id": backup_route_id,
        "assigned_team_id": assigned_team_id,
        "movement_status": "active"
    }

    response = client.put(f"/api/vip-movements/{vip_id}", json=update_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    updated_data = response.json()
    assert updated_data["vip_name"] == "TEST-CONVOY-001-MODIFIED", "VIP Name did not update"
    assert updated_data["expected_people"] == 10, "Expected people did not update"
    assert updated_data["movement_status"] == "active", "Movement status did not update"
    print("SUCCESS: VVIP Convoy modified successfully.")

    # 3. Delete VVIP Convoy
    print("\n[3/3] Testing DELETE /api/vip-movements/{id}...")
    response = client.delete(f"/api/vip-movements/{vip_id}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
    assert response.json() == {"success": True}, "Unexpected delete response"
    
    # Confirm deletion from database
    db = SessionLocal()
    try:
        deleted_vip = db.query(models.VipMovement).filter(models.VipMovement.id == vip_id).first()
        assert deleted_vip is None, "VIP record still exists in database after delete"
        print("SUCCESS: VVIP Convoy deleted successfully. Database state verified.")
    finally:
        db.close()

    print("\n=== VIP CRUD ENDPOINTS VERIFICATION SUCCESSFUL ===")

if __name__ == "__main__":
    run_crud_verification()

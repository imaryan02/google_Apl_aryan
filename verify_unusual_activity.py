import sys
import os
import asyncio
import uuid
from datetime import datetime

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from app.core.database import SessionLocal
from app.core.seed import seed_db
from app.core import models
from app.modules.prediction.engine import evaluate_stampede_predictions

async def run_verification():
    print("=== STARTING UNUSUAL ACTIVITY MONITORING VERIFICATION ===")
    
    # 1. Reset database to baseline seed state
    print("[1/6] Seeding database to baseline...")
    seed_db()
    
    db = SessionLocal()
    try:
        # Clear existing recommendations and alerts to start fresh
        db.query(models.AgentRecommendation).delete()
        db.query(models.Alert).delete()
        db.commit()
        print("Confirmed clean database slate.")

        # Locate ZONE_A
        zone_a = db.query(models.Zone).filter(models.Zone.code == "ZONE_A").first()
        assert zone_a is not None, "Zone A not found"
        print(f"Zone A initial density: {zone_a.current_density}%, Speed: {zone_a.movement_speed}")

        # 2. Report Unusual Activity "fight" in ZONE_A
        print("\n[2/6] Reporting unusual activity 'fight' in Sector ZONE_A...")
        fight_alert = models.Alert(
            id=str(uuid.uuid4()),
            stadium_id=zone_a.stadium_id,
            zone_id=zone_a.id,
            zone_code=zone_a.code,
            alert_type="unusual_activity",
            severity="high",
            title=f"Unusual Activity: Fight in {zone_a.name}",
            description=f"CCTV analytics flagged physical altercation (fight) in {zone_a.name}.",
            status="active",
            source="system"
        )
        db.add(fight_alert)
        db.commit()
        
        # Spawn Emergency Response recommendation
        fight_rec = models.AgentRecommendation(
            id=str(uuid.uuid4()),
            stadium_id=zone_a.stadium_id,
            alert_id=fight_alert.id,
            agent_type="emergency_response",
            recommendation=f"Dispatch Security Team to {zone_a.name} immediately to address unusual behavior.",
            reasoning=f"Altercation flagged in Sector {zone_a.code}.",
            suggested_actions=["Deploy Tactical Escort Team to Zone A corridor", "Focus Monitor to Cam-1"],
            status="pending"
        )
        db.add(fight_rec)
        db.commit()
        print("SUCCESS: Fight alert and dispatch recommendation created.")

        # Run prediction engine to verify that fight adds 20-point penalty but doesn't trigger stampede yet
        # (Density 42% * speed normal 0.8) + penalty 20 = 53.6% (less than 65% warning threshold)
        print("\n[3/6] Running predictions... verifying risk score is below warning threshold...")
        await evaluate_stampede_predictions(db)
        
        active_stampede_alerts = db.query(models.Alert).filter(
            models.Alert.alert_type == "stampede_risk",
            models.Alert.status == "active",
            models.Alert.zone_id == zone_a.id
        ).all()
        assert len(active_stampede_alerts) == 0, f"Unexpected active stampede risk alerts: {active_stampede_alerts}"
        print("Confirmed no stampede alerts triggered yet (Score: 53.6% is safe).")

        # 3. Report Unusual Activity "rapid_gathering" in ZONE_A (Density spikes by 20%)
        print("\n[4/6] Simulating unusual activity 'rapid_gathering' in Sector ZONE_A...")
        # Increment density by 20.0%
        zone_a.current_density = float(zone_a.current_density) + 20.0
        db.add(zone_a)
        
        gathering_alert = models.Alert(
            id=str(uuid.uuid4()),
            stadium_id=zone_a.stadium_id,
            zone_id=zone_a.id,
            zone_code=zone_a.code,
            alert_type="unusual_activity",
            severity="high",
            title=f"Unusual Activity: Rapid Gathering in {zone_a.name}",
            description=f"CCTV analytics flagged abnormal crowd pooling (rapid_gathering) in {zone_a.name}.",
            status="active",
            source="system"
        )
        db.add(gathering_alert)
        db.commit()
        db.refresh(zone_a)
        print(f"Zone A updated density: {zone_a.current_density}%")

        # Re-run prediction checks
        # New score: (Density 62% * speed normal 0.8) + penalty 20 = 69.6% (crosses 65% warning threshold!)
        print("\n[5/6] Re-running predictions... verifying stampede alert is triggered...")
        await evaluate_stampede_predictions(db)
        
        stampede_alert = db.query(models.Alert).filter(
            models.Alert.alert_type == "stampede_risk",
            models.Alert.status == "active",
            models.Alert.zone_id == zone_a.id
        ).first()
        assert stampede_alert is not None, "Stampede risk warning alert was not generated!"
        print(f"SUCCESS: Stampede warning alert generated dynamically (Score: 69.6%)!")
        print(f"  - Title: {stampede_alert.title}")
        print(f"  - Severity: {stampede_alert.severity}")
        print(f"  - Description: {stampede_alert.description}")

        # 4. Simulate Resolving Unusual Activity Fights & Dispersing Crowd
        print("\n[6/6] Simulating resolution (clearing unusual activity, dispersing crowd)...")
        # Resolve fight & gathering alerts
        fight_alert.status = "resolved"
        fight_alert.resolved_at = datetime.utcnow()
        gathering_alert.status = "resolved"
        gathering_alert.resolved_at = datetime.utcnow()
        db.add(fight_alert)
        db.add(gathering_alert)
        
        # Reset Zone A density
        zone_a.current_density = 42.0
        db.add(zone_a)
        db.commit()
        
        # Re-run prediction engine (should resolve stampede alert via Self-Healing)
        await evaluate_stampede_predictions(db)
        db.refresh(stampede_alert)
        
        assert stampede_alert.status == "resolved", f"Expected stampede alert 'resolved', found '{stampede_alert.status}'"
        print("SUCCESS: Stampede warning alert resolved dynamically (Self-Healing)!")
        
        print("\n=== VERIFICATION SUCCESSFUL: ALL CHECKS PASSED ===")
        
    except Exception as e:
        print(f"\nAssertion/Execution Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_verification())

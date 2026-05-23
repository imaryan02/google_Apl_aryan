import sys
import os
import asyncio

# Setup path to backend folder to import app modules
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.append(backend_path)

from app.core.database import SessionLocal
from app.core.seed import seed_db
from app.core import models
from app.modules.prediction.engine import evaluate_stampede_predictions

async def run_verification():
    print("=== STARTING STAMPEDE PREDICTION ENGINE VERIFICATION ===")
    
    # 1. Reset database to baseline seed state
    print("[1/5] Seeding database to baseline...")
    seed_db()
    
    db = SessionLocal()
    try:
        # Clear any pre-seeded stampede risk alerts to verify our test flow on a clean slate
        db.query(models.AgentRecommendation).delete()
        db.query(models.Alert).filter(models.Alert.alert_type == "stampede_risk").delete()
        db.commit()

        # Verify initial state has no active stampede risks
        initial_prediction_alerts = db.query(models.Alert).filter(
            models.Alert.alert_type == "stampede_risk",
            models.Alert.status == "active"
        ).all()
        assert len(initial_prediction_alerts) == 0, "Unexpected active stampede risk alerts found initially"
        print("Confirmed no active stampede risks in baseline state.")

        # 2. Simulate crowd buildup in ZONE_F: density = 82%, speed = slow
        print("\n[2/5] Simulating crowd buildup in Gate F Plaza (ZONE_F) (density=82%, speed=slow)...")
        zone_f = db.query(models.Zone).filter(models.Zone.code == "ZONE_F").first()
        assert zone_f is not None, "Zone F not found"
        zone_f.current_density = 82.0
        zone_f.movement_speed = "slow"
        db.add(zone_f)
        db.commit()
        db.refresh(zone_f)
        print(f"Zone F: Density={zone_f.current_density}%, Speed={zone_f.movement_speed}")

        # Block the only outgoing route from Zone F (E-02)
        print("Blocking outgoing route E-02 (Alternate) from ZONE_F...")
        route_e02 = db.query(models.Route).filter(models.Route.name.like("%E-02%")).first()
        assert route_e02 is not None, "Route E-02 not found"
        route_e02.status = "blocked"
        db.add(route_e02)
        db.commit()
        
        # Run prediction engine
        await evaluate_stampede_predictions(db)

        # 3. Verify backend inserts a stampede_risk alert (severity=critical) and prediction recommendation
        print("\n[3/5] Verifying critical prediction alert & recommendation...")
        
        # Retrieve Alert
        alert = db.query(models.Alert).filter(
            models.Alert.alert_type == "stampede_risk",
            models.Alert.zone_id == zone_f.id,
            models.Alert.status == "active"
        ).first()
        assert alert is not None, "Stampede risk alert was not generated!"
        assert alert.severity == "critical", f"Expected alert severity 'critical', found '{alert.severity}'"
        print("SUCCESS: Critical stampede risk alert generated successfully!")
        print(f"  - Title: {alert.title}")
        print(f"  - Severity: {alert.severity}")
        print(f"  - Description: {alert.description}")

        # Retrieve Agent Recommendation
        recommendation = db.query(models.AgentRecommendation).filter(
            models.AgentRecommendation.alert_id == alert.id,
            models.AgentRecommendation.agent_type == "prediction"
        ).first()
        assert recommendation is not None, "Prediction agent recommendation was not generated!"
        assert recommendation.status == "pending", f"Expected recommendation status 'pending', found '{recommendation.status}'"
        print("SUCCESS: AI agent prediction recommendation generated successfully!")
        print(f"  - Summary: {recommendation.recommendation}")
        print(f"  - Reasoning: {recommendation.reasoning}")
        print(f"  - Actions: {recommendation.suggested_actions}")

        # 4. Simulate Operator resolving the issue (unblocking exit route, dispersing crowd)
        print("\n[4/5] Simulating crowd dispersing and unblocking exit Route E-02...")
        # Unblock Route E-02
        route_e02.status = "open"
        db.add(route_e02)
        
        # Lower Zone F density to safe levels (density=50%, speed=normal)
        zone_f.current_density = 50.0
        zone_f.movement_speed = "normal"
        db.add(zone_f)
        db.commit()
        print(f"Zone F: Density={zone_f.current_density}%, Speed={zone_f.movement_speed}, Route E-02 status={route_e02.status}")

        # Re-run prediction checks (triggers dynamic Self-Healing)
        await evaluate_stampede_predictions(db)

        # 5. Confirming alert resolves automatically (Self-Healing)
        print("\n[5/5] Verifying Self-Healing prediction state resolution...")
        
        # Re-query alert and recommendation status
        db.refresh(alert)
        db.refresh(recommendation)
        
        active_alerts = db.query(models.Alert).filter(
            models.Alert.alert_type == "stampede_risk",
            models.Alert.zone_id == zone_f.id,
            models.Alert.status == "active"
        ).all()
        
        assert len(active_alerts) == 0, f"Expected 0 active stampede risk alerts for Zone F, found {len(active_alerts)}"
        assert alert.status == "resolved", f"Expected alert status 'resolved', found '{alert.status}'"
        assert recommendation.status == "rejected", f"Expected recommendation status 'rejected' (rescinded), found '{recommendation.status}'"
        
        print("SUCCESS: Stampede risk alert dynamically resolved and recommendation retracted!")
        print("Confirmed Self-Healing is functional. Zone F is marked secure.")
        
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

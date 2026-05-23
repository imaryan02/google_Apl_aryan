from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core import models
from app.shared import schemas
from app.core.socket import broadcast_zone_update, broadcast_alert_new, broadcast_alert_resolved

router = APIRouter(prefix="/zones", tags=["zones"])

@router.get("/", response_model=List[schemas.ZoneResponse])
def get_zones(db: Session = Depends(get_db)):
    return db.query(models.Zone).all()

@router.get("/{zone_id}", response_model=schemas.ZoneResponse)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.patch("/{zone_id}/thresholds", response_model=schemas.ZoneResponse)
async def update_thresholds(zone_id: str, threshold: schemas.ZoneThresholdUpdate, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone.warning_threshold = threshold.warning_threshold
    zone.critical_threshold = threshold.critical_threshold
    db.commit()
    db.refresh(zone)
    await broadcast_zone_update(zone)
    return zone

@router.patch("/code/{zone_code}/density", response_model=schemas.ZoneResponse)
async def update_density(zone_code: str, density: float, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.code == zone_code).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # 1. Update density and recalculate risk levels
    zone.current_density = density
    warning_val = float(zone.warning_threshold)
    critical_val = float(zone.critical_threshold)
    
    is_critical = density >= critical_val
    is_warning = density >= warning_val and density < critical_val

    if is_critical:
        zone.risk_level = "critical"
        zone.movement_speed = "stagnant"
    elif is_warning:
        zone.risk_level = "warning"
        zone.movement_speed = "slow"
    else:
        zone.risk_level = "safe"
        zone.movement_speed = "normal"
        
    db.add(zone)
    db.commit()
    db.refresh(zone)
    
    # 2. Check and handle automated alert escalations / self-healing
    active_alert = db.query(models.Alert).filter(
        models.Alert.zone_id == zone.id,
        models.Alert.alert_type == "congestion",
        models.Alert.status == "active"
    ).first()
    
    if is_critical or is_warning:
        severity = "critical" if is_critical else "high"
        title = f"{zone.name} Congestion Critical" if is_critical else f"{zone.name} Overcrowding Warning"
        description = (
            f"Sector density has reached {density}%, crossing critical threshold ({critical_val}%). High risk of crowd compression."
            if is_critical else
            f"Sector density has reached {density}%, crossing warning threshold ({warning_val}%). Egress speed is slow."
        )
        
        if not active_alert:
            # Create a brand new active alert
            active_alert = models.Alert(
                stadium_id=zone.stadium_id,
                zone_id=zone.id,
                zone_code=zone.code,
                alert_type="congestion",
                severity=severity,
                title=title,
                description=description,
                status="active",
                source="system"
            )
            db.add(active_alert)
            db.commit()
            db.refresh(active_alert)
            await broadcast_alert_new(active_alert)
        else:
            # Dynamically update the severity, title, and description of the existing alert if they changed
            if active_alert.severity != severity:
                active_alert.severity = severity
                active_alert.title = title
                active_alert.description = description
                db.add(active_alert)
                db.commit()
                db.refresh(active_alert)
                # Re-broadcast updated alert
                await broadcast_alert_new(active_alert)

        # 3. Generate dynamic Smart Routing Agent Recommendation for this alert
        try:
            from app.modules.routes import engine as routes_engine
            from app.core.socket import broadcast_agent_recommendation
            rec = routes_engine.generate_advisory_for_alert(db, active_alert)
            if rec:
                await broadcast_agent_recommendation(rec)
        except Exception as e:
            # Graceful degradation if pathfinding fails
            pass
    else:
        # If density dropped below warning threshold, resolve active congestion alert dynamically (Self-Healing!)
        if active_alert:
            active_alert.status = "resolved"
            active_alert.resolved_at = datetime.utcnow()
            db.add(active_alert)
            db.commit()
            db.refresh(active_alert)
            await broadcast_alert_resolved(active_alert)
            
    # 3. Evaluate VIP route conflicts based on new density state
    try:
        from app.modules.vip.engine import evaluate_vip_conflicts
        await evaluate_vip_conflicts(db)
    except Exception as e:
        pass

    # Evaluate stampede predictions based on new density state
    try:
        from app.modules.prediction.engine import evaluate_stampede_predictions
        await evaluate_stampede_predictions(db)
    except Exception as e:
        pass

    # 4. Emit real-time zone telemetry broadcast
    await broadcast_zone_update(zone)
    return zone

from pydantic import BaseModel
from typing import Optional
from app.core.socket import broadcast_agent_recommendation

class UnusualActivityReport(BaseModel):
    activity_type: str  # "fight", "rapid_gathering"
    details: Optional[str] = None
    severity: str = "high"  # "high", "critical"

@router.post("/code/{zone_code}/unusual-activity", response_model=schemas.AlertResponse)
async def report_unusual_activity(
    zone_code: str,
    payload: UnusualActivityReport,
    db: Session = Depends(get_db)
):
    zone = db.query(models.Zone).filter(models.Zone.code == zone_code).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    # 1. Create a high-severity alert for unusual activity
    alert_type = "unusual_activity"
    title = f"Unusual Activity: {payload.activity_type.replace('_', ' ').title()} in {zone.name}"
    description = f"CCTV analytics flagged abnormal behavior ({payload.activity_type}) in {zone.name}."
    if payload.details:
        description += f" Details: {payload.details}"
        
    db_alert = models.Alert(
        stadium_id=zone.stadium_id,
        zone_id=zone.id,
        zone_code=zone.code,
        alert_type=alert_type,
        severity=payload.severity,
        title=title,
        description=description,
        status="active",
        source="system"
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    await broadcast_alert_new(db_alert)
    
    # 2. Spawn AI Agent Recommendation (emergency response type) via GenAI
    from app.core.ai import generate_ai_recommendation
    
    routes = db.query(models.Route).filter(models.Route.from_zone_id == zone.id).all()
    routes_info = [
        {
            "name": r.name,
            "type": r.route_type,
            "status": r.status,
            "priority": r.priority,
            "is_emergency": r.is_emergency_lane
        }
        for r in routes
    ]
    
    ai_rec = generate_ai_recommendation(
        alert_type="unusual_activity",
        severity=payload.severity,
        title=title,
        description=description,
        zone_code=zone.code,
        zone_name=zone.name,
        density=float(zone.current_density),
        speed=zone.movement_speed,
        warning_threshold=float(zone.warning_threshold),
        critical_threshold=float(zone.critical_threshold),
        routes_info=routes_info
    )
    
    db_rec = models.AgentRecommendation(
        stadium_id=zone.stadium_id,
        alert_id=db_alert.id,
        agent_type="emergency_response",
        recommendation=ai_rec.recommendation,
        reasoning=ai_rec.reasoning,
        suggested_actions=ai_rec.suggested_actions,
        status="pending"
    )
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    await broadcast_agent_recommendation(db_rec)
    
    # 3. If the event is "rapid_gathering", we also spike density locally to trigger predictions
    if payload.activity_type == "rapid_gathering":
        zone.current_density = min(100.0, float(zone.current_density) + 20.0)
        warning_val = float(zone.warning_threshold)
        critical_val = float(zone.critical_threshold)
        if float(zone.current_density) >= critical_val:
            zone.risk_level = "critical"
            zone.movement_speed = "stagnant"
        elif float(zone.current_density) >= warning_val:
            zone.risk_level = "warning"
            zone.movement_speed = "slow"
        db.add(zone)
        db.commit()
        db.refresh(zone)
        await broadcast_zone_update(zone)
        
    # 4. Trigger Stampede Prediction checks since crowd behavior or metrics updated
    try:
        from app.modules.prediction.engine import evaluate_stampede_predictions
        await evaluate_stampede_predictions(db)
    except Exception:
        pass
        
    return db_alert

class VideoAnalysisRequest(BaseModel):
    video_url: str

@router.post("/code/{zone_code}/analyze-feed")
async def analyze_zone_video_feed(
    zone_code: str,
    payload: VideoAnalysisRequest,
    db: Session = Depends(get_db)
):
    zone = db.query(models.Zone).filter(models.Zone.code == zone_code).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    from app.modules.ai.crowd_cv import analyze_video_feed
    
    # 1. Run CV Analyzer
    cv_results = analyze_video_feed(payload.video_url, zone.capacity)
    
    # 2. Update Zone Density (this automatically triggers alerts and routing recommendations)
    updated_zone = await update_density(
        zone_code=zone_code, 
        density=cv_results["density"], 
        db=db
    )
    
    # Force override movement speed if determined by optical flow
    updated_zone.movement_speed = cv_results["movement_speed"]
    db.add(updated_zone)
    db.commit()
    db.refresh(updated_zone)
    await broadcast_zone_update(updated_zone)
    
    # 3. Handle anomalies detected by CV
    alert_created = None
    if cv_results["anomaly"] != "safe":
        # Report unusual activity
        report_payload = UnusualActivityReport(
            activity_type="fight" if cv_results["anomaly"] == "fight" else "rapid_gathering",
            details=f"Computer Vision automated scanner detected anomalous {cv_results['anomaly']} behavior in crowd flow stream.",
            severity="critical" if cv_results["anomaly"] == "fight" else "high"
        )
        alert_created = await report_unusual_activity(
            zone_code=zone_code,
            payload=report_payload,
            db=db
        )
        
    return {
        "status": "success",
        "detected_count": cv_results["detected_count"],
        "density": cv_results["density"],
        "movement_speed": cv_results["movement_speed"],
        "anomaly": cv_results["anomaly"],
        "confidence": cv_results["confidence"],
        "alert_triggered": alert_created is not None,
        "alert_title": alert_created.title if alert_created else None
    }


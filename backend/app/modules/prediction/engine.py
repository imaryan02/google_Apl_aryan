import logging
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.core import models
from app.core.socket import broadcast_alert_new, broadcast_alert_resolved, broadcast_agent_recommendation

logger = logging.getLogger("PredictionEngine")

async def evaluate_stampede_predictions(db: Session):
    """
    Evaluates stampede/crowd surge risks across all zones in real-time.
    Formula: Risk_Score = min(100.0, (Density * Speed_Multiplier) + (35.0 * Blockage_Ratio))
    """
    zones = db.query(models.Zone).all()
    
    for zone in zones:
        # 1. Fetch outgoing routes from this zone
        routes = db.query(models.Route).filter(models.Route.from_zone_id == zone.id).all()
        total_routes = len(routes)
        blocked_routes = len([r for r in routes if r.status in ["blocked", "restricted"]])
        
        blockage_ratio = float(blocked_routes) / float(total_routes) if total_routes > 0 else 0.0
        
        # 2. Map flow speed to multiplier
        speed_mult = 1.0
        if zone.movement_speed == "normal":
            speed_mult = 0.8  # Crowd is flowing freely, reducing risk
        elif zone.movement_speed == "slow":
            speed_mult = 1.1  # Slowdown indicates congestion buildup
        elif zone.movement_speed == "stagnant":
            speed_mult = 1.4  # Unmoving crowd signals critical density pressure
            
        # Check if there are any active unusual activity alerts in the zone (fights, rapid gatherings)
        unusual_activity = db.query(models.Alert).filter(
            models.Alert.zone_id == zone.id,
            models.Alert.alert_type == "unusual_activity",
            models.Alert.status == "active"
        ).first()
        
        unusual_penalty = 20.0 if unusual_activity else 0.0

        # 3. Calculate Risk Score
        density = float(zone.current_density)
        risk_score = min(100.0, (density * speed_mult) + (35.0 * blockage_ratio) + unusual_penalty)
        
        logger.debug(f"Zone {zone.code}: Density={density}%, Speed={zone.movement_speed} (mult={speed_mult}), "
                     f"Blocked Exits={blocked_routes}/{total_routes} (ratio={blockage_ratio:.2f}), "
                     f"Unusual Penalty={unusual_penalty} -> Risk Score={risk_score:.2f}%")
        
        # 4. Process Thresholds & Alerting
        if risk_score >= 65.0:
            severity = "critical" if risk_score >= 80.0 else "high"
            title = f"Critical Stampede Surge Risk: {zone.name}" if severity == "critical" else f"Stampede Risk Warning: {zone.name}"
            
            description = (
                f"Calculated risk index is {risk_score:.1f}% based on sector density ({zone.current_density}%), "
                f"flow rate ({zone.movement_speed}), and exit congestion ({blocked_routes}/{total_routes} blocked routes)."
            )
            
            # Check for existing active stampede alert in this zone
            existing_alert = db.query(models.Alert).filter(
                models.Alert.alert_type == "stampede_risk",
                models.Alert.zone_id == zone.id,
                models.Alert.status == "active"
            ).first()
            
            if not existing_alert:
                # Create a new active stampede alert
                existing_alert = models.Alert(
                    id=str(uuid.uuid4()),
                    stadium_id=zone.stadium_id,
                    zone_id=zone.id,
                    zone_code=zone.code,
                    alert_type="stampede_risk",
                    severity=severity,
                    title=title,
                    description=description,
                    status="active",
                    source="system"
                )
                db.add(existing_alert)
                db.commit()
                db.refresh(existing_alert)
                await broadcast_alert_new(existing_alert)
                logger.info(f"Stampede Risk Alert raised: {existing_alert.id} for zone {zone.code} (Score: {risk_score:.1f}%)")
            else:
                # Update details if severity or description changed
                if existing_alert.severity != severity or existing_alert.description != description:
                    existing_alert.severity = severity
                    existing_alert.title = title
                    existing_alert.description = description
                    db.add(existing_alert)
                    db.commit()
                    db.refresh(existing_alert)
                    await broadcast_alert_new(existing_alert)
                    logger.info(f"Stampede Risk Alert updated: {existing_alert.id} for zone {zone.code} (Score: {risk_score:.1f}%)")
            
            # Check/create the AI Agent Recommendation for this prediction alert
            existing_rec = db.query(models.AgentRecommendation).filter(
                models.AgentRecommendation.alert_id == existing_alert.id,
                models.AgentRecommendation.agent_type == "prediction"
            ).first()
            
            if not existing_rec:
                from app.core.ai import generate_ai_recommendation
                
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
                    alert_type="stampede_risk",
                    severity=severity,
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
                
                existing_rec = models.AgentRecommendation(
                    id=str(uuid.uuid4()),
                    stadium_id=zone.stadium_id,
                    alert_id=existing_alert.id,
                    agent_type="prediction",
                    recommendation=ai_rec.recommendation,
                    reasoning=ai_rec.reasoning,
                    suggested_actions=ai_rec.suggested_actions,
                    status="pending"
                )
                db.add(existing_rec)
                db.commit()
                db.refresh(existing_rec)
                await broadcast_agent_recommendation(existing_rec)
                logger.info(f"AI Prediction Recommendation created: {existing_rec.id} for zone {zone.code}")
                
        else:
            # Risk score is safe! Resolve existing active alert for this zone (Self-Healing)
            active_alert = db.query(models.Alert).filter(
                models.Alert.alert_type == "stampede_risk",
                models.Alert.zone_id == zone.id,
                models.Alert.status == "active"
            ).first()
            
            if active_alert:
                active_alert.status = "resolved"
                active_alert.resolved_at = datetime.utcnow()
                db.add(active_alert)
                
                # Rescind any associated pending recommendations
                associated_rec = db.query(models.AgentRecommendation).filter(
                    models.AgentRecommendation.alert_id == active_alert.id,
                    models.AgentRecommendation.status == "pending"
                ).first()
                
                if associated_rec:
                    associated_rec.status = "rejected"
                    db.add(associated_rec)
                    await broadcast_agent_recommendation(associated_rec)
                    
                db.commit()
                db.refresh(active_alert)
                await broadcast_alert_resolved(active_alert)
                logger.info(f"Stampede Risk Alert resolved dynamically: {active_alert.id} for zone {zone.code}")

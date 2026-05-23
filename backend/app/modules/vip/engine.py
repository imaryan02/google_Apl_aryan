import logging
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core import models
from app.core.socket import broadcast_alert_new, broadcast_alert_resolved, broadcast_agent_recommendation

logger = logging.getLogger("VipEngine")

async def evaluate_vip_conflicts(db: Session):
    """
    Evaluates VIP route integrities in real time.
    Flags conflicts if a VIP convoy's primary route is blocked/restricted
    or cuts through a sector currently in warning/critical risk states.
    Raises alerts, spawns coordination advisories, and heals resolved paths.
    """
    # 1. Fetch active and planned VIP movements
    active_vips = db.query(models.VipMovement).filter(
        models.VipMovement.movement_status.in_(["active", "planned"])
    ).all()
    
    for vip in active_vips:
        if not vip.primary_route_id:
            continue
            
        primary_route = db.query(models.Route).filter(models.Route.id == vip.primary_route_id).first()
        if not primary_route:
            continue
            
        zone = db.query(models.Zone).filter(models.Zone.id == primary_route.from_zone_id).first()
        
        # Conflict triggers
        is_route_backup = vip.backup_route_id and vip.primary_route_id == vip.backup_route_id
        is_route_blocked = primary_route.status in ["blocked", "restricted"]
        is_zone_congested = zone and zone.risk_level in ["warning", "critical"] and not is_route_backup
        
        if (is_route_blocked or is_zone_congested) and not is_route_backup:
            # We have an active VIP route conflict!
            
            # Look up if alert is already registered
            alert_desc_like = f"%{vip.vip_name}%"
            existing_alert = db.query(models.Alert).filter(
                models.Alert.alert_type == "vip_conflict",
                models.Alert.description.like(alert_desc_like),
                models.Alert.status == "active"
            ).first()
            
            if not existing_alert:
                # Spawn a brand new high-severity alert
                severity = "critical" if vip.security_level == "VVIP" else "high"
                title = f"VIP Route Compromised: {vip.vip_name}"
                
                desc = f"Primary route '{primary_route.name}' for {vip.vip_name} is compromised. "
                if is_zone_congested:
                    desc += f"Sector {zone.name} density is {zone.current_density}% ({zone.risk_level} risk). "
                if is_route_blocked:
                    desc += f"Physical route status is {primary_route.status}. "
                desc += "Rerouting to backup route is highly advised."
                
                existing_alert = models.Alert(
                    id=str(uuid.uuid4()),
                    stadium_id=vip.stadium_id,
                    zone_id=zone.id if zone else None,
                    zone_code=zone.code if zone else "GLOBAL",
                    alert_type="vip_conflict",
                    severity=severity,
                    title=title,
                    description=desc,
                    status="active",
                    source="system"
                )
                db.add(existing_alert)
                db.commit()
                db.refresh(existing_alert)
                await broadcast_alert_new(existing_alert)
                logger.info(f"VIP Conflict Alert raised: {existing_alert.id} for {vip.vip_name}")
                
            # Check/create the AI Agent Recommendation for this alert
            existing_rec = db.query(models.AgentRecommendation).filter(
                models.AgentRecommendation.alert_id == existing_alert.id,
                models.AgentRecommendation.agent_type == "vip_coordination"
            ).first()
            
            if not existing_rec:
                # Fetch backup route
                backup_route = None
                if vip.backup_route_id:
                    backup_route = db.query(models.Route).filter(models.Route.id == vip.backup_route_id).first()
                    
                rec_text = f"Reserve Backup Route {backup_route.name if backup_route else 'alternate path'} for {vip.vip_name} convoy due to overcrowding."
                
                reasoning = f"Primary route {primary_route.name} cuts through sector {zone.code if zone else 'concourse'} "
                if is_zone_congested:
                    reasoning += f"which is currently at {zone.current_density}% density ({zone.risk_level} risk). "
                if is_route_blocked:
                    reasoning += f"and is currently flagged as {primary_route.status}. "
                reasoning += f"Redirecting transit path to {backup_route.name if backup_route else 'backup route'} bypasses threat zones entirely."
                
                actions = [
                    f"Switch VIP Transit path to Backup Route {backup_route.name if backup_route else 'alternate path'}",
                    "Deploy Security Team to assist convoy transition"
                ]
                
                existing_rec = models.AgentRecommendation(
                    id=str(uuid.uuid4()),
                    stadium_id=vip.stadium_id,
                    alert_id=existing_alert.id,
                    agent_type="vip_coordination",
                    recommendation=rec_text,
                    reasoning=reasoning,
                    suggested_actions=actions,
                    status="pending"
                )
                db.add(existing_rec)
                db.commit()
                db.refresh(existing_rec)
                await broadcast_agent_recommendation(existing_rec)
                logger.info(f"VIP Coordination recommendation created: {existing_rec.id}")
                
        else:
            # No conflict exists! E.g. zone returned to safe or route switched to backup (resolves conflict)
            alert_desc_like = f"%{vip.vip_name}%"
            compromised_alert = db.query(models.Alert).filter(
                models.Alert.alert_type == "vip_conflict",
                models.Alert.description.like(alert_desc_like),
                models.Alert.status == "active"
            ).first()
            
            if compromised_alert:
                # Resolve the alert dynamically (Self-Healing!)
                compromised_alert.status = "resolved"
                compromised_alert.resolved_at = datetime.utcnow()
                db.add(compromised_alert)
                
                # Rescind any associated agent recommendations
                associated_rec = db.query(models.AgentRecommendation).filter(
                    models.AgentRecommendation.alert_id == compromised_alert.id,
                    models.AgentRecommendation.status == "pending"
                ).first()
                
                if associated_rec:
                    associated_rec.status = "rejected" # Mark retracted/rejected
                    db.add(associated_rec)
                    await broadcast_agent_recommendation(associated_rec)
                    
                db.commit()
                db.refresh(compromised_alert)
                await broadcast_alert_resolved(compromised_alert)
                logger.info(f"VIP Conflict resolved dynamically: {compromised_alert.id}")

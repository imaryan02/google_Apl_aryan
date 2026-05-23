from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import models
from typing import Dict, Any, List

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/init")
def get_dashboard_init(db: Session = Depends(get_db)):
    # 1. Fetch zones
    zones = db.query(models.Zone).all()
    # 2. Fetch routes
    routes = db.query(models.Route).all()
    # 3. Fetch alerts
    alerts = db.query(models.Alert).all()
    # 4. Fetch VIP movements
    vip_movements = db.query(models.VipMovement).all()
    # 5. Fetch recommendations
    recommendations = db.query(models.AgentRecommendation).all()
    
    # Map zones to camelCase
    zones_list = []
    for z in zones:
        cam = db.query(models.Camera).filter(models.Camera.zone_id == z.id).first()
        camera_id = cam.id if cam else ""
        zones_list.append({
            "id": z.id,
            "stadiumId": z.stadium_id,
            "name": z.name,
            "code": z.code,
            "capacity": z.capacity,
            "currentDensity": float(z.current_density),
            "movementSpeed": z.movement_speed,
            "riskLevel": z.risk_level,
            "cameraId": camera_id,
            "warningThreshold": float(z.warning_threshold) if z.warning_threshold is not None else 70.0,
            "criticalThreshold": float(z.critical_threshold) if z.critical_threshold is not None else 85.0
        })
        
    # Map routes to camelCase
    routes_list = []
    for r in routes:
        routes_list.append({
            "id": r.id,
            "stadiumId": r.stadium_id,
            "name": r.name,
            "fromZoneId": r.from_zone_id or "",
            "toLocation": r.to_location,
            "routeType": r.route_type,
            "capacity": r.capacity or 0,
            "status": r.status,
            "priority": r.priority,
            "assignedTeamId": r.assigned_team_id,
            "isEmergencyLane": r.is_emergency_lane
        })
        
    # Map alerts to camelCase
    alerts_list = []
    for a in alerts:
        alerts_list.append({
            "id": a.id,
            "stadiumId": a.stadium_id,
            "zoneId": a.zone_id or "",
            "zoneCode": a.zone_code,
            "alertType": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description or "",
            "status": a.status,
            "source": a.source,
            "createdAt": a.created_at.isoformat() if a.created_at else "",
            "resolvedAt": a.resolved_at.isoformat() if a.resolved_at else None
        })
        
    # Map VIP movements to camelCase
    vips_list = []
    for v in vip_movements:
        vips_list.append({
            "id": v.id,
            "stadiumId": v.stadium_id,
            "vipName": v.vip_name,
            "arrivalTime": v.arrival_time,
            "entryGate": v.entry_gate or "",
            "destination": v.destination or "",
            "securityLevel": v.security_level or "Standard",
            "expectedPeople": v.expected_people,
            "convoySize": v.convoy_size,
            "primaryRouteId": v.primary_route_id or "",
            "backupRouteId": v.backup_route_id or "",
            "assignedTeamId": v.assigned_team_id or "",
            "movementStatus": v.movement_status
        })
        
    # Map recommendations to camelCase
    recs_list = []
    for rec in recommendations:
        severity = "high"
        summary = "Smart Routing Advice"
        if rec.alert_id:
            alert = db.query(models.Alert).filter(models.Alert.id == rec.alert_id).first()
            if alert:
                severity = alert.severity
                summary = f"{alert.zone_code} Crowd Redirection Advisory"
        
        recs_list.append({
            "id": rec.id,
            "stadiumId": rec.stadium_id,
            "alertId": rec.alert_id,
            "agentType": rec.agent_type,
            "severity": severity,
            "summary": summary,
            "recommendation": rec.recommendation,
            "reasoning": rec.reasoning or "",
            "suggestedActions": rec.suggested_actions or [],
            "status": rec.status,
            "reviewedBy": rec.reviewed_by or "",
            "createdAt": rec.created_at.isoformat() if rec.created_at else "",
            "reviewedAt": rec.reviewed_at.isoformat() if rec.reviewed_at else None
        })
        
    return {
        "zones": zones_list,
        "routes": routes_list,
        "alerts": alerts_list,
        "vipMovements": vips_list,
        "agentRecommendations": recs_list
    }

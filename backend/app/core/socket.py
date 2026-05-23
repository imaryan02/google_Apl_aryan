import socketio
import logging
from datetime import datetime
from app.core.database import SessionLocal
from app.core import models
import urllib.parse
import json

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SocketIO")

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    # Welcome message with server timestamp
    await sio.emit('system:welcome', {"status": "online", "time": datetime.utcnow().isoformat()}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def ping_test(sid, data):
    # Roundtrip latency checking
    await sio.emit('pong_test', data, to=sid)

# operator:approve-recommendation
@sio.event
async def operator_approve_recommendation(sid, data):
    rec_id = data.get("recommendation_id")
    logger.info(f"Operator {sid} approved recommendation: {rec_id}")
    
    db = SessionLocal()
    try:
        # 1. Fetch AI Recommendation
        rec = db.query(models.AgentRecommendation).filter(models.AgentRecommendation.id == rec_id).first()
        if not rec:
            await sio.emit("error", {"detail": "Recommendation not found"}, to=sid)
            return

        rec.status = "approved"
        rec.reviewed_at = datetime.utcnow()
        rec.reviewed_by = f"Operator-{sid[:4]}"

        # Base operational changes simulation matching Zustand logic
        # Option A: Reroute suggestion (rec1)
        if rec_id == "rec1" or "R-08" in rec.recommendation:
            # 2. Open Route R-08
            route = db.query(models.Route).filter(models.Route.name.like("%R-08%")).first()
            if route:
                route.status = "open"
                db.add(route)
                # Broadcast route change
                await sio.emit("route:update", {
                    "id": route.id,
                    "status": route.status
                })

            # 3. Resolve congestion alert (a1)
            alert = db.query(models.Alert).filter(models.Alert.id == "a1").first()
            if alert:
                alert.status = "resolved"
                alert.resolved_at = datetime.utcnow()
                db.add(alert)
                # Broadcast alert resolved
                await sio.emit("alert:resolved", {"id": alert.id, "status": alert.status, "resolved_at": alert.resolved_at.isoformat()})

            # 4. Relieve Zone D congestion
            zone = db.query(models.Zone).filter(models.Zone.code == "ZONE_D").first()
            if zone:
                zone.current_density = 54.0
                zone.risk_level = "safe"
                zone.movement_speed = "normal"
                db.add(zone)
                # Broadcast zone density relief
                await sio.emit("zone:update", {
                    "id": zone.id,
                    "code": zone.code,
                    "current_density": float(zone.current_density),
                    "risk_level": zone.risk_level,
                    "movement_speed": zone.movement_speed
                })

        # Option B: VIP rerouting suggestion (rec2)
        elif rec_id == "rec2" or "R-12" in rec.recommendation:
            # 2. Switch VIP Primary Route
            vip = db.query(models.VipMovement).filter(models.VipMovement.vip_name.like("%Vance%")).first()
            if vip:
                route_r12 = db.query(models.Route).filter(models.Route.name.like("%R-12%")).first()
                if route_r12:
                    vip.primary_route_id = route_r12.id
                    db.add(vip)
                    # Broadcast VIP track update
                    await sio.emit("vip:update", {
                        "id": vip.id,
                        "primary_route_id": vip.primary_route_id
                    })

            # 3. Resolve Gate F block alert (a2)
            alert = db.query(models.Alert).filter(models.Alert.id == "a2").first()
            if alert:
                alert.status = "resolved"
                alert.resolved_at = datetime.utcnow()
                db.add(alert)
                # Broadcast alert resolved
                await sio.emit("alert:resolved", {"id": alert.id, "status": alert.status, "resolved_at": alert.resolved_at.isoformat()})

        # Generic alert resolution for approved recommendations
        if rec.alert_id:
            alert = db.query(models.Alert).filter(models.Alert.id == rec.alert_id).first()
            if alert:
                alert.status = "resolved"
                alert.resolved_at = datetime.utcnow()
                db.add(alert)
                # Broadcast alert resolved
                await sio.emit("alert:resolved", {
                    "id": alert.id,
                    "status": alert.status,
                    "resolved_at": alert.resolved_at.isoformat()
                })

        db.add(rec)
        db.commit()

        # Run VIP conflict checks to propagate any status updates
        try:
            from app.modules.vip.engine import evaluate_vip_conflicts
            await evaluate_vip_conflicts(db)
        except Exception as e:
            logger.error(f"Error evaluating VIP conflicts after recommendation approval: {e}")

        # Run stampede prediction evaluation after recommendation approval
        try:
            from app.modules.prediction.engine import evaluate_stampede_predictions
            await evaluate_stampede_predictions(db)
        except Exception as e:
            logger.error(f"Error running stampede prediction engine after recommendation approval: {e}")

        # Emit the approved recommendation state update
        await sio.emit("agent:recommendation", {
            "id": rec.id,
            "status": rec.status,
            "reviewed_at": rec.reviewed_at.isoformat(),
            "reviewed_by": rec.reviewed_by
        })
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error executing recommendation approval: {e}")
        await sio.emit("error", {"detail": str(e)}, to=sid)
    finally:
        db.close()

# operator:reject-recommendation
@sio.event
async def operator_reject_recommendation(sid, data):
    rec_id = data.get("recommendation_id")
    logger.info(f"Operator {sid} rejected recommendation: {rec_id}")
    
    db = SessionLocal()
    try:
        rec = db.query(models.AgentRecommendation).filter(models.AgentRecommendation.id == rec_id).first()
        if not rec:
            await sio.emit("error", {"detail": "Recommendation not found"}, to=sid)
            return

        rec.status = "rejected"
        rec.reviewed_at = datetime.utcnow()
        rec.reviewed_by = f"Operator-{sid[:4]}"
        db.add(rec)
        db.commit()

        # Broadcast the rejection update
        await sio.emit("agent:recommendation", {
            "id": rec.id,
            "status": rec.status,
            "reviewed_at": rec.reviewed_at.isoformat(),
            "reviewed_by": rec.reviewed_by
        })
    except Exception as e:
        db.rollback()
        await sio.emit("error", {"detail": str(e)}, to=sid)
    finally:
        db.close()

# operator:block-route / update-route
@sio.event
async def operator_update_route(sid, data):
    route_id = data.get("route_id")
    status = data.get("status")
    logger.info(f"Operator {sid} updated route {route_id} status to: {status}")
    
    db = SessionLocal()
    try:
        route = db.query(models.Route).filter(models.Route.id == route_id).first()
        if not route:
            await sio.emit("error", {"detail": "Route not found"}, to=sid)
            return

        route.status = status
        db.add(route)
        db.commit()

        # Broadcast update to all connected screens
        await sio.emit("route:update", {
            "id": route.id,
            "status": route.status
        })

        # Run stampede prediction engine since route status changed
        try:
            from app.modules.prediction.engine import evaluate_stampede_predictions
            await evaluate_stampede_predictions(db)
        except Exception as e:
            logger.error(f"Error running stampede prediction engine on socket route update: {e}")
    except Exception as e:
        db.rollback()
        await sio.emit("error", {"detail": str(e)}, to=sid)
    finally:
        db.close()

# operator:activate-emergency
@sio.event
async def operator_activate_emergency(sid, data):
    active = data.get("emergency_mode", False)
    logger.info(f"Operator {sid} set emergency mode: {active}")
    
    db = SessionLocal()
    try:
        # In emergency mode, open all emergency routes and mark all zones as warning/critical
        zones = db.query(models.Zone).all()
        for zone in zones:
            if active:
                zone.risk_level = "critical"
                zone.movement_speed = "stagnant"
            else:
                # Recalculate based on density
                density = float(zone.current_density)
                if density >= float(zone.critical_threshold):
                    zone.risk_level = "critical"
                    zone.movement_speed = "stagnant"
                elif density >= float(zone.warning_threshold):
                    zone.risk_level = "warning"
                    zone.movement_speed = "slow"
                else:
                    zone.risk_level = "safe"
                    zone.movement_speed = "normal"
            db.add(zone)

        routes = db.query(models.Route).all()
        for r in routes:
            if active and (r.is_emergency_lane or r.route_type == "emergency"):
                r.status = "open"
                db.add(r)

        # Trigger or resolve emergency alert
        if active:
            stadium = db.query(models.Stadium).first()
            stadium_id = stadium.id if stadium else "s1"
            emerg_alert = models.Alert(
                id=f"alert-emerg-{int(datetime.utcnow().timestamp())}",
                stadium_id=stadium_id,
                zone_code="GLOBAL",
                alert_type="emergency_incident",
                severity="critical",
                title="GLOBAL EVACUATION ALERT TRIGGERED",
                description="System-wide emergency override activated by Stadium Commander. Egress pathways opened.",
                status="active",
                source="system"
            )
            db.add(emerg_alert)
            db.commit()

            # Broadcast new alert and emergency signal
            await sio.emit("alert:new", {
                "id": emerg_alert.id,
                "stadium_id": emerg_alert.stadium_id,
                "zone_code": emerg_alert.zone_code,
                "alert_type": emerg_alert.alert_type,
                "severity": emerg_alert.severity,
                "title": emerg_alert.title,
                "description": emerg_alert.description,
                "status": emerg_alert.status,
                "source": emerg_alert.source,
                "created_at": emerg_alert.created_at.isoformat()
            })
        else:
            # Clear all emergency alerts
            db.query(models.Alert).filter(models.Alert.alert_type == "emergency_incident").delete()
            db.commit()

        # Emit the global emergency mode toggle
        await sio.emit("emergency:triggered", {
            "emergency_mode": active,
            "crowd_health_score": 24 if active else 78
        })

        # Sync all zones and routes
        updated_zones = db.query(models.Zone).all()
        for z in updated_zones:
            await sio.emit("zone:update", {
                "id": z.id,
                "code": z.code,
                "current_density": float(z.current_density),
                "risk_level": z.risk_level,
                "movement_speed": z.movement_speed
            })
            
        updated_routes = db.query(models.Route).all()
        for r in updated_routes:
            await sio.emit("route:update", {
                "id": r.id,
                "status": r.status
            })

    except Exception as e:
        db.rollback()
        logger.error(f"Error handling emergency activate: {e}")
        await sio.emit("error", {"detail": str(e)}, to=sid)
    finally:
        db.close()

# operator:update-vip-status
@sio.event
async def operator_update_vip_status(sid, data):
    vip_id = data.get("vip_id")
    status = data.get("movement_status")
    logger.info(f"Operator {sid} updated VIP {vip_id} movement status to: {status}")
    
    db = SessionLocal()
    try:
        vip = db.query(models.VipMovement).filter(models.VipMovement.id == vip_id).first()
        if not vip:
            await sio.emit("error", {"detail": "VIP schedule not found"}, to=sid)
            return

        vip.movement_status = status
        db.add(vip)
        db.commit()

        # Broadcast update
        await sio.emit("vip:update", {
            "id": vip.id,
            "movement_status": vip.movement_status
        })
    except Exception as e:
        db.rollback()
        await sio.emit("error", {"detail": str(e)}, to=sid)
    finally:
        db.close()

# Helper broadcast emitters for REST routes triggers
async def broadcast_zone_update(zone):
    await sio.emit("zone:update", {
        "id": zone.id,
        "code": zone.code,
        "current_density": float(zone.current_density),
        "risk_level": zone.risk_level,
        "movement_speed": zone.movement_speed,
        "warning_threshold": float(zone.warning_threshold) if zone.warning_threshold is not None else 70.0,
        "critical_threshold": float(zone.critical_threshold) if zone.critical_threshold is not None else 85.0
    })

async def broadcast_alert_new(alert):
    await sio.emit("alert:new", {
        "id": alert.id,
        "stadium_id": alert.stadium_id,
        "zone_id": alert.zone_id,
        "zone_code": alert.zone_code,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "description": alert.description,
        "status": alert.status,
        "source": alert.source,
        "created_at": alert.created_at.isoformat()
    })

async def broadcast_alert_resolved(alert):
    await sio.emit("alert:resolved", {
        "id": alert.id,
        "status": alert.status,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
    })

async def broadcast_route_update(route):
    await sio.emit("route:update", {
        "id": route.id,
        "status": route.status
    })

async def broadcast_vip_update(vip):
    await sio.emit("vip:update", {
        "id": vip.id,
        "stadium_id": vip.stadium_id,
        "vip_name": vip.vip_name,
        "arrival_time": vip.arrival_time,
        "entry_gate": vip.entry_gate,
        "destination": vip.destination,
        "security_level": vip.security_level,
        "expected_people": vip.expected_people,
        "convoy_size": vip.convoy_size,
        "primary_route_id": vip.primary_route_id,
        "backup_route_id": vip.backup_route_id,
        "assigned_team_id": vip.assigned_team_id,
        "movement_status": vip.movement_status
    })

async def broadcast_agent_recommendation(rec):
    # Fetch severity and summary from associated alert if possible
    severity = "high"
    summary = "Smart Routing Advice"
    if rec.alert_id:
        try:
            db = SessionLocal()
            alert = db.query(models.Alert).filter(models.Alert.id == rec.alert_id).first()
            if alert:
                severity = alert.severity
                summary = f"{alert.zone_code} Crowd Redirection Advisory"
            db.close()
        except Exception:
            pass
            
    await sio.emit("agent:recommendation", {
        "id": rec.id,
        "stadium_id": rec.stadium_id,
        "alert_id": rec.alert_id,
        "agent_type": rec.agent_type,
        "severity": severity,
        "summary": summary,
        "recommendation": rec.recommendation,
        "reasoning": rec.reasoning,
        "suggested_actions": rec.suggested_actions,
        "status": rec.status,
        "created_at": rec.created_at.isoformat() if isinstance(rec.created_at, datetime) else rec.created_at,
        "reviewed_at": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
        "reviewed_by": rec.reviewed_by
    })


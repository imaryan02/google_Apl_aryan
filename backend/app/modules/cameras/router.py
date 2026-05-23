from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core import models
from app.shared import schemas
from app.core.socket import broadcast_alert_new, broadcast_alert_resolved

router = APIRouter(prefix="/cameras", tags=["cameras"])

@router.get("/", response_model=List[schemas.CameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    return db.query(models.Camera).all()

@router.get("/{camera_id}", response_model=schemas.CameraResponse)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.patch("/{camera_id}/status", response_model=schemas.CameraResponse)
async def update_camera_status(camera_id: str, payload: schemas.CameraStatusUpdate, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    old_status = camera.status
    new_status = payload.status
    camera.status = new_status
    db.add(camera)
    db.commit()
    db.refresh(camera)
    
    # Run diagnostics checks: raise or resolve alarms when status changes
    if old_status != new_status:
        # Fetch associated zone
        zone = db.query(models.Zone).filter(models.Zone.id == camera.zone_id).first() if camera.zone_id else None
        zone_code = zone.code if zone else "GLOBAL"
        
        # Unique alert ID reference for clean identification (36 chars constraint)
        alert_ref_id = camera.id
        
        if new_status == "offline":
            # Check if active alert already exists
            active_alert = db.query(models.Alert).filter(
                models.Alert.id == alert_ref_id,
                models.Alert.status == "active"
            ).first()
            
            if not active_alert:
                active_alert = models.Alert(
                    id=alert_ref_id,
                    stadium_id=camera.stadium_id,
                    zone_id=camera.zone_id,
                    zone_code=zone_code,
                    alert_type="camera_failure",
                    severity="high",
                    title=f"CCTV Link Loss - {camera.name}",
                    description=f"Telemetry feed connection offline on {camera.name} in {zone.name if zone else 'stadium concourse'}. Automatic responder dispatcher check flagged.",
                    status="active",
                    source="system"
                )
                db.add(active_alert)
                db.commit()
                db.refresh(active_alert)
                await broadcast_alert_new(active_alert)
        elif new_status == "active" or new_status == "online":
            # Resolve camera failure alerts
            active_alert = db.query(models.Alert).filter(
                models.Alert.id == alert_ref_id,
                models.Alert.status == "active"
            ).first()
            
            if active_alert:
                active_alert.status = "resolved"
                active_alert.resolved_at = datetime.utcnow()
                db.add(active_alert)
                db.commit()
                db.refresh(active_alert)
                await broadcast_alert_resolved(active_alert)
                
    return camera

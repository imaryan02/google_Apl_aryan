from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core import models
from app.shared import schemas

from app.core.socket import broadcast_alert_new, broadcast_alert_resolved

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/", response_model=List[schemas.AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alert).all()

@router.get("/active", response_model=List[schemas.AlertResponse])
def get_active_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alert).filter(models.Alert.status == "active").all()

@router.get("/{alert_id}", response_model=schemas.AlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.post("/", response_model=schemas.AlertResponse)
async def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    # Verify zone exists if zone_id is provided
    if alert.zone_id:
        zone = db.query(models.Zone).filter(models.Zone.id == alert.zone_id).first()
        if not zone:
            raise HTTPException(status_code=400, detail="Zone not found")
            
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    await broadcast_alert_new(db_alert)
    return db_alert

@router.patch("/{alert_id}/resolve", response_model=schemas.AlertResponse)
async def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    await broadcast_alert_resolved(alert)
    return alert

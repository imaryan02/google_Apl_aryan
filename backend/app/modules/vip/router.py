from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core import models
from app.shared import schemas

from app.core.socket import sio, broadcast_vip_update

router = APIRouter(prefix="/vip-movements", tags=["vip"])

@router.get("/", response_model=List[schemas.VipMovementResponse])
def get_vip_movements(db: Session = Depends(get_db)):
    return db.query(models.VipMovement).all()

from app.modules.vip.engine import evaluate_vip_conflicts

@router.post("/", response_model=schemas.VipMovementResponse)
async def schedule_vip_movement(vip: schemas.VipMovementCreate, db: Session = Depends(get_db)):
    if vip.primary_route_id:
        r1 = db.query(models.Route).filter(models.Route.id == vip.primary_route_id).first()
        if not r1:
            raise HTTPException(status_code=400, detail="Primary route id not found")
    if vip.backup_route_id:
        r2 = db.query(models.Route).filter(models.Route.id == vip.backup_route_id).first()
        if not r2:
            raise HTTPException(status_code=400, detail="Backup route id not found")
            
    db_vip = models.VipMovement(**vip.model_dump())
    db.add(db_vip)
    db.commit()
    db.refresh(db_vip)
    
    await broadcast_vip_update(db_vip)
    await evaluate_vip_conflicts(db)
    return db_vip

@router.put("/{vip_id}", response_model=schemas.VipMovementResponse)
async def update_vip_movement(vip_id: str, vip: schemas.VipMovementCreate, db: Session = Depends(get_db)):
    db_vip = db.query(models.VipMovement).filter(models.VipMovement.id == vip_id).first()
    if not db_vip:
        raise HTTPException(status_code=404, detail="VIP record not found")
        
    if vip.primary_route_id:
        r1 = db.query(models.Route).filter(models.Route.id == vip.primary_route_id).first()
        if not r1:
            raise HTTPException(status_code=400, detail="Primary route id not found")
    if vip.backup_route_id:
        r2 = db.query(models.Route).filter(models.Route.id == vip.backup_route_id).first()
        if not r2:
            raise HTTPException(status_code=400, detail="Backup route id not found")
            
    for key, val in vip.model_dump().items():
        setattr(db_vip, key, val)
        
    db.commit()
    db.refresh(db_vip)
    await broadcast_vip_update(db_vip)
    await evaluate_vip_conflicts(db)
    return db_vip

@router.delete("/{vip_id}")
async def delete_vip_movement(vip_id: str, db: Session = Depends(get_db)):
    db_vip = db.query(models.VipMovement).filter(models.VipMovement.id == vip_id).first()
    if not db_vip:
        raise HTTPException(status_code=404, detail="VIP record not found")
        
    db.delete(db_vip)
    db.commit()
    await sio.emit("vip:delete", {"id": vip_id})
    return {"success": True}

@router.patch("/{vip_id}/status", response_model=schemas.VipMovementResponse)
async def update_vip_status(vip_id: str, payload: schemas.VipMovementStatusUpdate, db: Session = Depends(get_db)):
    db_vip = db.query(models.VipMovement).filter(models.VipMovement.id == vip_id).first()
    if not db_vip:
        raise HTTPException(status_code=404, detail="VIP record not found")
        
    db_vip.movement_status = payload.movement_status
    db.commit()
    db.refresh(db_vip)
    await broadcast_vip_update(db_vip)
    await evaluate_vip_conflicts(db)
    return db_vip

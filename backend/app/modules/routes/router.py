from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core import models
from app.shared import schemas

from app.core.socket import broadcast_route_update

router = APIRouter(prefix="/routes", tags=["routes"])

@router.get("/", response_model=List[schemas.RouteResponse])
def get_routes(db: Session = Depends(get_db)):
    return db.query(models.Route).all()

@router.post("/", response_model=schemas.RouteResponse)
def create_route(route: schemas.RouteCreate, db: Session = Depends(get_db)):
    # Verify zone exists
    zone = db.query(models.Zone).filter(models.Zone.id == route.from_zone_id).first()
    if not zone:
        raise HTTPException(status_code=400, detail="Reference From-Zone not found")
        
    db_route = models.Route(**route.model_dump())
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

@router.patch("/{route_id}/status", response_model=schemas.RouteResponse)
async def update_route_status(route_id: str, payload: schemas.RouteStatusUpdate, db: Session = Depends(get_db)):
    db_route = db.query(models.Route).filter(models.Route.id == route_id).first()
    if not db_route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    db_route.status = payload.status
    db.commit()
    db.refresh(db_route)
    await broadcast_route_update(db_route)
    
    # Run stampede prediction engine since route status changed (impacts exit availability!)
    try:
        from app.modules.prediction.engine import evaluate_stampede_predictions
        await evaluate_stampede_predictions(db)
    except Exception as e:
        pass
        
    return db_route

from app.modules.routes import engine

@router.post("/suggest", response_model=schemas.RouteSuggestResponse)
def suggest_route(payload: schemas.RouteSuggestRequest, db: Session = Depends(get_db)):
    res = engine.find_optimal_path(
        db,
        from_zone_code=payload.from_zone_code,
        target_location=payload.to_location,
        emergency_mode=payload.emergency_mode
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to compute path"))
    return res


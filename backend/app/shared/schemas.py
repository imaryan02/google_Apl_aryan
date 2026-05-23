from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class StadiumBase(BaseModel):
    name: str
    location: Optional[str] = None
    total_capacity: Optional[int] = None

class StadiumCreate(StadiumBase):
    pass

class StadiumResponse(StadiumBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ZoneBase(BaseModel):
    name: str
    code: str
    capacity: int
    warning_threshold: float = 70.0
    critical_threshold: float = 85.0
    current_density: float = 0.0
    movement_speed: str = "normal"
    risk_level: str = "safe"

class ZoneCreate(ZoneBase):
    stadium_id: str

class ZoneResponse(ZoneBase):
    id: str
    stadium_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ZoneThresholdUpdate(BaseModel):
    warning_threshold: float
    critical_threshold: float

class RouteBase(BaseModel):
    name: str
    from_zone_id: Optional[str] = None
    to_location: str
    route_type: str
    capacity: Optional[int] = None
    status: str = "open"
    priority: int = 1
    assigned_team_id: Optional[str] = None
    is_emergency_lane: bool = False

class RouteCreate(RouteBase):
    stadium_id: str

class RouteResponse(RouteBase):
    id: str
    stadium_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RouteStatusUpdate(BaseModel):
    status: str

class VipMovementBase(BaseModel):
    vip_name: str
    arrival_time: str
    entry_gate: Optional[str] = None
    destination: Optional[str] = None
    security_level: Optional[str] = "Standard"
    expected_people: int = 1
    convoy_size: int = 1
    primary_route_id: Optional[str] = None
    backup_route_id: Optional[str] = None
    assigned_team_id: Optional[str] = None
    movement_status: str = "planned"

class VipMovementCreate(VipMovementBase):
    stadium_id: str

class VipMovementResponse(VipMovementBase):
    id: str
    stadium_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class VipMovementStatusUpdate(BaseModel):
    movement_status: str

class AlertBase(BaseModel):
    zone_id: Optional[str] = None
    zone_code: str
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    status: str = "active"
    source: str = "system"

class AlertCreate(AlertBase):
    stadium_id: str

class AlertResponse(AlertBase):
    id: str
    stadium_id: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AgentRecommendationBase(BaseModel):
    alert_id: Optional[str] = None
    agent_type: str
    recommendation: str
    reasoning: Optional[str] = None
    suggested_actions: List[str]
    status: str = "pending"

class AgentRecommendationCreate(AgentRecommendationBase):
    stadium_id: str

class AgentRecommendationResponse(AgentRecommendationBase):
    id: str
    stadium_id: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class CameraBase(BaseModel):
    name: str
    stream_url: Optional[str] = None
    camera_type: str = "cctv"
    status: str = "active"

class CameraCreate(CameraBase):
    stadium_id: str
    zone_id: Optional[str] = None

class CameraResponse(CameraBase):
    id: str
    stadium_id: str
    zone_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CameraStatusUpdate(BaseModel):
    status: str

class RouteSuggestRequest(BaseModel):
    from_zone_code: str
    to_location: Optional[str] = None
    emergency_mode: Optional[bool] = False

class RouteEdgeTraversed(BaseModel):
    from_node: str
    to_node: str
    name: str
    type: str
    weight: float
    capacity: int

class RouteSuggestResponse(BaseModel):
    success: bool
    source: str
    destination: Optional[str] = None
    path: List[str]
    total_weight: float
    bottleneck_capacity: int
    estimated_clearance_time: float
    reason: str
    edges: List[RouteEdgeTraversed]


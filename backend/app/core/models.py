import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Stadium(Base):
    __tablename__ = "stadiums"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    total_capacity = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class Zone(Base):
    __tablename__ = "zones"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False) # ZONE_A to ZONE_H
    capacity = Column(Integer, nullable=False)
    warning_threshold = Column(Numeric, default=70.0)
    critical_threshold = Column(Numeric, default=85.0)
    current_density = Column(Numeric, default=0.0)
    movement_speed = Column(String(20), default="normal") # normal, slow, stagnant
    risk_level = Column(String(20), default="safe") # safe, warning, critical
    created_at = Column(DateTime, default=datetime.utcnow)

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    zone_id = Column(String(36), ForeignKey("zones.id", ondelete="SET NULL"))
    name = Column(String(100), nullable=False)
    stream_url = Column(String(500))
    camera_type = Column(String(50), default="cctv")
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

class SecurityTeam(Base):
    __tablename__ = "security_teams"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    team_type = Column(String(50)) # SWAT, medical, crowd_control
    contact_number = Column(String(20))
    current_location = Column(String(100))
    status = Column(String(20), default="available") # available, deploying, busy
    created_at = Column(DateTime, default=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False) # R-01, E-02
    from_zone_id = Column(String(36), ForeignKey("zones.id"))
    to_location = Column(String(100), nullable=False)
    route_type = Column(String(20), nullable=False) # public, vip, staff, emergency
    capacity = Column(Integer)
    status = Column(String(20), default="open") # open, restricted, blocked, reserved
    priority = Column(Integer, default=1)
    assigned_team_id = Column(String(36), ForeignKey("security_teams.id"))
    is_emergency_lane = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class VipMovement(Base):
    __tablename__ = "vip_movements"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    vip_name = Column(String(100), nullable=False)
    arrival_time = Column(String(50), nullable=False)
    entry_gate = Column(String(100))
    destination = Column(String(100))
    security_level = Column(String(20)) # VVIP, VIP
    expected_people = Column(Integer, default=1)
    convoy_size = Column(Integer, default=1)
    primary_route_id = Column(String(36), ForeignKey("routes.id"))
    backup_route_id = Column(String(36), ForeignKey("routes.id"))
    assigned_team_id = Column(String(36), ForeignKey("security_teams.id"))
    movement_status = Column(String(20), default="planned") # planned, active, completed
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    zone_id = Column(String(36), ForeignKey("zones.id"))
    zone_code = Column(String(20), nullable=False)
    alert_type = Column(String(50), nullable=False) # congestion, stampede_risk
    severity = Column(String(20), nullable=False) # low, medium, high, critical
    title = Column(String(150), nullable=False)
    description = Column(String(500))
    status = Column(String(20), default="active") # active, resolved
    source = Column(String(20), default="system") # system, ai_agent
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(String(36), ForeignKey("alerts.id"))
    zone_id = Column(String(36), ForeignKey("zones.id"))
    incident_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    assigned_team_id = Column(String(36), ForeignKey("security_teams.id"))
    status = Column(String(20), default="open") # open, investigating, resolved
    response_notes = Column(String(500))
    started_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)

class AgentRecommendation(Base):
    __tablename__ = "agent_recommendations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    alert_id = Column(String(36), ForeignKey("alerts.id"))
    agent_type = Column(String(50), nullable=False) # routing, prediction
    recommendation = Column(String(1000), nullable=False)
    reasoning = Column(String(1000))
    suggested_actions = Column(JSON) # JSON array of proposed checklists
    status = Column(String(20), default="pending") # pending, approved, rejected
    reviewed_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    stadium_id = Column(String(36), ForeignKey("stadiums.id", ondelete="CASCADE"), nullable=False)
    actor_type = Column(String(50), nullable=False) # operator, ai_agent, system
    actor_name = Column(String(100))
    action = Column(String(200), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(String(36))
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

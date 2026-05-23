from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core import models
import uuid

def seed_db_if_empty():
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        has_stadium = db.query(models.Stadium).first()
        if has_stadium:
            return
    finally:
        db.close()

    seed_db()

def seed_db():
    # Make sure all tables are created
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Clear existing data to allow safe consecutive reseeds
        db.query(models.AuditLog).delete()
        db.query(models.AgentRecommendation).delete()
        db.query(models.Incident).delete()
        db.query(models.Alert).delete()
        db.query(models.VipMovement).delete()
        db.query(models.Route).delete()
        db.query(models.SecurityTeam).delete()
        db.query(models.Camera).delete()
        db.query(models.Zone).delete()
        db.query(models.Stadium).delete()
        db.commit()

        print("DB Cleared... Seeding baseline hackathon metrics.")

        # 1. Seed Stadium
        stadium_id = str(uuid.uuid4())
        stadium = models.Stadium(
            id=stadium_id,
            name="Apex Coliseum",
            location="Gate-6 Tactical Sector, Atlanta GA",
            total_capacity=80000
        )
        db.add(stadium)
        db.commit()

        # 2. Seed 8 Intelligent Zones
        zones_data = [
            {"code": "ZONE_A", "name": "Gate A Entrance", "cap": 10000, "dens": 42, "risk": "safe", "speed": "normal"},
            {"code": "ZONE_B", "name": "North Concourse", "cap": 8000, "dens": 65, "risk": "safe", "speed": "normal"},
            {"code": "ZONE_C", "name": "VIP East Lounge", "cap": 5000, "dens": 28, "risk": "safe", "speed": "normal"},
            {"code": "ZONE_D", "name": "Lower Deck South", "cap": 15000, "dens": 88, "risk": "critical", "speed": "slow"},
            {"code": "ZONE_E", "name": "Upper Deck West", "cap": 12000, "dens": 52, "risk": "safe", "speed": "normal"},
            {"code": "ZONE_F", "name": "Gate F Plaza", "cap": 11000, "dens": 74, "risk": "warning", "speed": "slow"},
            {"code": "ZONE_G", "name": "Food Court West", "cap": 9000, "dens": 48, "risk": "safe", "speed": "normal"},
            {"code": "ZONE_H", "name": "Press & Media Deck", "cap": 4000, "dens": 15, "risk": "safe", "speed": "normal"},
        ]

        zone_instances = {}
        for z in zones_data:
            zone_id = str(uuid.uuid4())
            zone = models.Zone(
                id=zone_id,
                stadium_id=stadium_id,
                name=z["name"],
                code=z["code"],
                capacity=z["cap"],
                current_density=z["dens"],
                risk_level=z["risk"],
                movement_speed=z["speed"],
                warning_threshold=70.0,
                critical_threshold=85.0
            )
            db.add(zone)
            zone_instances[z["code"]] = zone_id
        db.commit()

        # 3. Seed 8 Mapped CCTV Cameras
        for idx, (code, z_id) in enumerate(zone_instances.items(), 1):
            camera = models.Camera(
                stadium_id=stadium_id,
                zone_id=z_id,
                name=f"CCTV Cam-{idx} ({code.replace('ZONE_', 'Sector ')})",
                stream_url=f"rtsp://10.0.12.10{idx}/live/h264",
                camera_type="ptz" if idx % 2 == 0 else "bullet",
                status="active"
            )
            db.add(camera)
        db.commit()

        # 4. Seed 3 Core Security Responder Teams
        teams_data = [
            {"name": "Team Alpha (Crowd Flow Control)", "type": "crowd_control", "contact": "+1-404-555-0192", "loc": "Zone D corridor"},
            {"name": "Team Bravo (VVIP Tactical Escort)", "type": "security_escort", "contact": "+1-404-555-0138", "loc": "VIP East Parking"},
            {"name": "Team Charlie (Emergency Medical Response)", "type": "medical", "contact": "+1-404-555-0174", "loc": "South Egress gate"},
        ]
        
        team_instances = {}
        for idx, t in enumerate(teams_data, 1):
            team_id = str(uuid.uuid4())
            team = models.SecurityTeam(
                id=team_id,
                stadium_id=stadium_id,
                name=t["name"],
                team_type=t["type"],
                contact_number=t["contact"],
                current_location=t["loc"],
                status="available"
            )
            db.add(team)
            team_instances[f"t{idx}"] = team_id
        db.commit()

        # 5. Seed 8 Routes
        routes_data = [
            {"name": "R-01", "from": "ZONE_A", "dest": "Gate A Exit", "type": "public", "cap": 5000, "status": "open", "pri": 1, "is_em": False, "team": None},
            {"name": "R-02", "from": "ZONE_B", "dest": "Gate B Main Exit", "type": "public", "cap": 4000, "status": "open", "pri": 1, "is_em": False, "team": None},
            {"name": "R-03 (VIP East)", "from": "ZONE_C", "dest": "Secure VIP Parking", "type": "vip", "cap": 1000, "status": "reserved", "pri": 2, "is_em": False, "team": "t2"},
            {"name": "R-04 (Choke Point)", "from": "ZONE_D", "dest": "South Plaza Gate 4", "type": "public", "cap": 6000, "status": "restricted", "pri": 1, "is_em": False, "team": "t3"},
            {"name": "R-08 Bypass", "from": "ZONE_D", "dest": "Gate 6 Outer Plaza", "type": "public", "cap": 8000, "status": "blocked", "pri": 3, "is_em": False, "team": None},
            {"name": "E-01 (Primary)", "from": "ZONE_D", "dest": "Emergency Exit Tunnel 1", "type": "emergency", "cap": 3000, "status": "open", "pri": 5, "is_em": True, "team": None},
            {"name": "E-02 (Alternate)", "from": "ZONE_F", "dest": "Emergency Exit Tunnel 2", "type": "emergency", "cap": 3000, "status": "open", "pri": 5, "is_em": True, "team": None},
            {"name": "R-12 VIP backup", "from": "ZONE_C", "dest": "VVIP Helipad", "type": "vip", "cap": 500, "status": "open", "pri": 2, "is_em": False, "team": None},
        ]

        route_instances = {}
        for r in routes_data:
            route_id = str(uuid.uuid4())
            route = models.Route(
                id=route_id,
                stadium_id=stadium_id,
                name=r["name"],
                from_zone_id=zone_instances[r["from"]],
                to_location=r["dest"],
                route_type=r["type"],
                capacity=r["cap"],
                status=r["status"],
                priority=r["pri"],
                is_emergency_lane=r["is_em"],
                assigned_team_id=team_instances[r["team"]] if r["team"] else None
            )
            db.add(route)
            route_instances[r["name"]] = route_id
        db.commit()

        # 6. Seed 2 VIP Movements
        vip_convoy = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Senator Vance & Convoy",
            arrival_time="11:45 AM",
            entry_gate="Gate C VVIP Entrance",
            destination="VIP Box 12",
            security_level="VVIP",
            expected_people=12,
            convoy_size=3,
            primary_route_id=route_instances["R-03 (VIP East)"],
            backup_route_id=route_instances["R-12 VIP backup"],
            assigned_team_id=team_instances["t2"],
            movement_status="active"
        )
        vip_ambassador = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Ambassador Thorne",
            arrival_time="12:15 PM",
            entry_gate="VVIP Helipad",
            destination="Press & Media Deck",
            security_level="VIP",
            expected_people=4,
            convoy_size=1,
            primary_route_id=route_instances["R-12 VIP backup"],
            backup_route_id=route_instances["R-03 (VIP East)"],
            assigned_team_id=team_instances["t1"],
            movement_status="planned"
        )
        vip_modi = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Narendra Modi",
            arrival_time="01:00 PM",
            entry_gate="Gate C VVIP Entrance",
            destination="VIP Box 01",
            security_level="VVIP",
            expected_people=20,
            convoy_size=5,
            primary_route_id=route_instances["R-03 (VIP East)"],
            backup_route_id=route_instances["R-12 VIP backup"],
            assigned_team_id=team_instances["t2"],
            movement_status="planned"
        )
        vip_shah = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Amit Shah",
            arrival_time="01:30 PM",
            entry_gate="Gate C VVIP Entrance",
            destination="VIP Box 02",
            security_level="VVIP",
            expected_people=15,
            convoy_size=4,
            primary_route_id=route_instances["R-03 (VIP East)"],
            backup_route_id=route_instances["R-12 VIP backup"],
            assigned_team_id=team_instances["t2"],
            movement_status="planned"
        )
        vip_ambani = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Mukesh Ambani",
            arrival_time="02:00 PM",
            entry_gate="VVIP Helipad",
            destination="Presidential Suite",
            security_level="VVIP",
            expected_people=8,
            convoy_size=3,
            primary_route_id=route_instances["R-12 VIP backup"],
            backup_route_id=route_instances["R-03 (VIP East)"],
            assigned_team_id=team_instances["t1"],
            movement_status="planned"
        )
        vip_khan = models.VipMovement(
            stadium_id=stadium_id,
            vip_name="Sharukh Khan",
            arrival_time="02:30 PM",
            entry_gate="Gate A Entrance",
            destination="Corporate Box B",
            security_level="VIP",
            expected_people=6,
            convoy_size=2,
            primary_route_id=route_instances["R-01"],
            backup_route_id=route_instances["R-02"],
            assigned_team_id=team_instances["t1"],
            movement_status="planned"
        )
        db.add(vip_convoy)
        db.add(vip_ambassador)
        db.add(vip_modi)
        db.add(vip_shah)
        db.add(vip_ambani)
        db.add(vip_khan)
        db.commit()

        # 7. Seed 2 Active Alarms
        alert_congestion = models.Alert(
            id="a1",
            stadium_id=stadium_id,
            zone_id=zone_instances["ZONE_D"],
            zone_code="ZONE_D",
            alert_type="congestion",
            severity="critical",
            title="South Deck Congestion Critical",
            description="Zone D density has exceeded 85% and speed is dropping. High risk of crowd compression.",
            status="active",
            source="system"
        )
        alert_obstruction = models.Alert(
            id="a2",
            stadium_id=stadium_id,
            zone_id=zone_instances["ZONE_F"],
            zone_code="ZONE_F",
            alert_type="stampede_risk",
            severity="high",
            title="Plaza Exit Obstruction Warning",
            description="Gate F Plaza bottleneck buildup. Exits are slow due to route restrictions.",
            status="active",
            source="system"
        )
        db.add(alert_congestion)
        db.add(alert_obstruction)
        db.commit()

        # 8. Seed 2 Active AI Recommendations matching frontend mockups
        rec_routing = models.AgentRecommendation(
            id="rec1",
            stadium_id=stadium_id,
            alert_id="a1",
            agent_type="smart_routing",
            recommendation="Open Alternate Route R-08 (Gate 6 Outer Plaza Bypass) and reroute incoming crowd.",
            reasoning="Zone D density is currently 88% with stagnant movement speed. Open Route R-08 immediately has an available capacity of 8,000 to relieve 34% of pressure towards the South Exit in under 4 minutes.",
            suggested_actions=["Unblock Route R-08", "Deploy Security Team Alpha to Zone D corridor", "Redirect crowd via digital signage and audio systems"],
            status="pending"
        )
        rec_vip = models.AgentRecommendation(
            id="rec2",
            stadium_id=stadium_id,
            alert_id="a2",
            agent_type="vip_coordination",
            recommendation="Reserve Backup Route R-12 for Senator Vance convoy due to heavy Gate F overcrowding.",
            reasoning="Primary VIP Route R-3 cuts through North Concourse B (65% density) and Gate F Plaza (74% density, High Alert). Rerouting convoy via Route R-12 (VVIP Helipad path) ensures zero crowd intersections.",
            suggested_actions=["Switch VIP Transit path to Backup Route R-12", "Assign Security Team Beta to Helipad Exit"],
            status="pending"
        )
        db.add(rec_routing)
        db.add(rec_vip)
        db.commit()

        print("Database fully seeded successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

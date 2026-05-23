import networkx as nx
import logging
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core import models

logger = logging.getLogger("RoutingEngine")

# Ring layout representing concourse connections between adjacent sectors in Apex Coliseum
ZONE_ADJACENCY = [
    ("ZONE_A", "ZONE_B"),
    ("ZONE_B", "ZONE_C"),
    ("ZONE_C", "ZONE_D"),
    ("ZONE_D", "ZONE_E"),
    ("ZONE_E", "ZONE_F"),
    ("ZONE_F", "ZONE_G"),
    ("ZONE_G", "ZONE_H"),
    ("ZONE_H", "ZONE_A")
]

ZONE_CODES = {"ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F", "ZONE_G", "ZONE_H"}

def build_stadium_graph(db: Session, emergency_mode: bool = False) -> nx.DiGraph:
    """
    Builds a dynamic directed graph of the stadium concourses and exit paths.
    Nodes:
        - Zone Codes (e.g., 'ZONE_A', 'ZONE_B', etc.)
        - Exit Locations (e.g., 'Gate A Exit', 'South Plaza Gate 4', etc.)
    Edges:
        - Zone-to-Zone concourse pathways (bidirectional)
        - Zone-to-Exit routes (directed exit paths defined in Route database table)
    """
    G = nx.DiGraph()
    
    # 1. Fetch Zones from Database and Register Nodes
    db_zones = db.query(models.Zone).all()
    zones_by_id = {z.id: z for z in db_zones}
    zones_by_code = {z.code: z for z in db_zones}
    
    for code in ZONE_CODES:
        db_zone = zones_by_code.get(code)
        if db_zone:
            G.add_node(
                code,
                id=db_zone.id,
                name=db_zone.name,
                density=float(db_zone.current_density),
                capacity=db_zone.capacity,
                risk_level=db_zone.risk_level,
                movement_speed=db_zone.movement_speed
            )
        else:
            # Fallback node if not in DB
            G.add_node(code, density=0.0, risk_level="safe", movement_speed="normal")

    # 2. Add Concourse Backbone (Adjacent Zone-to-Zone Connections)
    # Pedestrians can move in both directions between adjoining zones.
    for u, v in ZONE_ADJACENCY:
        # Cost depends on entering the target sector
        # For u -> v: target is v
        zone_v = zones_by_code.get(v)
        density_v = float(zone_v.current_density) if zone_v else 0.0
        # Congestion multiplier: scales quadratically as density approaches/crosses thresholds
        density_factor_v = 1.0 + (density_v / 100.0) ** 2 * 10.0
        weight_u_to_v = 10.0 * density_factor_v
        
        # For v -> u: target is u
        zone_u = zones_by_code.get(u)
        density_u = float(zone_u.current_density) if zone_u else 0.0
        density_factor_u = 1.0 + (density_u / 100.0) ** 2 * 10.0
        weight_v_to_u = 10.0 * density_factor_u
        
        G.add_edge(u, v, type="concourse", capacity=5000, weight=weight_u_to_v)
        G.add_edge(v, u, type="concourse", capacity=5000, weight=weight_v_to_u)

    # 3. Add Zone-to-Exit Paths from Route Database Records
    db_routes = db.query(models.Route).all()
    for route in db_routes:
        from_zone = zones_by_id.get(route.from_zone_id)
        if not from_zone:
            continue
            
        from_code = from_zone.code
        to_loc = route.to_location
        
        # Exclude blocked or reserved routes for general pathfinding
        if route.status == "blocked" or route.status == "reserved":
            continue
            
        # Emergency lane control
        if route.is_emergency_lane and not emergency_mode:
            continue
            
        # Base exit cost
        base_cost = 5.0
        # If route status is restricted, apply a heavy penalty to divert crowds
        penalty = 100.0 if route.status == "restricted" else 0.0
        weight = base_cost + penalty
        
        # Add Exit node if it doesn't exist
        if not G.has_node(to_loc):
            G.add_node(to_loc, is_exit=True)
            
        G.add_edge(
            from_code,
            to_loc,
            id=route.id,
            name=route.name,
            type="exit",
            capacity=route.capacity or 3000,
            weight=weight,
            is_emergency=route.is_emergency_lane
        )
        
    return G

def find_optimal_path(db: Session, from_zone_code: str, target_location: str = None, emergency_mode: bool = False) -> dict:
    """
    Finds the dynamic crowd-aware optimal path.
    If target_location is provided, paths from source zone to that exit.
    If target_location is None, computes optimal egress paths to *all* reachable exits,
    and returns the one with the lowest overall cost.
    """
    G = build_stadium_graph(db, emergency_mode=emergency_mode)
    
    if from_zone_code not in G:
        return {
            "success": False,
            "error": f"Source Zone {from_zone_code} not found in graph."
        }
        
    # Check reachable nodes
    try:
        distances, paths = nx.single_source_dijkstra(G, source=from_zone_code, weight="weight")
    except Exception as e:
        logger.error(f"Error computing paths: {e}")
        return {"success": False, "error": str(e)}

    # Filter out reachable exits
    reachable_exits = []
    for node, dist in distances.items():
        # An exit is a node that is NOT in the 8 zones
        if node not in ZONE_CODES:
            reachable_exits.append((node, dist))
            
    if not reachable_exits:
        return {
            "success": False,
            "error": f"No exits are currently reachable from {from_zone_code}. Egress is blocked."
        }
        
    # If a specific target exit was requested
    if target_location:
        if target_location not in distances:
            return {
                "success": False,
                "error": f"Exit location '{target_location}' is not reachable from {from_zone_code}."
            }
        selected_exit = target_location
        selected_dist = distances[target_location]
    else:
        # Egress Routing: Find the reachable exit with the minimum path weight
        selected_exit, selected_dist = min(reachable_exits, key=lambda x: x[1])

    best_path = paths[selected_exit]
    
    # Calculate crowd-specific path details
    # 1. Bottleneck Capacity (min capacity of any edge in the path)
    bottleneck_capacity = 999999
    edges_traversed = []
    for i in range(len(best_path) - 1):
        u, v = best_path[i], best_path[i+1]
        edge_data = G[u][v]
        edges_traversed.append({
            "from_node": u,
            "to_node": v,
            "name": edge_data.get("name", "Concourse Corridor"),
            "type": edge_data.get("type"),
            "weight": float(edge_data.get("weight")),
            "capacity": edge_data.get("capacity")
        })
        cap = edge_data.get("capacity", 3000)
        if cap < bottleneck_capacity:
            bottleneck_capacity = cap
            
    # 2. Dynamic Estimated Clearance Time in minutes
    # Formulas models concourse traverse delays + exit queue bottleneck discharge
    zone_delay_sum = 0.0
    for node in best_path:
        if node in ZONE_CODES:
            density = G.nodes[node].get("density", 0.0)
            # Higher density increases traversal delays exponentially
            zone_delay_sum += 1.0 + (density / 20.0)
            
    estimated_minutes = zone_delay_sum + (selected_dist * 0.1)
    
    # 3. Formulate Rationale
    source_name = G.nodes[from_zone_code].get("name", from_zone_code)
    source_density = G.nodes[from_zone_code].get("density", 0.0)
    
    reason = f"Routing from {source_name} to {selected_exit} is recommended. "
    if len(best_path) > 2:
        intermediates = [G.nodes[n].get("name", n) for n in best_path[1:-1]]
        reason += f"By passing through {', '.join(intermediates)}, "
    reason += f"the route avoids heavily congested sectors and maintains high egress throughput. "
    reason += f"Bottleneck capacity is {bottleneck_capacity} people/min."

    return {
        "success": True,
        "source": from_zone_code,
        "destination": selected_exit,
        "path": best_path,
        "total_weight": float(selected_dist),
        "bottleneck_capacity": bottleneck_capacity,
        "estimated_clearance_time": round(estimated_minutes, 1),
        "reason": reason,
        "edges": edges_traversed
    }

def generate_advisory_for_alert(db: Session, alert: models.Alert) -> models.AgentRecommendation:
    """
    Called when a new overcrowding/congestion alert is registered.
    Runs dynamic egress pathfinding to recommend evacuations, open alternate routes,
    and returns a fully populated AgentRecommendation object.
    """
    zone_code = alert.zone_code
    zone = db.query(models.Zone).filter(models.Zone.code == zone_code).first()
    if not zone:
        return None
        
    # Egress pathfinding starting from this congested zone
    path_result = find_optimal_path(db, from_zone_code=zone_code, emergency_mode=False)
    
    if not path_result.get("success"):
        return None
        
    # Construct recommendation summary & details
    destination = path_result["destination"]
    path_str = " → ".join(path_result["path"])
    clearance_time = path_result["estimated_clearance_time"]
    
    # Fetch outgoing routes
    routes = db.query(models.Route).filter(models.Route.from_zone_id == zone.id).all()
    routes_info = [
        {
            "name": r.name,
            "type": r.route_type,
            "status": r.status,
            "priority": r.priority,
            "is_emergency": r.is_emergency_lane
        }
        for r in routes
    ]
    
    from app.core.ai import generate_ai_recommendation
    ai_rec = generate_ai_recommendation(
        alert_type="congestion",
        severity=alert.severity,
        title=alert.title,
        description=alert.description or f"Congestion detected in {zone.name}.",
        zone_code=zone.code,
        zone_name=zone.name,
        density=float(zone.current_density),
        speed=zone.movement_speed,
        warning_threshold=float(zone.warning_threshold),
        critical_threshold=float(zone.critical_threshold),
        routes_info=routes_info
    )
    
    recommendation_text = ai_rec.recommendation
    reasoning_text = ai_rec.reasoning
    suggested_actions = ai_rec.suggested_actions
        
    stadium_id = alert.stadium_id
    
    # Check if recommendation already exists to avoid duplication
    existing_rec = db.query(models.AgentRecommendation).filter(models.AgentRecommendation.alert_id == alert.id).first()
    if existing_rec:
        existing_rec.recommendation = recommendation_text
        existing_rec.reasoning = reasoning_text
        existing_rec.suggested_actions = suggested_actions
        existing_rec.status = "pending"
        db.add(existing_rec)
        db.commit()
        db.refresh(existing_rec)
        return existing_rec
        
    db_rec = models.AgentRecommendation(
        id=str(uuid.uuid4()),
        stadium_id=stadium_id,
        alert_id=alert.id,
        agent_type="smart_routing",
        recommendation=recommendation_text,
        reasoning=reasoning_text,
        suggested_actions=suggested_actions,
        status="pending"
    )
    
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec

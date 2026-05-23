# BACKEND_ARCHITECTURE.md

````md
# BACKEND_ARCHITECTURE.md  
## AI Stadium Command Center

---

## 1. Backend Goal

Build a scalable backend system that powers:

- live crowd monitoring,
- zone status updates,
- smart routing,
- VIP movement planning,
- stampede prediction,
- emergency alerts,
- and AI agent recommendations.

The backend should be modular, event-driven, and designed so that the core operational system works even without AI.

---

## 2. Recommended Backend Stack

| Layer | Tech |
|---|---|
| API Server | FastAPI |
| Language | Python |
| Realtime | Socket.IO / WebSocket |
| Database | PostgreSQL / Supabase |
| Computer Vision | OpenCV + YOLOv8 |
| AI Agents | Google ADK |
| LLM | Gemini |
| Routing Engine | NetworkX / Custom Graph Logic |

---

## 3. Backend Design Philosophy

The backend should follow:

- modular services,
- clean separation of concerns,
- event-driven updates,
- AI decoupled from core logic,
- human-in-the-loop actions,
- graceful degradation,
- audit-friendly operations.

---

## 4. Core Backend Modules

```txt
backend/
  app/
    main.py

    core/
      config.py
      database.py
      socket.py
      security.py

    modules/
      zones/
      routes/
      vip/
      alerts/
      crowd_monitoring/
      prediction/
      agents/
      emergency/

    shared/
      schemas/
      utils/
      constants/
````

---

## 5. Module Responsibilities

---

## 5.1 Zones Module

Manages stadium zones.

Responsibilities:

* store zone configuration,
* update live zone status,
* calculate risk level,
* maintain thresholds.

Example zone fields:

```txt
zone_id
zone_name
capacity
current_density
movement_speed
risk_level
camera_id
warning_threshold
critical_threshold
```

---

## 5.2 Crowd Monitoring Module

Processes camera/video input.

Responsibilities:

* read video streams,
* detect people,
* count crowd density,
* calculate movement speed,
* detect abnormal crowd movement,
* push zone updates.

Flow:

```txt
Camera Feed
↓
OpenCV Frame Processing
↓
YOLO People Detection
↓
Density Calculation
↓
Zone Risk Update
↓
Socket Event
```

---

## 5.3 Routes Module

Manages stadium routing.

Responsibilities:

* create routes,
* edit routes,
* open/close/restrict routes,
* calculate alternate paths,
* preserve emergency routes.

Route fields:

```txt
route_id
route_name
from_zone
to_location
route_type
capacity
status
assigned_team
priority
```

---

## 5.4 VIP Module

Manages VIP movement.

Responsibilities:

* create VIP transit plans,
* reserve routes,
* assign security teams,
* detect route conflicts,
* track movement status.

VIP fields:

```txt
vip_id
vip_name
arrival_time
entry_gate
destination
security_level
primary_route
backup_route
assigned_team
movement_status
```

---

## 5.5 Alerts Module

Handles operational alerts.

Responsibilities:

* create alerts,
* classify severity,
* escalate critical alerts,
* resolve alerts,
* store alert history.

Alert types:

```txt
congestion
stampede_risk
vip_conflict
route_blockage
emergency_incident
```

---

## 5.6 Prediction Module

Calculates safety risk.

Responsibilities:

* analyze density trends,
* detect bottlenecks,
* predict congestion,
* generate stampede risk score.

Risk factors:

```txt
density
movement_speed
exit_availability
direction_conflict
route_blockage
crowd_pressure
```

---

## 5.7 AI Agents Module

Uses Google ADK.

Responsibilities:

* receive system events,
* analyze operational context,
* generate recommendations,
* explain alerts in simple language.

Agents:

* Crowd Monitoring Agent
* Prediction Agent
* Smart Routing Agent
* VIP Coordination Agent
* Emergency Response Agent

---

## 5.8 Emergency Module

Handles critical workflows.

Responsibilities:

* activate emergency mode,
* reserve emergency routes,
* notify security teams,
* generate escalation actions,
* log emergency timeline.

---

## 6. API Structure

---

## 6.1 Zones APIs

```txt
GET    /api/zones
GET    /api/zones/{zone_id}
POST   /api/zones
PUT    /api/zones/{zone_id}
PATCH  /api/zones/{zone_id}/thresholds
```

---

## 6.2 Routes APIs

```txt
GET    /api/routes
GET    /api/routes/{route_id}
POST   /api/routes
PUT    /api/routes/{route_id}
PATCH  /api/routes/{route_id}/status
POST   /api/routes/suggest
```

---

## 6.3 VIP APIs

```txt
GET    /api/vip-movements
GET    /api/vip-movements/{vip_id}
POST   /api/vip-movements
PUT    /api/vip-movements/{vip_id}
PATCH  /api/vip-movements/{vip_id}/status
POST   /api/vip-movements/{vip_id}/reserve-route
```

---

## 6.4 Alerts APIs

```txt
GET    /api/alerts
GET    /api/alerts/active
GET    /api/alerts/{alert_id}
POST   /api/alerts
PATCH  /api/alerts/{alert_id}/resolve
```

---

## 6.5 Emergency APIs

```txt
POST   /api/emergency/activate
POST   /api/emergency/resolve
POST   /api/emergency/notify-team
```

---

## 6.6 AI Agent APIs

```txt
POST   /api/agents/analyze-alert
POST   /api/agents/suggest-route
POST   /api/agents/analyze-vip-conflict
POST   /api/agents/emergency-recommendation
```

---

## 7. Real-Time Socket Events

Backend emits:

```txt
zone:update
alert:new
alert:resolved
route:update
vip:update
agent:recommendation
emergency:triggered
```

Backend listens to:

```txt
operator:approve-recommendation
operator:reject-recommendation
operator:block-route
operator:activate-emergency
operator:update-vip-status
```

---

## 8. Event-Driven Flow

Example:

```txt
Zone D density crosses 85%
↓
Prediction module calculates critical risk
↓
Alert module creates critical alert
↓
Socket emits alert:new
↓
AI Agent analyzes context
↓
Routing Agent suggests alternate route
↓
Dashboard displays recommendation
↓
Operator approves or rejects
```

---

## 9. Stampede Prediction Logic

Basic MVP logic:

```txt
if density >= critical_threshold
and movement_speed == "slow"
and available_exit_count <= 1:
    risk = "critical"
```

Advanced logic:

```txt
risk_score =
  density_weight
+ speed_weight
+ blockage_weight
+ direction_conflict_weight
+ exit_capacity_weight
```

Risk levels:

```txt
0-40   = Safe
41-70  = Warning
71-100 = Critical
```

---

## 10. Smart Routing Logic

Model stadium as graph:

```txt
Zone A → Corridor 1 → Gate 1
Zone A → Corridor 2 → Gate 2
Zone B → Corridor 3 → Gate 3
```

Route engine should consider:

* route status,
* capacity,
* congestion,
* route type,
* emergency reservation,
* VIP restrictions.

Suggested output:

```json
{
  "recommended_route": "R-08",
  "reason": "Lower congestion and higher available capacity",
  "estimated_clearance_time": "6 minutes"
}
```

---

## 11. AI Layer Design

AI should not directly modify critical operations.

AI should:

* analyze,
* suggest,
* explain,
* recommend.

Operator should:

* approve,
* reject,
* modify.

This ensures human-in-the-loop safety.

---

## 12. Database Responsibilities

Database stores:

* zones,
* routes,
* VIP movements,
* alerts,
* incidents,
* security teams,
* audit logs,
* agent recommendations.

---

## 13. Backend MVP Build Order

1. FastAPI setup
2. Database connection
3. Zones module
4. Routes module
5. VIP module
6. Alerts module
7. Socket.IO events
8. Crowd monitoring simulation
9. Prediction engine
10. AI agent integration
11. Emergency workflow

---

## 14. Non-Negotiable Backend Rules

* Do not build monolithic backend logic.
* Keep AI separate from operational services.
* Every critical action must be logged.
* Every AI suggestion must require operator approval.
* WebSocket events should be structured and predictable.
* Core routing and alerting should work without AI.
* Use clean schemas for every module.
* Design for future real CCTV integration.

---

## 15. Final Backend Goal

The backend should act as the operational brain of the stadium command center, processing live crowd intelligence, managing routes and VIP movements, generating alerts, and coordinating AI-assisted recommendations in real time.


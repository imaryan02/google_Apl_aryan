# AI_AGENT_FLOW.md

````md id="rp75dz"
# AI_AGENT_FLOW.md  
## AI Stadium Command Center

---

## 1. AI Layer Goal

The AI layer adds intelligence on top of the operational system.

AI should:

- analyze live crowd data,
- detect risks,
- predict congestion,
- recommend routes,
- assist VIP movement,
- generate emergency suggestions,
- and explain situations to operators.

Important:

AI should not directly execute critical actions.

AI recommends.  
Human operator approves.

---

## 2. Recommended AI Stack

| Layer | Tech |
|---|---|
| Agent Framework | Google ADK |
| LLM | Gemini |
| Backend | FastAPI |
| Data Source | Operational Backend + Database |
| Realtime | Socket.IO Events |

---

## 3. Core AI Principle

```txt id="ypim84"
Operational System First
AI Intelligence Second
Human Approval Always
````

---

## 4. AI Agents

---

# 4.1 Crowd Monitoring Agent

## Goal

Analyze live crowd status.

## Inputs

```txt id="5j5c81"
zone_id
crowd_density
movement_speed
direction_flow
camera_status
risk_level
```

## Responsibilities

* monitor zone health
* detect overcrowding
* identify abnormal movement
* detect crowd buildup
* generate early warnings

## Example Output

```txt id="8dsllz"
Zone D density is increasing rapidly.
Movement speed has dropped.
Potential congestion risk detected.
```

---

# 4.2 Prediction Agent

## Goal

Predict future crowd risks.

## Inputs

```txt id="y3pkzl"
density_trend
movement_speed_trend
route_status
exit_availability
historical_pattern
match_phase
```

## Responsibilities

* predict congestion
* detect bottleneck risk
* estimate stampede probability
* forecast critical zones

## Example Output

```txt id="q2qbv5"
Zone F may reach critical congestion in 4 minutes.
Recommended preventive action required.
```

---

# 4.3 Smart Routing Agent

## Goal

Suggest safest alternate routes.

## Inputs

```txt id="r5r5b5"
current_zone
available_routes
blocked_routes
route_capacity
crowd_density
emergency_lanes
vip_reserved_routes
```

## Responsibilities

* recommend alternate routes
* avoid blocked paths
* preserve emergency routes
* reduce crowd pressure
* explain route selection

## Example Output

```txt id="c0r7ga"
Suggested Route: R-08
Reason: Lower congestion and higher available capacity.
```

---

# 4.4 VIP Coordination Agent

## Goal

Assist safe VIP movement.

## Inputs

```txt id="38tklb"
vip_arrival_time
primary_route
backup_route
crowd_density_near_route
security_team_status
route_conflicts
```

## Responsibilities

* detect VIP route conflicts
* suggest backup route
* recommend temporary restrictions
* alert security team

## Example Output

```txt id="z3n24m"
VIP primary route intersects with high-density Zone C.
Suggested action: Use backup route R-12.
```

---

# 4.5 Emergency Response Agent

## Goal

Recommend emergency response actions.

## Inputs

```txt id="ntdkmi"
alert_type
severity
zone_status
available_security_teams
available_routes
nearest_exit
emergency_lane_status
```

## Responsibilities

* generate emergency action plan
* recommend response team
* preserve emergency lanes
* suggest evacuation path
* escalate critical events

## Example Output

```txt id="iw0zzx"
Critical emergency in Zone F.
Dispatch Team Bravo.
Open Emergency Route E-02.
Redirect public crowd to Gate 6.
```

---

## 5. Agent Communication Flow

```txt id="2h5imv"
Live Zone Update
↓
Crowd Monitoring Agent
↓
Prediction Agent
↓
Smart Routing Agent
↓
Emergency Response Agent
↓
Operator Recommendation
```

---

## 6. Event Triggers

Agents should activate when:

```txt id="iq6ohy"
zone density crosses warning threshold
zone density crosses critical threshold
movement speed drops suddenly
route becomes blocked
VIP movement starts
VIP route conflict detected
emergency alert generated
camera feed anomaly detected
```

---

## 7. AI Recommendation Lifecycle

```txt id="46e1dg"
System Event Detected
↓
AI Agent Analyzes Context
↓
AI Generates Recommendation
↓
Recommendation Stored in Database
↓
Dashboard Displays Recommendation
↓
Operator Approves / Rejects / Modifies
↓
Action Executed
↓
Audit Log Created
```

---

## 8. Example Scenario 1 — Congestion Detection

### Event

```txt id="e0899h"
Zone D density crosses 85%
Movement speed becomes slow
```

### Agent Flow

```txt id="hgsa9r"
Crowd Monitoring Agent detects congestion
↓
Prediction Agent predicts worsening crowd pressure
↓
Smart Routing Agent finds alternate route
↓
Emergency Agent checks response readiness
↓
Dashboard shows recommendation
```

### Output

```txt id="cej39a"
Critical Alert:
Zone D congestion increasing.

AI Recommendation:
Open Route R-08.
Redirect crowd toward Gate 6.
Notify Team Bravo.
```

---

## 9. Example Scenario 2 — VIP Route Conflict

### Event

```txt id="hed2ha"
VIP movement scheduled in 10 minutes.
Primary route passes through crowded Zone C.
```

### Agent Flow

```txt id="n7n9kd"
VIP Coordination Agent checks route
↓
Crowd Monitoring Agent confirms Zone C risk
↓
Smart Routing Agent suggests backup route
↓
Dashboard alerts operator
```

### Output

```txt id="j2p19c"
VIP Conflict Warning:
Primary VIP route intersects high-density Zone C.

AI Recommendation:
Use Backup Route R-12.
Reserve route from 7:25 PM to 7:40 PM.
Assign Security Team Alpha.
```

---

## 10. Example Scenario 3 — Stampede Risk

### Event

```txt id="vhpi36"
High density
Low movement speed
Blocked exit
Opposite crowd flow
```

### Agent Flow

```txt id="b4gium"
Prediction Agent calculates high stampede risk
↓
Emergency Response Agent prepares action plan
↓
Smart Routing Agent identifies safe route
↓
Dashboard shows critical warning
```

### Output

```txt id="xgrfvs"
Stampede Risk Critical:
Zone F may experience crowd surge within 3 minutes.

AI Recommendation:
Open Gate 6 immediately.
Block incoming flow from Corridor 3.
Dispatch Team Charlie.
Preserve Emergency Route E-01.
```

---

## 11. AI Prompt Template

Use this structure for every agent.

```txt id="h2lhc5"
You are an AI stadium operations agent.

Your role:
[AGENT_ROLE]

Current stadium context:
[CONTEXT_DATA]

Detected event:
[EVENT_DATA]

Available actions:
[AVAILABLE_ACTIONS]

Rules:
- Do not execute critical actions directly.
- Generate clear operational recommendations.
- Keep response concise.
- Explain the reason behind the recommendation.
- Prioritize crowd safety.
- Preserve emergency routes.
- Avoid VIP route conflicts.
- Follow human-in-the-loop model.

Return output in JSON format:
{
  "severity": "low | medium | high | critical",
  "summary": "",
  "recommendation": "",
  "reasoning": "",
  "suggested_actions": []
}
```

---

## 12. Example AI JSON Output

```json id="m95hrv"
{
  "severity": "critical",
  "summary": "Zone F is showing stampede risk indicators.",
  "recommendation": "Open Gate 6 and redirect crowd immediately.",
  "reasoning": "Crowd density is above 90%, movement speed is low, and one exit is blocked.",
  "suggested_actions": [
    "Open Route R-08",
    "Dispatch Security Team Charlie",
    "Preserve Emergency Route E-01",
    "Block incoming crowd from Corridor 3"
  ]
}
```

---

## 13. Agent Data Sources

Agents can use:

```txt id="emy047"
zone status
route status
VIP movement schedule
camera analytics
active alerts
security team availability
incident logs
operator actions
```

---

## 14. AI Safety Rules

* AI should never directly open or block routes.
* AI should never directly trigger evacuation without operator approval.
* AI should never track individual identity.
* AI should analyze only crowd-level behavior.
* AI should always explain recommendations.
* AI should preserve emergency routes.
* AI should prioritize human safety over operational convenience.

---

## 15. Agent MVP Priority

Build agents in this order:

1. Crowd Monitoring Agent
2. Prediction Agent
3. Smart Routing Agent
4. Emergency Response Agent
5. VIP Coordination Agent

---

## 16. Final AI Goal

The AI layer should make the stadium command center smarter by continuously analyzing crowd behavior, predicting risks, recommending safe actions, and helping operators respond faster without removing human control.

```


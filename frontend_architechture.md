Yes. Start with **Document 1**.

# FRONTEND_ARCHITECTURE.md

````md
# FRONTEND_ARCHITECTURE.md  
## AI Stadium Command Center

---

## 1. Frontend Goal

Build a real-time, mission-control-style dashboard for stadium operations, crowd monitoring, smart routing, VIP movement, stampede prediction, and emergency alerts.

The frontend should feel like a high-security command center, not a normal admin panel.

---

## 2. Tech Stack

- React
- TypeScript
- Tailwind CSS
- React Konva
- Framer Motion
- Socket.IO Client
- Zustand / Context API
- Recharts

---

## 3. Frontend Design Philosophy

The UI should be:

- real-time
- modular
- scalable
- dark security-dashboard style
- operator-friendly
- low-clutter
- visually trustworthy
- optimized for quick decisions

---

## 4. Main Pages

### 4.1 Command Dashboard

Primary screen for stadium operators.

Includes:

- stadium radar map
- live zone status
- active alerts
- AI recommendations
- route status
- VIP movement status
- emergency controls

---

### 4.2 Smart Routing Management

Used by security/admin team to manage stadium routes.

Features:

- create route
- edit route
- open route
- restrict route
- block route
- assign security team
- define capacity
- view route status

---

### 4.3 VIP Movement Management

Used to plan and monitor VIP transit.

Features:

- create VIP movement
- assign route
- assign security team
- set arrival time
- reserve route
- track movement status
- detect route conflicts

---

### 4.4 Alerts & Incidents

Used to view and manage all alerts.

Features:

- active alerts
- resolved alerts
- critical incidents
- AI suggestions
- emergency response logs

---

### 4.5 Settings / Zone Configuration

Used to configure stadium zones and thresholds.

Features:

- zone capacity
- density threshold
- warning threshold
- critical threshold
- camera assignment
- route mapping

---

## 5. Suggested Folder Structure

```txt
src/
  app/
    App.tsx
    routes.tsx

  core/
    api/
      httpClient.ts
      socketClient.ts

    config/
      constants.ts
      env.ts

    types/
      zone.types.ts
      route.types.ts
      alert.types.ts
      vip.types.ts
      agent.types.ts

    utils/
      riskUtils.ts
      mapUtils.ts
      timeUtils.ts

  features/
    dashboard/
      pages/
        CommandDashboard.tsx

      components/
        StadiumRadarMap.tsx
        ZoneStatusCard.tsx
        CrowdHealthPanel.tsx
        LiveAlertFeed.tsx
        AgentRecommendationPanel.tsx
        EmergencyControlPanel.tsx
        DashboardTopBar.tsx

    routing/
      pages/
        RouteManagementPage.tsx

      components/
        RouteForm.tsx
        RouteList.tsx
        RouteStatusBadge.tsx
        RouteOverlay.tsx

    vip/
      pages/
        VipMovementPage.tsx

      components/
        VipMovementForm.tsx
        VipTimeline.tsx
        VipRouteOverlay.tsx
        VipStatusCard.tsx

    alerts/
      pages/
        AlertsPage.tsx

      components/
        AlertCard.tsx
        AlertSeverityBadge.tsx
        IncidentTimeline.tsx

    zones/
      pages/
        ZoneSettingsPage.tsx

      components/
        ZoneConfigForm.tsx
        ZoneThresholdCard.tsx

  shared/
    components/
      Button.tsx
      Card.tsx
      Badge.tsx
      Modal.tsx
      Sidebar.tsx
      Navbar.tsx
      StatCard.tsx

    layouts/
      DashboardLayout.tsx

    hooks/
      useSocket.ts
      useLiveZones.ts
      useAlerts.ts
      useRoutes.ts
      useVipMovements.ts

    store/
      dashboardStore.ts
      zoneStore.ts
      alertStore.ts
      routeStore.ts
      vipStore.ts

  styles/
    globals.css
````

---

## 6. Dashboard Layout

```txt
----------------------------------------------------
Top Bar
Crowd Health | Active Alerts | Match Phase | Time
----------------------------------------------------

Left Panel              Center Map              Right Panel
Controls                Stadium Radar           AI Alerts
Routes                  8 Zones                 Recommendations
VIP                     Route Overlay           Emergency Actions

----------------------------------------------------
Bottom Panel
Crowd Trend | Gate Load | Zone Risk Timeline
----------------------------------------------------
```

---

## 7. Core Components

### 7.1 StadiumRadarMap

Purpose:

* render 2D stadium map
* show 8 zones
* show zone colors
* show routes
* show VIP paths
* show emergency lanes

Recommended tech:

* React Konva

Zone colors:

* green = safe
* yellow = warning
* red = critical

---

### 7.2 LiveAlertFeed

Purpose:

Show real-time alerts from backend and AI agents.

Alert examples:

* congestion detected
* stampede risk
* VIP route conflict
* route blocked
* emergency triggered

---

### 7.3 AgentRecommendationPanel

Purpose:

Show AI-generated suggestions.

Example:

```txt
AI Suggestion:
Zone D is critical.
Open Route R-08.
Redirect crowd toward Gate 6.
Notify Security Team Bravo.
```

Actions:

* approve
* reject
* modify

---

### 7.4 EmergencyControlPanel

Purpose:

Allow operators to trigger emergency workflow.

Features:

* activate emergency mode
* reserve emergency route
* notify security team
* mark incident resolved

---

### 7.5 RouteForm

Purpose:

Create and edit routes.

Fields:

```txt
Route Name
From Zone
To Destination
Route Type
Capacity
Status
Assigned Security Team
Priority
```

---

### 7.6 VipMovementForm

Purpose:

Create VIP movement plans.

Fields:

```txt
VIP Name
Arrival Time
Entry Gate
Destination
Security Level
Assigned Team
Primary Route
Backup Route
Movement Status
```

---

## 8. Frontend State Management

Use Zustand or Context API.

Recommended stores:

### zoneStore

Stores:

* zone density
* zone risk level
* zone health score
* camera status

### alertStore

Stores:

* active alerts
* resolved alerts
* critical incidents

### routeStore

Stores:

* all routes
* active routes
* blocked routes
* route suggestions

### vipStore

Stores:

* VIP movements
* active VIP transit
* reserved routes

### dashboardStore

Stores:

* match phase
* crowd health score
* global risk level

---

## 9. Real-Time Event Handling

Use Socket.IO client.

Frontend listens to:

```txt
zone:update
alert:new
alert:resolved
route:update
vip:update
agent:recommendation
emergency:triggered
```

---

## 10. Example Socket Flow

```txt
Backend emits: zone:update

Frontend receives:
{
  zoneId: "ZONE_D",
  density: 88,
  movementSpeed: "slow",
  riskLevel: "critical"
}

Frontend updates:
- Stadium map turns Zone D red
- Zone card updates
- Alert feed receives warning
```

---

## 11. UI Design Guidelines

Use a high-security dashboard style.

Recommended style:

* dark background
* neon green/yellow/red indicators
* radar grid effect
* glowing route overlays
* compact cards
* sharp typography
* minimal clutter
* alert animations only for critical events

---

## 12. Color Meaning

```txt
Green  → Safe
Yellow → Warning
Red    → Critical
Blue   → VIP Route
White  → Emergency Route
Gray   → Inactive Route
```

---

## 13. Frontend MVP Priority

Build in this order:

1. Dashboard layout
2. Stadium radar map
3. 8 zone visualization
4. WebSocket live updates
5. Alert feed
6. Route management page
7. VIP movement page
8. AI recommendation panel
9. Emergency control panel
10. Final UI polish

---

## 14. Non-Negotiable Rules

* Keep frontend modular.
* Do not put all logic inside one component.
* Keep AI recommendation UI separate from core dashboard.
* Keep live zone data separate from route data.
* Keep reusable UI components inside shared folder.
* Dashboard must work even if AI layer is disabled.
* Avoid overloading screen with too much text.
* Prioritize operator clarity over fancy visuals.

---

## 15. Final Frontend Goal

The final frontend should look and feel like a real stadium security command center where operators can monitor crowd safety, manage routes, coordinate VIP movement, and respond to emergencies in real time.


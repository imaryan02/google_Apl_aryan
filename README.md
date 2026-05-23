# AI Stadium Command Center

## Real-Time Crowd Intelligence and Stadium Operations Platform

AI Stadium Command Center is a mission-control platform for large stadium events. It helps operators monitor crowd density, detect unsafe congestion, coordinate VIP movement, manage routes, respond to alerts, and use AI recommendations without giving AI unchecked control over critical safety actions.

The project is built around one core principle:

```txt
Operational system first.
AI intelligence second.
Human approval always.
```

## The Problem

Large stadiums become high-risk environments during matches, concerts, rallies, and public events. Operations teams often deal with:

- crowd congestion near gates, corridors, and exits
- delayed visibility into unsafe density buildup
- blocked or overloaded evacuation routes
- VIP movement conflicts with public crowd flow
- disconnected CCTV, routing, alerting, and response systems
- reactive decision-making during emergencies

When these systems are fragmented, operators lose time. In a high-density venue, minutes matter.

## The Solution

AI Stadium Command Center brings stadium operations into one real-time command dashboard.

It combines:

- live zone monitoring
- smart route control
- emergency alert management
- VIP movement planning
- crowd risk prediction
- AI-assisted operational recommendations
- human-in-the-loop approvals

The result is a safety-first platform that gives operators a clear, fast, and explainable view of what is happening inside the stadium.

## Demo Story

A critical crowd buildup appears in `ZONE_D` near the lower south deck.

1. The system detects density above the critical threshold.
2. Movement speed drops from normal to slow.
3. A critical congestion alert is created.
4. The radar map highlights the risky sector.
5. The AI recommendation panel suggests opening alternate route `R-08`.
6. The operator reviews the reasoning and approves the recommendation.
7. Route status, zone risk, alerts, and the dashboard update in real time.

This demonstrates the core value of the system: fast detection, clear visualization, AI-assisted response, and operator-controlled execution.

## Key Features

### Mission-Control Dashboard

- real-time command overview
- stadium health score
- active alerts
- occupancy load factor
- route availability
- VIP movement status
- emergency override controls

### Interactive Stadium Radar

- 8 intelligent stadium zones
- live risk color states
- radar-style visual monitoring
- VIP movement pins
- emergency route overlays
- sector click interactions

### Crowd Monitoring and Risk Scoring

- zone density tracking
- movement speed monitoring
- warning and critical thresholds
- crowd health score calculation
- congestion and stampede-risk indicators

### Smart Routing

- public, VIP, staff, and emergency route support
- open, restricted, blocked, and reserved route states
- alternate-route recommendations
- emergency lane preservation
- route capacity awareness

### VIP Movement Coordination

- VIP transit planning
- primary and backup routes
- security team assignment
- convoy size and arrival tracking
- route conflict awareness

### Alert and Incident Management

- congestion alerts
- route blockage alerts
- stampede-risk alerts
- VIP conflict alerts
- emergency incident alerts
- active and resolved alert lifecycle

### AI Recommendation Workflow

AI agents analyze operational context and suggest actions, but they do not directly execute critical changes.

Supported recommendation flow:

```txt
System detects risk
AI analyzes context
AI explains recommendation
Operator approves or rejects
System applies approved action
```

## Why This Project Stands Out

| Area | What makes it strong |
| --- | --- |
| Safety | Predicts risk before incidents escalate |
| AI | Uses AI as an explainable assistant, not an uncontrolled actor |
| Operations | Combines zones, routes, VIPs, alerts, and emergency controls |
| UX | Mission-control dashboard optimized for fast operator decisions |
| Architecture | Modular backend with real-time event flow |
| Trust | Human-in-the-loop design for critical safety actions |
| Scalability | Designed for future CCTV, IoT, drones, and multi-stadium support |

## System Architecture

```txt
Camera Feeds / Simulated CCTV
        |
        v
Computer Vision and Crowd Analytics
        |
        v
Zone Risk and Prediction Engine
        |
        v
FastAPI Operational Backend
        |
        +--> Routes Module
        +--> VIP Module
        +--> Alerts Module
        +--> Dashboard Module
        +--> AI Recommendation Module
        |
        v
Socket.IO Real-Time Events
        |
        v
React Mission-Control Dashboard
```

## Human-in-the-Loop AI Model

The platform is intentionally designed so the core system works even if AI is unavailable.

AI is used for:

- analyzing alerts
- explaining risks
- suggesting alternate routes
- identifying VIP route conflicts
- recommending emergency actions
- translating complex telemetry into operator-friendly guidance

Operators remain responsible for:

- approving recommendations
- rejecting unsafe suggestions
- triggering emergency mode
- changing route states
- resolving incidents

This makes the system safer, more reliable, and more realistic for real-world operations.

## Tech Stack

### Frontend

| Layer | Technology |
| --- | --- |
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Real-Time | Socket.IO Client |
| Radar Map | React Konva |
| Charts | Recharts |
| Icons | Lucide React |

### Backend

| Layer | Technology |
| --- | --- |
| API | FastAPI |
| Language | Python |
| Database ORM | SQLAlchemy |
| Schemas | Pydantic |
| Real-Time | Socket.IO |
| Local Database | SQLite |
| Production Database | PostgreSQL / Supabase |
| AI SDK | Google GenAI |
| Computer Vision Ready | OpenCV |

## Repository Structure

```txt
.
|-- backend/
|   |-- app/
|   |   |-- core/
|   |   |   |-- config.py
|   |   |   |-- database.py
|   |   |   |-- models.py
|   |   |   |-- seed.py
|   |   |   `-- socket.py
|   |   |-- modules/
|   |   |   |-- ai/
|   |   |   |-- alerts/
|   |   |   |-- cameras/
|   |   |   |-- dashboard/
|   |   |   |-- prediction/
|   |   |   |-- routes/
|   |   |   |-- vip/
|   |   |   `-- zones/
|   |   `-- shared/
|   |-- Dockerfile
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- core/types/
|   |   |-- features/dashboard/
|   |   |-- shared/components/
|   |   |-- shared/layouts/
|   |   |-- shared/services/
|   |   `-- shared/store/
|   `-- package.json
|-- AI_AGENT_FLOW.md
|-- BACKEND_ARCHITECTURE.md
|-- DATABASE_SCHEMA.md
|-- frontend_architechture.md
|-- product_requirement.md
`-- verify_*.py
```

## Core Backend Modules

| Module | Responsibility |
| --- | --- |
| Zones | stores zone capacity, density, movement speed, thresholds, and risk level |
| Routes | manages route status, type, capacity, priority, and assigned teams |
| VIP | tracks VIP arrival, convoy, security level, primary route, and backup route |
| Alerts | creates, escalates, resolves, and stores operational alerts |
| Prediction | calculates crowd risk using density, movement speed, and route constraints |
| Cameras | maps CCTV sources to monitored zones |
| AI | generates explainable recommendations for operators |
| Dashboard | provides initial state and command-center data |

## Real-Time Events

The system is designed around predictable live events.

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

Frontend reacts by updating:

- radar zone colors
- zone telemetry cards
- alert feed
- route controls
- VIP movement panels
- AI recommendation queue
- emergency state

## Data Model

The database is designed as the operational memory of the stadium.

Main entities:

- stadiums
- zones
- cameras
- routes
- security teams
- VIP movements
- alerts
- incidents
- agent recommendations
- audit logs

Important design rules:

- every operational entity belongs to a stadium
- alerts link back to zones
- VIP movements reference primary and backup routes
- AI recommendations link to alerts
- operator approval is stored
- critical actions should be auditable

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3.11 or newer
- pip

### 1. Start the Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

```txt
http://localhost:8000
```

API docs:

```txt
http://localhost:8000/docs
```

### 2. Start the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

```txt
http://localhost:5173
```

### 3. Configure the Frontend API URL

The frontend defaults to:

```txt
http://localhost:8000
```

To override it, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Development Commands

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run lint
npm run preview
```

### Backend

```powershell
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Verification Scripts

Run these from the repository root while the backend is running:

```powershell
python verify_alerts.py
python verify_cctv.py
python verify_prediction.py
python verify_vip.py
python verify_vip_crud.py
python verify_ai.py
python verify_ai_copilot.py
python verify_cv_engine.py
python verify_unusual_activity.py
```

These scripts validate important backend flows such as alerts, CCTV simulation, AI assistance, VIP operations, prediction, and unusual activity detection.

## Environment Variables

### Backend

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./stadium.db
HOST=127.0.0.1
PORT=8000
```

For PostgreSQL or Supabase:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

### Frontend

Create `frontend/.env` only if the backend URL is different:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## API Overview

The backend registers APIs under `/api`.

```txt
/api/dashboard
/api/zones
/api/routes
/api/vip
/api/alerts
/api/cameras
/api/ai
```

## Example Operational Scenario

```txt
ZONE_D density reaches 88%
        |
        v
Risk level becomes critical
        |
        v
Alert center creates critical congestion alert
        |
        v
AI recommends opening Route R-08
        |
        v
Operator approves recommendation
        |
        v
Route opens, alert resolves, crowd health improves
```

## Future Scope

- live CCTV stream ingestion
- YOLOv8 people detection
- drone and IoT sensor integration
- mobile app for security teams
- multi-stadium command center
- full audit log dashboard
- automatic incident timeline generation
- advanced graph-based route optimization
- predictive crowd surge forecasting

## Built For

This project is ideal for:

- stadium security teams
- event operations centers
- emergency response coordinators
- smart city safety systems
- sports venues
- concerts and large public gatherings

## Final Positioning

AI Stadium Command Center is a real-time operational intelligence platform for stadium safety. It combines live crowd monitoring, predictive risk analysis, smart routing, VIP coordination, emergency response, and human-approved AI recommendations into one command-center experience.

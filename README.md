# AI Stadium Command Center

AI Stadium Command Center is a real-time stadium operations platform for crowd safety, route control, VIP movement coordination, alert response, CCTV zone monitoring, and AI-assisted operator recommendations.

The system is designed around one operating principle: the core command center must work without AI, while AI adds analysis, recommendations, and explanations that require human operator approval before critical action.

## Features

- Real-time command dashboard for stadium health, occupancy, route status, and active alerts
- Interactive stadium radar with monitored zones, risk states, VIP pins, and emergency overlays
- Crowd density and movement-speed monitoring across CCTV-backed sectors
- Smart route management for public, VIP, and emergency lanes
- VIP movement control deck with primary and backup route assignments
- Alert center for congestion, obstruction, stampede risk, and emergency incidents
- AI recommendation panel with approve/reject operator workflow
- Socket.IO event flow for live backend-to-frontend synchronization
- FastAPI backend with SQLite fallback and PostgreSQL/Supabase support

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Socket.IO Client
- Recharts
- React Konva
- Lucide React

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- Socket.IO
- SQLite for local development
- PostgreSQL/Supabase for production-style deployment
- Google GenAI SDK for AI-assisted flows

## Repository Structure

```txt
.
|-- backend/
|   |-- app/
|   |   |-- core/                 # Config, database, seed data, socket setup
|   |   |-- modules/              # API modules for dashboard, zones, routes, VIP, alerts, AI
|   |   `-- shared/               # Shared schemas
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- features/dashboard/   # Dashboard pages and operational panels
|   |   |-- shared/               # Layout, reusable components, services, store
|   |   `-- core/types/           # Shared TypeScript domain types
|   `-- package.json
|-- AI_AGENT_FLOW.md
|-- BACKEND_ARCHITECTURE.md
|-- DATABASE_SCHEMA.md
|-- frontend_architechture.md
|-- product_requirement.md
`-- verify_*.py                   # Backend verification scripts
```

## Prerequisites

- Node.js 20 or newer
- npm
- Python 3.11 or newer
- pip

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will run at:

```txt
http://localhost:8000
```

FastAPI docs are available at:

```txt
http://localhost:8000/docs
```

By default, the backend can fall back to local SQLite. To use Supabase or PostgreSQL, set `DATABASE_URL` in `backend/.env`.

## Frontend Setup

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will run at:

```txt
http://localhost:5173
```

If the backend is not running on `http://localhost:8000`, create `frontend/.env` and set:

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

The repository includes Python verification scripts for major backend flows:

```powershell
python verify_alerts.py
python verify_cctv.py
python verify_prediction.py
python verify_vip.py
python verify_vip_crud.py
python verify_ai.py
python verify_ai_copilot.py
```

Run these from the repository root while the backend is available.

## Environment Variables

### Backend

Configured in `backend/.env`:

```env
DATABASE_URL=sqlite:///./stadium.db
HOST=127.0.0.1
PORT=8000
```

For PostgreSQL/Supabase:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

### Frontend

Configured in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## API Overview

The backend registers operational routes under `/api`:

- `/api/dashboard`
- `/api/zones`
- `/api/routes`
- `/api/vip`
- `/api/alerts`
- `/api/cameras`
- `/api/ai`

Socket.IO is used for live updates between the backend and frontend.

## AI Workflow

The AI layer is advisory. It can analyze operational data, identify risk, explain what is happening, and recommend actions such as route changes, alert escalation, VIP rerouting, or emergency preparation.

Critical actions remain operator-controlled:

```txt
AI recommends.
Human reviews.
Human approves or rejects.
System executes approved operational change.
```

## Build

To build the frontend for production:

```powershell
cd frontend
npm run build
```

The compiled frontend output is generated in `frontend/dist`.

## Deployment Notes

- `backend/Dockerfile` can be used to containerize the FastAPI service.
- `firebase.json` is present for frontend hosting workflows.
- Configure production CORS, database credentials, and API base URLs before deploying.

## Current Status

This project is an operational prototype for an AI-assisted stadium command center. The core data model, dashboard UI, backend API modules, real-time event structure, and verification scripts are present and ready for continued iteration.

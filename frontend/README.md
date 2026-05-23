# AI Stadium Command Center Frontend

React frontend for the AI Stadium Command Center. It provides the operator dashboard, radar map, zone telemetry, route management, VIP movement controls, alert center, CCTV scanner, and AI copilot views.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Socket.IO Client
- React Konva
- Recharts
- Lucide React

## Setup

```powershell
npm install
npm run dev
```

The app runs at:

```txt
http://localhost:5173
```

## Backend URL

By default, the frontend connects to:

```txt
http://localhost:8000
```

To override this, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Commands

```powershell
npm run dev      # Start local development server
npm run build    # Type-check and build production assets
npm run lint     # Run ESLint
npm run preview  # Preview the production build
```

## Source Layout

```txt
src/
|-- App.tsx
|-- features/dashboard/
|   |-- pages/
|   `-- components/
|-- shared/
|   |-- components/
|   |-- layouts/
|   |-- services/
|   |-- store/
|   `-- config/
`-- core/types/
```

## Dashboard Modules

- `CommandDashboard` - main command center view
- `StadiumRadarMap` - interactive Konva stadium radar
- `ZoneStatusCard` - CCTV zone density and risk telemetry
- `CrowdHealthPanel` - occupancy and health trend chart
- `AgentRecommendationPanel` - AI recommendation approval workflow
- `LiveAlertFeed` - real-time active alert list
- `EmergencyControlPanel` - emergency override controls
- `SmartRoutingManager` - route operations view
- `VipMovementControlDeck` - VIP movement planning view
- `CCTVScannerManager` - camera monitoring view
- `AICopilotManager` - AI assistance view

## Build Output

Production assets are generated in:

```txt
dist/
```

# Sentinel Task 7 — Dashboard Platform (Mostafa)

React + FastAPI dashboard for the Sentinel graduation project.

This folder owns **S1–S11**: framework, auth/roles, live updates, dashboard API, and operations pages. Data is **mock-first** so the UI works before other teammates connect Redis/Mongo/agent services.

## Structure

```
task7/
  api/           FastAPI backend (JWT, REST, SSE, mock seed)
  frontend/      React + Vite + TypeScript + Tailwind
  page-template/ Copy/paste page starter for other owners
  docker-compose.yml
```

## Clone

```bash
git clone https://github.com/eng-ghalwash/sentinel-task7.git
cd sentinel-task7
```

## Option A — Docker (أسهل)

Requires: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

- App: http://localhost:5173  
- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

## Option B — Local (بدون Docker)

Requires: **Python 3.11+**, **Node.js 20+**

### 1) API

```bash
cd api
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 2) Frontend (terminal تاني)

```bash
cd frontend
npm install
npm run dev
```

App: http://127.0.0.1:5173

### Demo logins

| Username | Password     | Role    |
|----------|--------------|---------|
| admin    | sentinel123  | Admin   |
| analyst  | sentinel123  | Analyst |
| auditor  | sentinel123  | Auditor |
| client   | sentinel123  | Client  |

## Pages delivered

- Command Center
- Alerts Explorer (filters, saved views, bulk mark FP / merge, detail drawer)
- Incident Workbench (timeline, evidence, entity graph, reasoning, actions, notes)
- Case Board (drag-and-drop columns, SLA badges, case drawer with notes + closure form)
- Live Threat Map (Leaflet world map + arcs + filters)
- Platform Health
- Admin & RBAC (users, TOTP optional, API keys, notification routes, config history)
- Client Portal
- Global search + live connection indicator

## API contracts (for the team)

All authenticated routes need:

`Authorization: Bearer <token>`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/alerts` | Paginated alerts (`page`, `severity`, `engine`, ...) |
| GET | `/api/incidents` | Paginated incidents |
| GET | `/api/incidents/{id}` | Incident detail |
| GET | `/api/cases` | Cases list |
| PATCH | `/api/cases/{id}` | Move case status |
| GET | `/api/stats/overview` | Command Center KPIs |
| GET | `/api/events/stream` | SSE live feed |
| GET | `/api/health` | Platform health |
| GET | `/api/search?q=` | Global search |
| GET/PATCH | `/api/admin/*` | Admin config |

Later: replace `api/app/mocks/seed.py` with real Mongo/Redis reads. Keep response shapes stable.

## Adding a teammate page

1. Copy `page-template/PageTemplate.tsx` into `frontend/src/pages/`
2. Register route in `frontend/src/App.tsx`
3. Add nav entry in `frontend/src/layout/nav.ts`

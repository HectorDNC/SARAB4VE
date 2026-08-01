# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📦 Project Overview

**SARA** is an emergency response platform that connects people with disabilities and accessibility needs to volunteers, NGOs, and resources during disasters. The project uses a monorepo structure with separate frontend (Next.js) and backend (Node.js/Express) codebases.

- **Hackathon context**: MVP built in 48-72 hours post-earthquake
- **Core value**: Reduce time from "I need help" → "help arrives" from hours to minutes

---

## 🏗️ Architecture Overview

### Monorepo Structure

```
.
├── frontend/              # Next.js 16 React app (TypeScript)
│   ├── src/
│   │   ├── app/          # Next.js App Router pages & layouts
│   │   ├── components/   # Reusable UI components
│   │   ├── api/          # Frontend API client utilities
│   │   ├── services/     # Business logic (alerts, geolocation)
│   │   ├── types/        # TypeScript type definitions
│   │   └── mocks/        # Mock data (refugios.ts)
│   ├── public/           # Static assets
│   └── package.json
│
├── backend/               # Node.js/Express API (JavaScript)
│   ├── src/
│   │   ├── app.js        # Express app setup
│   │   ├── server.js     # HTTP server entry point
│   │   ├── db.js         # PostgreSQL pool & connection
│   │   ├── config.js     # Environment & configuration
│   │   ├── routes/       # Express route handlers
│   │   ├── helpRequests/ # Business logic modules
│   │   │   ├── index.js       # Route setup
│   │   │   ├── create.js      # Creation logic
│   │   │   ├── query.js       # Retrieval/filtering
│   │   │   ├── acceptance.js  # Volunteer acceptance flow
│   │   │   └── validation.js  # Input validation
│   └── sql/              # Database schema migrations
│
└── ai-specs/            # Product specs (from hackathon planning)
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Next.js App Router** | Modern, built-in API routes, zero-config SSR |
| **PostgreSQL (Supabase)** | Relational data, geospatial queries (PostGIS), hosted solution |
| **Express not Next.js API** | Separation of concerns, independent backend deployment, direct DB access |
| **No real-time (yet)** | Socket.io overhead; polling acceptable for MVP |
| **Client-side geolocation** | Browser geolocation API + manual fallback, avoids server complexity |
| **Stateless volunteer flow** | No persistent sessions yet; matches hackathon scope |

---

## 🚀 Development Commands

### Frontend (Next.js)

```bash
cd frontend

# Development server (auto-reload on file changes)
npm run dev              # Runs on http://localhost:3000

# Type checking
npm run lint            # ESLint

# Production build
npm run build           # Creates optimized build
npm run start           # Runs production server

# Install dependencies (if needed)
npm install
```

### Backend (Express)

```bash
cd backend

# Development server
npm start               # Runs on http://localhost:5000 (default)

# Environment setup (required)
cp .env.example .env
# Edit .env with DATABASE_URL=... (local postgres or Supabase)

# Database schema
psql "$DATABASE_URL" -f sql/schema.sql    # Apply migrations

# Create local PostgreSQL database
createdb sara

# Testing (when tests are added)
npm test
```

### Full Stack (from root)

```bash
# Install both frontend and backend
npm install --workspaces

# Not yet automated; run frontend and backend npm dev in separate terminals
```

---

## 🗄️ Database Schema

The backend connects to PostgreSQL (local or Supabase). Key tables:

- **help_requests**: Solicitudes de ayuda (geolocation, category, status)
- **volunteers**: Voluntarios registrados (location, availability, contact info)
- **assignments**: Matches between requests and volunteers
- **messages**: Chat between requester and volunteer (not yet implemented)

Schema location: `backend/sql/schema.sql`

### Common DB Tasks

```bash
# Apply schema to new database
DATABASE_URL="postgresql://user:pass@host/sara" psql "$DATABASE_URL" -f backend/sql/schema.sql

# Query recent requests
psql "$DATABASE_URL" -c "SELECT * FROM help_requests ORDER BY created_at DESC LIMIT 10;"

# Check Supabase connection (if using Supabase)
# Dashboard: https://supabase.com/dashboard
```

---

## 🌐 API Endpoints (Backend)

All endpoints are in `backend/src/routes/helpRequests.js`

### Help Requests
- `GET /api/help-requests` — List requests (with optional geo-filtering)
  - Params: `status`, `latitude`, `longitude`, `radiusKm`
  - Returns: Array with distance from query point if geo-filtered
- `POST /api/help-requests` — Create a new request
  - Body: `requesterName`, `contactMethod`, `contactValue`, `needType`, `description`, `latitude`, `longitude`, `urgency`
- `POST /api/help-requests/:id/accept` — Volunteer accepts request
  - Body: `volunteerName`, `volunteerContactMethod`, `volunteerContactValue`
  - Returns: 200 on success, 409 if request no longer open
- `POST /api/help-requests/:id/resolve` — Mark request as completed
  - Returns: 200 on success, 409 if not assigned

### Health Check
- `GET /health` — Server status

---

## 🎨 Frontend Key Features

### Pages (Next.js App Router)

- `src/app/page.tsx` — Home with SOS button and main navigation
- `src/app/sos/page.tsx` — Quick SOS emergency request form
- `src/app/request/page.tsx` — Detailed help request form
- `src/app/mapa/page.tsx` — Map view of help requests and shelters
- `src/app/registro/page.tsx` — Volunteer registration
- `src/app/chat/page.tsx` — Chat between requester and volunteer
- `src/app/directorio/page.tsx` — Directory of organizations
- `src/app/recursos/page.tsx` — Resources/shelter list
- `src/app/perfil/page.tsx` — User profile

### Components

- **UI Components** (`src/components/ui/`): Button, SOSButton, CategoryCard, StatBanner, PointCard, AlertsHost
- **Layout Components** (`src/components/layout/`): Navbar, BottomNav
- **Map Component** (`src/app/mapa/LeafletMap.tsx`): Leaflet map integration with OpenStreetMap
- **Form Components** (`src/app/sos/components/`, `src/app/request/components/`): Multi-step form components

### Styling

- **Tailwind CSS v4** with PostCSS — Utility-first styling
- **Responsive design** — Mobile-first approach (BottomNav for mobile)
- **Color palette**: Uses Tailwind defaults (adjust in `tailwind.config.ts` if needed)

---

## 🔌 Frontend API Client

`src/api/helpRequests.ts` — Centralized fetch wrapper for backend API

```typescript
// Example usage in components
import { createHelpRequest, getNearbyRequests } from '@/api/helpRequests';

const request = await createHelpRequest({
  requesterName: 'Ana',
  contactValue: '+584141234567',
  needType: 'transport',
  description: '...',
  latitude: 10.4806,
  longitude: -66.9036,
});

const nearby = await getNearbyRequests(10.4806, -66.9036, 10);
```

---

## 🗺️ Geolocation & Maps

- **Client geolocation**: Browser Geolocation API in `src/services/alertService.ts`
- **Map library**: Leaflet.js + OpenStreetMap (free, no API key)
- **Shelter mock data**: `src/mocks/refugios.ts` (temporary; will be replaced by DB endpoint)

---

## 🔒 Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/sara
PORT=5000
NODE_ENV=development
```

### Frontend (`.env.local` if needed)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🧪 Testing & Type Safety

- **TypeScript**: Enabled in frontend (`tsconfig.json` with strict mode)
- **ESLint**: Frontend only (`npm run lint`)
- **No unit tests yet** (hackathon MVP)
- **Manual testing**: Drive the UI in browser, check Network tab in DevTools

---

## 📋 Common Workflows

### Adding a New Page
1. Create `.tsx` file in `frontend/src/app/[route]/page.tsx`
2. Import shared components from `src/components/`
3. Call backend API via `src/api/helpRequests.ts`
4. Add navigation link in `Navbar.tsx` or `BottomNav.tsx`

### Adding a New API Endpoint
1. Create handler in `backend/src/helpRequests/[feature].js`
2. Export handler and import in `backend/src/routes/helpRequests.js`
3. Add route with `router.post()` or `router.get()`
4. Add validation in `backend/src/validation/helpRequests.js`
5. Create frontend wrapper in `src/api/helpRequests.ts`

### Running Full Stack Locally
1. **Terminal 1 (Backend)**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with local or Supabase DATABASE_URL
   npm start
   ```
2. **Terminal 2 (Frontend)**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open http://localhost:3000 in browser

### Debugging API Calls
- **Frontend**: Browser DevTools Network tab (shows requests to `http://localhost:5000/api/...`)
- **Backend**: `console.log()` in route handlers; will appear in terminal where `npm start` runs
- **Database**: Use `psql` or Supabase dashboard to inspect tables directly

---

## 📦 Dependencies & Versions

### Frontend
- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **Tailwind CSS 4** — Styling
- **Leaflet 1.9** — Map library
- **TypeScript 5** — Type safety

### Backend
- **Node.js 20+** — Runtime (check `package.json` engines)
- **Express 4** — HTTP framework
- **pg 8** — PostgreSQL client
- **dotenv 16** — Environment config
- **cors 2** — Cross-origin support

---

## 🚀 Deployment

### Frontend
- Deploy to **Vercel** (automatic from GitHub)
- Set `NEXT_PUBLIC_API_URL` environment variable to production backend URL

### Backend
- Deploy to **Render** or **Railway** (or any Node.js host)
- Set `DATABASE_URL` to production Supabase connection string
- Set `PORT` if required by platform

---

## 📚 References

- **CLAUDE.md (root-level)** — This file
- **README.md (root)** — Product vision and use cases
- **frontend/README.md** — Next.js boilerplate docs
- **backend/README.md** — Backend setup and endpoint details
- **AGENTS.md (frontend)** — Note about Next.js 16 API changes

---

## 🎯 MVP Scope & Limitations

This is a **hackathon MVP** (72-hour build). Known limitations:

- ✅ No authentication (phone-based only)
- ✅ No persistent volunteer sessions
- ✅ No real-time messaging (use polling instead)
- ✅ No mobile app (responsive web only)
- ✅ No IA-based prioritization
- ✅ No SMS notifications (use in-app alerts)
- ✅ Shelter/refuge data is mocked (not from DB)

Future phases will expand these features.

---

**Last updated**: 2026-07-02  
**Status**: MVP Active

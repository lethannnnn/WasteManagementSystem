# MyCycle+

A smart recycling management platform for Malaysia that gamifies household recycling.  
Donors schedule pickups → Collectors complete routes → Points & badges awarded → Sponsors fund rewards → Admin oversees all.

---

## Apps

| App | Type | Port |
|-----|------|------|
| `apps/admin-web` | React 19 + Vite + TypeScript | 5173 |
| `apps/sponsor-web` | React 19 + Vite + TypeScript | 5174 |
| `apps/donor-mobile` | React Native + Expo SDK 54 | 8082 |
| `apps/collector-mobile` | React Native + Expo SDK 54 | 8081 |

---

## Tech Stack

- **Database / Auth / Realtime** — Supabase (PostgreSQL)
- **Web routing** — React Router DOM v7
- **Mobile navigation** — Expo Router
- **Server state** — TanStack Query
- **Forms** — React Hook Form
- **Maps** — OpenStreetMap + Leaflet.js + OSRM (zero API key)
- **Waste AI** — EfficientNet-B0 `.tflite` (on-device, no external API)
- **Push notifications** — Expo Notifications + Firebase FCM
- **Email** — Resend

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Expo Go](https://expo.dev/go) on your mobile device (for mobile dev)

### 1. Clone the repo

```bash
git clone https://github.com/lethannnnn/WasteManagementSystem.git
cd WasteManagementSystem
```

### 2. Set up environment variables

Copy the example files and fill in your Supabase credentials:

```bash
cp apps/admin-web/.env.example     apps/admin-web/.env
cp apps/sponsor-web/.env.example   apps/sponsor-web/.env
cp apps/donor-mobile/.env.example  apps/donor-mobile/.env
cp apps/collector-mobile/.env.example apps/collector-mobile/.env
```

Each `.env` needs:

```env
# Web apps (admin-web, sponsor-web)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Mobile apps (donor-mobile, collector-mobile)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run with Docker

All installs and commands run inside the `mycycle` Docker containers.

**Start all apps:**
```bash
docker compose up
```

**Start individual apps:**
```bash
docker compose up admin-web
docker compose up sponsor-web
docker compose up donor-mobile
docker compose up collector-mobile
```

**Install a new package (always use Docker):**
```bash
# Web apps
docker compose run --rm admin-web npm install <package>

# Mobile apps
docker compose run --rm donor-mobile npm install <package> --legacy-peer-deps
```

---

## Database

26-table PostgreSQL schema hosted on Supabase. Full schema at [`plans/schema.sql`](plans/schema.sql).

Run migrations via the Supabase SQL editor or using the Supabase MCP server.

---

## Project Structure

```
fyp/
├── apps/
│   ├── admin-web/          # Admin dashboard (React + Vite)
│   ├── sponsor-web/        # Sponsor portal (React + Vite)
│   ├── donor-mobile/       # Donor app (React Native + Expo)
│   └── collector-mobile/   # Collector app (React Native + Expo)
├── plans/
│   ├── OVERVIEW.md         # Full system design & DB schema
│   ├── PLAN.md             # Phase-by-phase development plan
│   └── schema.sql          # Complete SQL schema
├── docs/                   # Original design documents (.drawio)
├── docker-compose.yml
└── CLAUDE.md               # AI assistant project guide
```

---

## Key Features

- **Pickup scheduling** — donors book pickups with waste type classification
- **On-device AI** — EfficientNet-B0 classifies waste (Plastic / Paper / Metal / Glass / Electronics / Textiles) without any external API
- **Live collector map** — admin sees all collectors in real-time via Supabase Realtime + Leaflet.js
- **Collector navigation** — driver-style live routing powered by OSRM (free, open-source)
- **Gamification** — points, levels (Beginner → Eco Warrior → Green Champion), badges, leaderboard
- **Sponsor rewards** — brands create reward vouchers redeemable with recycling points
- **QR verification** — one-use QR codes verify pickup authenticity

---

## Actors

| Role | Platform | Responsibility |
|------|----------|---------------|
| **Donor** | Mobile | Schedule pickups, earn points, redeem rewards |
| **Collector** | Mobile | Navigate routes, scan QR, log collected waste |
| **Sponsor** | Web | Create rewards, view redemption analytics |
| **Admin** | Web | Manage users, routes, analytics, system oversight |

---

## Academic Context

Final Year Project — BACS3404  
Universiti Tunku Abdul Rahman (UTAR)

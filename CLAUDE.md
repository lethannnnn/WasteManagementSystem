# MyCycle+ — Claude Project Guide

> Run `/plans` at the start of every session to re-read all three plan files fresh.

---

## What This Is

**MyCycle+** is a smart recycling management platform for Malaysia (FYP — BACS3404).  
It connects households (Donors) with Collectors, Sponsors (brands funding rewards), and an Admin portal.

---

## App Map

| App | Type | Stack |
|-----|------|-------|
| `apps/admin-web` | Web | React 19 + TypeScript + Vite + React Router v7 + TanStack Query |
| `apps/sponsor-web` | Web | React 19 + TypeScript + Vite + React Router v7 (now needs auth + dashboard) |
| `apps/donor-mobile` | Mobile | React Native + Expo SDK 54 + Expo Router |
| `apps/collector-mobile` | Mobile | React Native + Expo SDK 54 + Expo Router |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web framework | React 19 + TypeScript |
| Web bundler | Vite |
| Web routing | React Router DOM v7 |
| Mobile | React Native + Expo SDK 54 |
| Mobile navigation | Expo Router |
| Database + Auth | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Styling (web) | Plain CSS (preserve existing UI) |
| Server state | TanStack Query (React Query) |
| Forms | React Hook Form |
| **Map (all apps)** | OpenStreetMap tiles + Leaflet.js — **zero API key, fully open source** |
| **Map (mobile)** | React Native WebView hosting inline Leaflet HTML |
| **Map (web)** | react-leaflet (React wrapper for Leaflet) |
| **Routing engine** | OSRM public demo server — free, open source, no API key |
| **Collector GPS** | `expo-location` (device GPS only, no external API) |
| **Real-time tracking** | Supabase Realtime channels (collector position → admin map) |
| **Waste classification** | EfficientNet-B0 fine-tuned on TrashNet + Kaggle Garbage Classification |
| **Model runtime** | TensorFlow Lite (`.tflite`) via `react-native-fast-tflite` |
| Push notifications | Expo Notifications + Firebase FCM |
| Email | Resend |
| Env vars (web) | `.env` with `VITE_` prefix |
| Env vars (mobile) | `app.config.js` + `expo-constants` |

---

## Admin Web — Pages

| Page | Route | Key Content |
|------|-------|-------------|
| Login | `/login` | `AuthScreen.tsx` — email/password |
| Dashboard | `/` | 4 metric cards, quick actions, recent activity |
| Users | `/users` | Searchable table, create collector accounts (OTP flow) |
| Rewards | `/rewards` | Reward card grid, add/edit/delete |
| Analytics | `/analytics` | SVG line chart, material breakdown, environmental impact |
| Routes | `/routes` | DRL-GA optimization trigger, Leaflet map — all collectors + routes |
| Collectors | `/collectors` | Collector status table, smart assignment |

---

## Sponsor Web — Pages

| Page | Route | Key Content |
|------|-------|-------------|
| Landing | `/` | Landing + inquiry registration form |
| Login | `/login` | Sponsor auth |
| Dashboard | `/dashboard` | Campaign overview metrics |
| Rewards | `/dashboard/rewards` | Create/edit rewards, stock management |
| Analytics | `/dashboard/analytics` | Redemption stats, cost per redemption |

---

## Database

Supabase URL: `https://xzcjvsrjtclqsaaezief.supabase.co`  
**Credentials in `.env` only — never source code.**  
Full schema: `plans/OVERVIEW.md`

---

## Hard Constraints

1. **No paid/key-required map API** — OpenStreetMap + Leaflet.js + OSRM (all free/open-source)
2. **Waste classification is on-device** — EfficientNet-B0 `.tflite`, bundled in app, no external ML API
3. **No monolithic files** — max ~200 lines per component
4. **Preserve web UI** — keep JSX/CSS structure when refactoring, do not redesign
5. **Supabase is the only backend** — no custom server, use Edge Functions for server-side logic
6. **Mock data is dead** — all data from Supabase or clearly labelled loading state
7. **Everything is open to enhancement** — suggest improvements during development, ask before structural changes
8. **Docker only for installs** — all `npm install` / `npx expo install` must run inside the `mycycle` Docker container, never on the base environment. Use `docker compose run --rm <service> <cmd>` for one-off installs
9. **Supabase MCP** — use the Supabase MCP server for all DB operations (migrations, table inspection, SQL execution) when available instead of copy-pasting SQL manually
10. **Commit descriptions are manual** — ALWAYS remind the user to write their own commit message before any `git push`. Never auto-push without confirmation
11. **Update `.gitignore` before every commit** — review and update root `.gitignore` (and relevant app-level `.gitignore`) before staging any commit to ensure no secrets, build artifacts, or generated files are accidentally committed

---

## Key Business Rules

- Points: 10 pts/kg base; varies by `item_categories.base_points_per_kg`
- Levels: Beginner (<500 pts) → Eco Warrior (≥500) → Green Champion (≥1000)
- Collector accounts: Admin-created only → one-time password → emailed to collector → forced change on first login
- QR codes: one-use per pickup, scanned by collector at pickup site
- Pickup items logged per category (Plastic/Paper/Metal/Glass/Electronics/Textiles)
- Route assignment: auto-runs on schedule OR admin manually triggers
- Waste photo classification: both apps (donor pre-schedules, collector verifies at pickup)

---

## Start of Every Session

Run `/plans` to read CLAUDE.md + OVERVIEW.md + PLAN.md fresh before starting any work.

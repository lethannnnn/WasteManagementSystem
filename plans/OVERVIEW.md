# MyCycle+ — System Overview

> Source of truth: ERD.drawio, PackageDiagram.drawio, SequenceDiagram.drawio + confirmed requirements.

---

## Mission

A smart recycling platform that gamifies household recycling in Malaysia.  
Donors schedule pickups → Collectors complete them → Points + badges awarded → Sponsors fund rewards → Admin oversees all.

---

## Actors

| Role | Platform | Core Job |
|------|----------|----------|
| **Donor** | Mobile | Schedule pickups, classify waste via camera, earn points/badges, redeem rewards |
| **Collector** | Mobile | Navigate routes (live map), QR-scan pickups, log weight per category, classify collected waste |
| **Sponsor** | Web | Register, create reward vouchers, view campaign redemption analytics |
| **Admin** | Web | Manage users, create collector accounts, manage routes, view all-collector live map, analytics |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           SUPABASE                                    │
│  PostgreSQL  │  Auth (JWT)  │  Storage  │  Realtime  │  Edge Funcs   │
└──────────────────────────────────────────────────────────────────────┘
        ▲            ▲                ▲               ▲
        │            │                │               │
   admin-web    sponsor-web      donor-mobile    collector-mobile

Map: OpenStreetMap tiles + Leaflet.js (no API key)
Routing: OSRM public server (no API key)
Real-time: Supabase Realtime (collector GPS → admin map)
Push: Firebase FCM via Expo Notifications
Email: Resend (OTP delivery, reward vouchers)
Waste AI: EfficientNet-B0 .tflite on-device (no external ML API)
```

---

## Map System (No External API)

### Technology
| Component | Choice | Reason |
|-----------|--------|--------|
| Map tiles | OpenStreetMap | Free, open source, no API key |
| Map library (web) | react-leaflet | React wrapper for Leaflet, free |
| Map library (mobile) | Leaflet.js in React Native WebView | No native map library needed |
| Routing engine | OSRM public demo server | Free, open-source, no API key, real road routing |
| Collector GPS | expo-location (device GPS) | No external API |
| Real-time sync | Supabase Realtime | Collector pushes position every ~15s |

### Admin Route Map (bird's-eye view)
- Shows ALL active collectors as moving markers
- Shows each collector's planned route as a coloured polyline
- Shows pending pickup stops as icons
- Collector positions update in real-time via Supabase Realtime channel
- Built with `react-leaflet` in `RoutesPage.tsx`

### Collector Live Navigation Map (driver view)
- Full-screen Leaflet map in WebView
- Shows current position (GPS), all stops on the route
- Highlights current stop and next stop
- Route line drawn via OSRM between stops in order
- "Direction" panel at bottom: distance to next stop, ETA
- All stops visible simultaneously; current stop highlighted differently
- Updates position every 15 seconds via `expo-location` watchPosition → Supabase

### Pickup Locations
- **Fixed default**: Seeded service area centroids in the DB (used for demo)
- **Custom**: Donor enters address → lat/lng geocoded from postcode or manual pin on Leaflet map in a WebView

---

## Waste Classification System (On-Device AI)

### Model
| Decision | Choice |
|----------|--------|
| Base model | EfficientNet-B0 |
| Fine-tuning dataset | TrashNet + Kaggle Garbage Classification (public) |
| Output classes | Plastic, Paper, Metal, Glass, Electronics, Textiles |
| Export format | TensorFlow Lite (.tflite) quantized |
| Runtime | react-native-fast-tflite |
| Input | Camera capture OR gallery pick |

### Donor Flow (before scheduling pickup)
1. Open camera / gallery in schedule-pickup screen
2. Model runs on-device → returns top category + confidence
3. Shows: category name, estimated points per kg, "Is this recyclable?" verdict
4. Donor confirms → category auto-fills in pickup items form
5. Donor sets estimated weight → point preview shown
6. Donor accepts and submits pickup request

### Collector Flow (at pickup completion)
1. After QR scan verified, collector photographs collected waste
2. Model classifies → shows suggested category
3. Collector verifies / overrides category
4. Collector enters actual weight per category
5. Submit → updates `pickup_items`, triggers point award

---

## Complete Database Schema

### Identity

```sql
USERS
  user_id             text PK (uuid)
  user_type           text    -- donor / collector / sponsor / admin
  email               text unique
  full_name           text
  phone               text
  profile_image_url   text
  verification_status text    -- pending / verified
  is_active           boolean default true
  last_login          timestamptz
  created_at          timestamptz

DONORS  (1:1 extends USERS)
  donor_id                  text PK
  user_id                   text FK → USERS
  total_points              int default 0
  points_earned             int default 0
  points_spent              int default 0
  total_recycled_weight     decimal(10,2) default 0
  pickups_completed         int default 0
  current_rank              int
  level_status              text default 'Beginner'  -- Beginner / Eco Warrior / Green Champion
  preferred_pickup_time     time
  last_pickup_date          date
  notification_preferences  jsonb default '{}'

COLLECTORS  (1:1 extends USERS)
  collector_id        text PK
  user_id             text FK → USERS
  vehicle_id          text FK → VEHICLES
  area_id             text FK → SERVICE_AREAS
  collector_code      text unique
  rating              decimal(3,2) default 0
  total_collections   int default 0
  employment_status   text
  emergency_contact   text
  last_active         timestamptz
  current_lat         decimal(10,8)   -- live GPS position
  current_lng         decimal(11,8)   -- live GPS position

ADMINS  (1:1 extends USERS)
  admin_id    text PK
  user_id     text FK → USERS
  role_type   text
  permissions jsonb
  department  text

SPONSORS  (1:1 extends USERS)
  sponsor_id              text PK
  user_id                 text FK → USERS
  company_name            text
  business_registration   text
  industry                text
  website_url             text
  contact_person          text
  partnership_type        text
  partnership_status      text    -- pending / active / suspended
  partnership_start_date  date
  brand_assets            jsonb
```

### Infrastructure

```sql
SERVICE_AREAS
  area_id         text PK
  area_name       text
  state           text
  postcode_range  text
  is_active       boolean
  max_collectors  int
  centroid_lat    decimal(10,8)   -- default pickup zone centre
  centroid_lng    decimal(11,8)

VEHICLES
  vehicle_id           text PK
  vehicle_type         text
  license_plate        text
  make_model           text
  year                 int
  capacity_kg          decimal(8,2)
  fuel_type            text
  status               text
  last_maintenance     date
  next_maintenance_due date
  insurance_expiry     date
  road_tax_expiry      date

ADDRESSES
  address_id      text PK
  user_id         text FK → USERS
  address_line_1  text
  address_line_2  text
  city            text
  state           text
  postcode        text
  country         text default 'Malaysia'
  latitude        decimal(10,8)
  longitude       decimal(11,8)
  address_type    text    -- home / office / other

ITEM_CATEGORIES
  category_id           text PK
  category_name         text    -- Plastic/Paper/Metal/Glass/Electronics/Textiles
  description           text
  base_points_per_kg    int
  icon_url              text
  color_code            varchar(7)
  is_active             boolean
  handling_instructions text
  sorting_priority      int

COLLECTOR_INVITATIONS  (OTP onboarding)
  invitation_id   text PK
  collector_id    text FK → COLLECTORS
  otp_hash        text        -- hashed one-time password
  sent_to_email   text
  sent_to_phone   text
  is_used         boolean default false
  expires_at      timestamptz
  created_at      timestamptz
```

### Operations

```sql
ROUTES
  route_id           text PK
  collector_id       text FK → COLLECTORS
  route_name         text
  route_date         date
  status             text    -- pending / active / completed
  total_stops        int
  completed_stops    int default 0
  total_distance_km  decimal(8,2)
  estimated_duration interval
  actual_duration    interval
  priority           text
  start_time         timestamptz
  end_time           timestamptz
  route_notes        text
  osrm_geometry      jsonb   -- cached OSRM route polyline

QR_CODES
  qr_id                 text PK
  qr_code               text unique
  qr_data               text        -- JSON with pickup_id
  generated_at          timestamptz
  is_used               boolean default false
  scanned_at            timestamptz
  scanned_by_collector  text FK → COLLECTORS
  scan_location_lat     decimal(10,8)
  scan_location_lng     decimal(10,8)

PICKUPS
  pickup_id            text PK
  donor_id             text FK → DONORS
  route_id             text FK → ROUTES
  address_id           text FK → ADDRESSES
  qr_id                text FK → QR_CODES
  scheduled_date       date
  scheduled_time       time
  actual_pickup_time   timestamptz
  status               text    -- pending / assigned / in_progress / completed / cancelled
  total_weight_kg      decimal(8,2)
  total_points_awarded int default 0
  collector_notes      text
  created_at           timestamptz

PICKUP_ITEMS
  pickup_item_id      text PK
  pickup_id           text FK → PICKUPS
  category_id         text FK → ITEM_CATEGORIES
  weight_kg           decimal(8,2)
  condition_status    text
  points_per_kg       int
  total_points        int
  notes               text
  verification_photos jsonb    -- Supabase Storage URLs
  ai_suggested_category text   -- what the model predicted
  ai_confidence         decimal(5,4)  -- model confidence score
```

### Gamification

```sql
REWARDS
  reward_id         text PK
  sponsor_id        text FK → SPONSORS
  reward_name       text
  description       text
  points_required   int
  category          text
  stock_quantity    int
  redeemed_count    int default 0
  image_url         text
  terms_conditions  text
  valid_from        date
  valid_until       date
  is_active         boolean
  daily_limit       int
  user_limit        int
  created_at        timestamptz

SPONSOR_REWARDS
  sponsor_reward_id     text PK
  reward_id             text FK → REWARDS
  sponsor_id            text FK → SPONSORS
  cost_per_redemption   decimal(8,2)
  monthly_quota         int
  redeemed_this_month   int default 0

REDEMPTIONS
  redemption_id     text PK
  donor_id          text FK → DONORS
  reward_id         text FK → REWARDS
  points_spent      int
  redemption_code   text unique
  status            text    -- pending / confirmed / delivered / expired
  redeemed_at       timestamptz
  confirmed_at      timestamptz
  delivered_at      timestamptz
  expires_at        timestamptz
  delivery_method   text    -- email / physical
  feedback_rating   int
  feedback_comments text

POINT_TRANSACTIONS
  transaction_id   text PK
  user_id          text FK → USERS
  pickup_id        text FK → PICKUPS
  redemption_id    text FK → REDEMPTIONS
  transaction_type text    -- earn / spend / bonus / adjust
  points_amount    int
  description      text
  transaction_date timestamptz

BADGES
  badge_id        text PK
  badge_name      text
  description     text
  criteria_text   text
  icon_url        text
  badge_color     varchar(10)
  rarity          text    -- common / rare / epic / legendary
  points_required int default 0
  category        text
  is_active       boolean
  sort_order      int
  created_at      timestamptz

USER_BADGES
  user_badge_id   text PK
  user_id         text FK → USERS
  badge_id        text FK → BADGES
  earned_at       timestamptz
  earning_context text
  UNIQUE(user_id, badge_id)

LEADERBOARD
  leaderboard_id  text PK
  user_id         text FK → USERS
  period_type     text    -- weekly / monthly / yearly
  period_start    date
  period_end      date
  rank_position   int
  total_points    int
  total_weight_kg decimal(10,2)
  pickups_count   int
  last_updated    timestamptz
```

### Engagement & Analytics

```sql
NOTIFICATIONS
  notification_id     text PK
  user_id             text FK → USERS
  notification_type   text    -- pickup / reward / gamification / system
  title               text
  message             text
  priority            text
  category            text
  is_read             boolean default false
  is_pushed           boolean default false
  sent_at             timestamptz
  read_at             timestamptz
  action_url          text    -- deep link on tap
  expires_at          timestamptz
  scheduled_send_time timestamptz
  created_at          timestamptz

ENVIRONMENTAL_IMPACTS
  impact_id        text PK
  pickup_id        text FK → PICKUPS
  co2_saved_kg     decimal(10,2)   -- weight × 2.5
  energy_saved_kwh decimal(10,2)   -- weight × 1.8
  trees_equivalent decimal(10,2)   -- weight × 0.017
  created_at       timestamptz

SYSTEM_ANALYTICS
  id              text PK
  date            date
  metric_type     text
  total_pickups   int
  total_weight_kg decimal(10,2)
  created_at      timestamptz

AUDIT_LOGS
  id          text PK
  user_id     text FK → USERS
  action      text
  entity_type text
  entity_id   text
  changed_at  timestamptz
  ip_address  text
  metadata    jsonb

SPONSOR_INQUIRIES  (public form, no auth)
  id                    text PK
  company_name          text
  industry              text
  website               text
  contact_person        text
  email                 text
  phone                 text
  position              text
  company_size          text
  partnership_type      text
  budget                text
  objectives            text
  target_audience       text
  sustainability_goals  text
  additional_info       text
  status                text default 'pending'
  created_at            timestamptz
```

---

## Module Breakdown

### Module 1 — Auth & Onboarding
- Supabase Auth (JWT, email/password)
- **Donor/Sponsor**: self-register via app/web → email verification
- **Collector**: Admin-created only → OTP generated → emailed via Resend → collector logs in → forced password change on first login
- Admin: email/password with admin table check

### Module 2 — Pickup Scheduling (Donor Mobile)
- Waste camera classification → category + point estimate shown → donor confirms
- Select date, time slot, address (text input or tap "use my location" via `expo-location`)
- Item categories + estimated weight entered
- Creates `pickups` + `pickup_items` + `qr_codes` records
- Pickup history + live status tracking

### Module 3 — Route Management (Admin Web)
- Admin triggers or system auto-runs DRL-GA route optimization
- Admin sees all-collector live map (react-leaflet, Supabase Realtime)
- Each collector's route shown as a coloured polyline
- Pending pickups shown as map markers
- Manual smart assignment panel also available

### Module 4 — Collector Navigation (Collector Mobile)
- Full-screen Leaflet map in WebView showing all stops on today's route
- Current position via `expo-location` watchPosition → Supabase Realtime → admin map
- OSRM provides road-following route geometry between stops
- "Driver view": next stop distance + ETA panel at bottom
- All stops visible simultaneously; current stop highlighted

### Module 5 — Pickup Completion (Collector Mobile)
- QR scan (verify donor, one-use enforcement)
- Camera → waste classification → collector verifies/overrides category
- Enter weight per category
- Upload verification photos (Supabase Storage)
- Mark completed → triggers: point award + env impact calculation + donor notification

### Module 6 — Rewards & Gamification (Donor Mobile)
- Points balance, level, progress bar
- Leaderboard (weekly/monthly/yearly)
- Reward catalog (filtered by donor's points eligibility)
- Redeem reward → DB transaction → email voucher
- Badges earned automatically on trigger events

### Module 7 — Sponsor Portal (Sponsor Web)
- Public landing + inquiry form (no auth needed)
- Authenticated section: login → dashboard
  - Create/edit rewards (title, points, stock, quota, validity)
  - View redemption stats (redeemed count, cost, donor feedback)
  - Campaign performance metrics

### Module 8 — Admin Dashboard (Admin Web)
- Dashboard: live KPIs (users, weight, pickups, redemptions)
- User management: list, search, filter, suspend/activate
- Collector management: create accounts (OTP flow), assign vehicles/areas
- Route management: optimization trigger, live map, manual assignment
- Rewards management: view all rewards across sponsors
- Analytics: material trends, regional breakdown, environmental impact

### Module 9 — Waste Classification (AI)
- Model: EfficientNet-B0 fine-tuned on TrashNet + Kaggle Garbage Classification
- 6 classes: Plastic / Paper / Metal / Glass / Electronics / Textiles
- On-device inference (TFLite) in both donor and collector apps
- Outputs: predicted category + confidence + recyclability verdict + points estimate

### Module 10 — Notification System
- Channels: Push (Firebase FCM) + Email (Resend)
- Smart timing: queue for peak hours (9 AM–6 PM)
- Deep links via `action_url`
- Categories: pickup / reward / gamification / system

---

## Sequence Flows (from SequenceDiagram.drawio)

1. **Registration & Auth**: validate → check email uniqueness → hash password → insert users + role table → send verification email → JWT on login
2. **Pickup Scheduling**: camera classify → confirm → INSERT pickups + pickup_items + qr_codes → notify → route auto-assign → notify collector
3. **Collection**: view route on map → navigate → QR scan → classify waste → enter weight → complete → trigger: points + env impact + badge check + notification
4. **Rewards**: browse catalog → select → BEGIN TRANSACTION → validate points/stock/quota → deduct → INSERT redemption → send email → COMMIT
5. **Gamification**: pickup complete event → evaluate all badge criteria → award new badges + bonus points → update leaderboard → level check → notify
6. **Notifications**: event triggers → multi-channel delivery → smart timing → deep link routing → mark read → cleanup expired

---

## Deployment (Simplified)

| Layer | Service |
|-------|---------|
| Web apps | Vercel / Netlify (static) |
| Mobile | Expo Go (dev) → EAS Build (production APK/IPA) |
| Database | Supabase hosted |
| Map tiles | OpenStreetMap CDN (free) |
| Routing | OSRM public demo server (free) |
| Push | Firebase FCM (free tier) |
| Email | Resend (free tier) |
| ML model | Bundled in app assets |

# MyCycle+ — Implementation Plan

## Approach
Fresh rebuild. Keep **visual UI** (JSX + CSS) from old web apps, rebuild everything else.  
Phases are ordered by dependency. Open to enhancements — suggest and ask before structural changes.

---

## Phase 0 — Cleanup ✅ DONE
All unused files deleted from `apps/`.

---

## Phase 1 — Supabase Database Setup
Run all SQL in Supabase SQL editor before writing any app code.

### 1.1 Tables (run in dependency order)

```sql
-- USERS
create table users (
  user_id             text primary key default gen_random_uuid()::text,
  user_type           text not null check (user_type in ('donor','collector','sponsor','admin')),
  email               text unique not null,
  full_name           text not null,
  phone               text,
  profile_image_url   text,
  verification_status text not null default 'pending',
  is_active           boolean not null default true,
  last_login          timestamptz,
  created_at          timestamptz default now()
);

-- VEHICLES
create table vehicles (
  vehicle_id           text primary key default gen_random_uuid()::text,
  vehicle_type         text,
  license_plate        text,
  make_model           text,
  year                 int,
  capacity_kg          decimal(8,2),
  fuel_type            text,
  status               text default 'active',
  last_maintenance     date,
  next_maintenance_due date,
  insurance_expiry     date,
  road_tax_expiry      date
);

-- SERVICE_AREAS
create table service_areas (
  area_id        text primary key default gen_random_uuid()::text,
  area_name      text not null,
  state          text,
  postcode_range text,
  is_active      boolean default true,
  max_collectors int,
  centroid_lat   decimal(10,8),
  centroid_lng   decimal(11,8)
);

-- DONORS
create table donors (
  donor_id                  text primary key default gen_random_uuid()::text,
  user_id                   text unique not null references users(user_id),
  total_points              int default 0,
  points_earned             int default 0,
  points_spent              int default 0,
  total_recycled_weight     decimal(10,2) default 0,
  pickups_completed         int default 0,
  current_rank              int,
  level_status              text default 'Beginner',
  preferred_pickup_time     time,
  last_pickup_date          date,
  notification_preferences  jsonb default '{}'::jsonb
);

-- COLLECTORS
create table collectors (
  collector_id       text primary key default gen_random_uuid()::text,
  user_id            text unique not null references users(user_id),
  vehicle_id         text references vehicles(vehicle_id),
  area_id            text references service_areas(area_id),
  collector_code     text unique,
  rating             decimal(3,2) default 0,
  total_collections  int default 0,
  employment_status  text,
  emergency_contact  text,
  last_active        timestamptz,
  current_lat        decimal(10,8),
  current_lng        decimal(11,8)
);

-- ADMINS
create table admins (
  admin_id    text primary key default gen_random_uuid()::text,
  user_id     text unique not null references users(user_id),
  role_type   text,
  permissions jsonb default '{}'::jsonb,
  department  text
);

-- SPONSORS
create table sponsors (
  sponsor_id              text primary key default gen_random_uuid()::text,
  user_id                 text unique not null references users(user_id),
  company_name            text not null,
  business_registration   text,
  industry                text,
  website_url             text,
  contact_person          text,
  partnership_type        text,
  partnership_status      text default 'pending',
  partnership_start_date  date,
  brand_assets            jsonb default '{}'::jsonb
);

-- COLLECTOR_INVITATIONS (OTP onboarding)
create table collector_invitations (
  invitation_id   text primary key default gen_random_uuid()::text,
  collector_id    text not null references collectors(collector_id),
  otp_hash        text not null,
  sent_to_email   text,
  sent_to_phone   text,
  is_used         boolean default false,
  expires_at      timestamptz not null,
  created_at      timestamptz default now()
);

-- ADDRESSES
create table addresses (
  address_id     text primary key default gen_random_uuid()::text,
  user_id        text not null references users(user_id),
  address_line_1 text not null,
  address_line_2 text,
  city           text,
  state          text,
  postcode       text,
  country        text default 'Malaysia',
  latitude       decimal(10,8),
  longitude      decimal(11,8),
  address_type   text default 'home'
);

-- ITEM_CATEGORIES
create table item_categories (
  category_id           text primary key default gen_random_uuid()::text,
  category_name         text not null,
  description           text,
  base_points_per_kg    int not null default 10,
  icon_url              text,
  color_code            varchar(7),
  is_active             boolean default true,
  handling_instructions text,
  sorting_priority      int default 0
);

insert into item_categories (category_name, base_points_per_kg, color_code, sorting_priority) values
  ('Plastic',     10, '#ef4444', 1),
  ('Paper',        8, '#f59e0b', 2),
  ('Metal',       15, '#6b7280', 3),
  ('Glass',       12, '#06b6d4', 4),
  ('Electronics', 20, '#8b5cf6', 5),
  ('Textiles',     7, '#ec4899', 6);

-- ROUTES
create table routes (
  route_id           text primary key default gen_random_uuid()::text,
  collector_id       text references collectors(collector_id),
  route_name         text,
  route_date         date,
  status             text default 'pending',
  total_stops        int default 0,
  completed_stops    int default 0,
  total_distance_km  decimal(8,2),
  estimated_duration interval,
  actual_duration    interval,
  priority           text default 'normal',
  start_time         timestamptz,
  end_time           timestamptz,
  route_notes        text,
  osrm_geometry      jsonb    -- cached OSRM polyline coordinates
);

-- QR_CODES
create table qr_codes (
  qr_id                  text primary key default gen_random_uuid()::text,
  qr_code                text unique not null,
  qr_data                text,
  generated_at           timestamptz default now(),
  is_used                boolean default false,
  scanned_at             timestamptz,
  scanned_by_collector   text references collectors(collector_id),
  scan_location_lat      decimal(10,8),
  scan_location_lng      decimal(10,8)
);

-- PICKUPS
create table pickups (
  pickup_id            text primary key default gen_random_uuid()::text,
  donor_id             text not null references donors(donor_id),
  route_id             text references routes(route_id),
  address_id           text not null references addresses(address_id),
  qr_id                text references qr_codes(qr_id),
  scheduled_date       date not null,
  scheduled_time       time,
  actual_pickup_time   timestamptz,
  status               text default 'pending',
  total_weight_kg      decimal(8,2),
  total_points_awarded int default 0,
  collector_notes      text,
  created_at           timestamptz default now()
);

-- PICKUP_ITEMS
create table pickup_items (
  pickup_item_id        text primary key default gen_random_uuid()::text,
  pickup_id             text not null references pickups(pickup_id),
  category_id           text not null references item_categories(category_id),
  weight_kg             decimal(8,2),
  condition_status      text,
  points_per_kg         int,
  total_points          int,
  notes                 text,
  verification_photos   jsonb default '[]'::jsonb,
  ai_suggested_category text,
  ai_confidence         decimal(5,4)
);

-- REWARDS
create table rewards (
  reward_id         text primary key default gen_random_uuid()::text,
  sponsor_id        text references sponsors(sponsor_id),
  reward_name       text not null,
  description       text,
  points_required   int not null,
  category          text,
  stock_quantity    int default 0,
  redeemed_count    int default 0,
  image_url         text,
  terms_conditions  text,
  valid_from        date,
  valid_until       date,
  is_active         boolean default true,
  daily_limit       int,
  user_limit        int,
  created_at        timestamptz default now()
);

-- SPONSOR_REWARDS
create table sponsor_rewards (
  sponsor_reward_id     text primary key default gen_random_uuid()::text,
  reward_id             text not null references rewards(reward_id),
  sponsor_id            text not null references sponsors(sponsor_id),
  cost_per_redemption   decimal(8,2),
  monthly_quota         int,
  redeemed_this_month   int default 0
);

-- REDEMPTIONS
create table redemptions (
  redemption_id     text primary key default gen_random_uuid()::text,
  donor_id          text not null references donors(donor_id),
  reward_id         text not null references rewards(reward_id),
  points_spent      int not null,
  redemption_code   text unique,
  status            text default 'pending',
  redeemed_at       timestamptz default now(),
  confirmed_at      timestamptz,
  delivered_at      timestamptz,
  expires_at        timestamptz,
  delivery_method   text default 'email',
  feedback_rating   int check (feedback_rating between 1 and 5),
  feedback_comments text
);

-- POINT_TRANSACTIONS
create table point_transactions (
  transaction_id   text primary key default gen_random_uuid()::text,
  user_id          text not null references users(user_id),
  pickup_id        text references pickups(pickup_id),
  redemption_id    text references redemptions(redemption_id),
  transaction_type text not null,
  points_amount    int not null,
  description      text,
  transaction_date timestamptz default now()
);

-- BADGES
create table badges (
  badge_id        text primary key default gen_random_uuid()::text,
  badge_name      text not null,
  description     text,
  criteria_text   text,
  icon_url        text,
  badge_color     varchar(10),
  rarity          text default 'common',
  points_required int default 0,
  category        text,
  is_active       boolean default true,
  sort_order      int default 0,
  created_at      timestamptz default now()
);

-- USER_BADGES
create table user_badges (
  user_badge_id   text primary key default gen_random_uuid()::text,
  user_id         text not null references users(user_id),
  badge_id        text not null references badges(badge_id),
  earned_at       timestamptz default now(),
  earning_context text,
  unique(user_id, badge_id)
);

-- LEADERBOARD
create table leaderboard (
  leaderboard_id  text primary key default gen_random_uuid()::text,
  user_id         text not null references users(user_id),
  period_type     text not null,
  period_start    date not null,
  period_end      date not null,
  rank_position   int,
  total_points    int default 0,
  total_weight_kg decimal(10,2) default 0,
  pickups_count   int default 0,
  last_updated    timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  notification_id     text primary key default gen_random_uuid()::text,
  user_id             text not null references users(user_id),
  notification_type   text,
  title               text not null,
  message             text not null,
  priority            text default 'normal',
  category            text,
  is_read             boolean default false,
  is_pushed           boolean default false,
  sent_at             timestamptz,
  read_at             timestamptz,
  action_url          text,
  expires_at          timestamptz,
  scheduled_send_time timestamptz,
  created_at          timestamptz default now()
);

-- ENVIRONMENTAL_IMPACTS
create table environmental_impacts (
  impact_id        text primary key default gen_random_uuid()::text,
  pickup_id        text not null references pickups(pickup_id),
  co2_saved_kg     decimal(10,2),
  energy_saved_kwh decimal(10,2),
  trees_equivalent decimal(10,2),
  created_at       timestamptz default now()
);

-- AUDIT_LOGS
create table audit_logs (
  id          text primary key default gen_random_uuid()::text,
  user_id     text references users(user_id),
  action      text,
  entity_type text,
  entity_id   text,
  changed_at  timestamptz default now(),
  ip_address  text,
  metadata    jsonb
);

-- SPONSOR_INQUIRIES (public, no auth)
create table sponsor_inquiries (
  id                   text primary key default gen_random_uuid()::text,
  company_name         text not null,
  industry             text,
  website              text,
  contact_person       text not null,
  email                text not null,
  phone                text,
  position             text,
  company_size         text,
  partnership_type     text,
  budget               text,
  objectives           text,
  target_audience      text,
  sustainability_goals text,
  additional_info      text,
  status               text default 'pending',
  created_at           timestamptz default now()
);
```

### 1.2 Triggers

```sql
-- Award points on pickup completion + env impact
create or replace function on_pickup_complete()
returns trigger language plpgsql as $$
declare v_points int := 0;
begin
  if new.status = 'completed' and old.status != 'completed' then
    select coalesce(sum(total_points), 0) into v_points
    from pickup_items where pickup_id = new.pickup_id;
    if v_points = 0 then
      v_points := floor(coalesce(new.total_weight_kg, 0) * 10);
    end if;
    new.total_points_awarded := v_points;
    update donors set
      total_points          = total_points + v_points,
      points_earned         = points_earned + v_points,
      total_recycled_weight = total_recycled_weight + coalesce(new.total_weight_kg, 0),
      pickups_completed     = pickups_completed + 1,
      last_pickup_date      = current_date
    where donor_id = new.donor_id;
    insert into point_transactions (user_id, pickup_id, transaction_type, points_amount, description)
    select u.user_id, new.pickup_id, 'earn', v_points, 'Pickup completed'
    from donors d join users u on u.user_id = d.user_id where d.donor_id = new.donor_id;
    insert into environmental_impacts (pickup_id, co2_saved_kg, energy_saved_kwh, trees_equivalent)
    values (new.pickup_id,
      coalesce(new.total_weight_kg,0)*2.5,
      coalesce(new.total_weight_kg,0)*1.8,
      coalesce(new.total_weight_kg,0)*0.017);
  end if;
  return new;
end;$$;
create trigger pickup_complete_trigger
  before update on pickups for each row execute function on_pickup_complete();

-- Update donor level on points change
create or replace function update_level()
returns trigger language plpgsql as $$
begin
  new.level_status := case
    when new.total_points >= 1000 then 'Green Champion'
    when new.total_points >= 500  then 'Eco Warrior'
    else 'Beginner' end;
  return new;
end;$$;
create trigger donor_level_trigger
  before update of total_points on donors for each row execute function update_level();
```

### 1.3 Row Level Security

```sql
alter table users enable row level security;
alter table donors enable row level security;
alter table collectors enable row level security;
alter table pickups enable row level security;
alter table notifications enable row level security;
alter table point_transactions enable row level security;
alter table redemptions enable row level security;
alter table sponsor_inquiries enable row level security;

create policy "users_own" on users for select using (auth.uid()::text = user_id);
create policy "donors_own" on donors for select using (user_id = auth.uid()::text);
create policy "pickups_donor" on pickups for select
  using (donor_id in (select donor_id from donors where user_id = auth.uid()::text));
create policy "pickups_collector" on pickups for select
  using (route_id in (select route_id from routes
    where collector_id in (select collector_id from collectors where user_id = auth.uid()::text)));
create policy "notifications_own" on notifications for select using (user_id = auth.uid()::text);
create policy "sponsor_inquiries_insert" on sponsor_inquiries for insert to anon with check (true);
```

### 1.4 Realtime

Enable Realtime on tables: `collectors` (for live position updates to admin map), `notifications`, `pickups`.

---

## Phase 2 — Environment Variables

```
# apps/admin-web/.env  (also copy for sponsor-web)
VITE_SUPABASE_URL=https://okycddtfijycafmidlid.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```js
// apps/donor-mobile/app.config.js  (also collector-mobile)
export default {
  expo: { extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  }}
}
```

Add to every `.gitignore`: `node_modules/ dist/ .env *.local`

---

## Phase 3 — Admin Web Rebuild

### 3.1 Install
```bash
cd apps/admin-web
npm install react-router-dom @supabase/supabase-js @tanstack/react-query react-hook-form
npm install react-leaflet leaflet
npm install -D @types/leaflet @types/react-router-dom
```

### 3.2 Target Structure
```
src/
  lib/
    supabase.ts          ← createClient with env vars
    queryClient.ts       ← TanStack Query config
    leaflet.ts           ← Leaflet setup, OSM tile URL
  types/index.ts         ← all interfaces
  services/
    users.ts             ← fetchUsers, createCollector (OTP flow), updateUser
    rewards.ts           ← fetchRewards, CRUD
    routes.ts            ← fetchRoutes, optimize, assign
    collectors.ts        ← fetchCollectors, fetchLivePositions
    analytics.ts         ← fetchSystemAnalytics, fetchEnvImpact
    routeOptimization.ts ← existing DRL-GA algorithm (cleaned)
  hooks/
    useUsers.ts
    useRewards.ts
    useRoutes.ts
    useCollectors.ts
    useAnalytics.ts
  components/
    Layout/
      Sidebar.tsx        ← extracted sidebar JSX
      Header.tsx
      Layout.tsx         ← Sidebar + Header + <Outlet />
    maps/
      AdminRouteMap.tsx  ← react-leaflet: all collectors + routes bird's-eye
      RoutePolyline.tsx  ← coloured route line per collector
      CollectorMarker.tsx ← live-updating collector position marker
    shared/
      MetricCard.tsx
      StatusBadge.tsx
  pages/
    DashboardPage.tsx
    UsersPage.tsx        ← includes CreateCollectorModal (OTP)
    RewardsPage.tsx
    AnalyticsPage.tsx
    RoutesPage.tsx       ← includes AdminRouteMap
    CollectorsPage.tsx
  auth/
    AuthScreen.tsx       ← existing, moved
    AuthScreen.css
  App.tsx                ← router shell
  App.css                ← unchanged
  main.tsx
```

### 3.3 Admin Route Map
```tsx
// components/maps/AdminRouteMap.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '© OpenStreetMap contributors'

export function AdminRouteMap({ collectors, routes }) {
  // Supabase Realtime updates collector positions in state
  // Each route has a unique colour; collector marker shows name + status
  return (
    <MapContainer center={[3.1390, 101.6869]} zoom={12}>
      <TileLayer url={OSM_TILE} attribution={OSM_ATTR} />
      {collectors.map(c => <CollectorMarker key={c.id} collector={c} />)}
      {routes.map(r => <RoutePolyline key={r.id} route={r} />)}
    </MapContainer>
  )
}
```

### 3.4 Collector OTP Creation Flow (UsersPage)
1. Admin fills form: name, email, phone, vehicle, area
2. System: INSERT into users + collectors → generate random 8-char OTP → hash → INSERT collector_invitations → Resend sends email with OTP
3. Collector logs in with email + OTP → Supabase verifies → forced password change screen

### 3.5 Fixes While Extracting
| Issue | Fix |
|-------|-----|
| CollectorsPage hardcoded rows | Real data from `useCollectors` |
| Dashboard recent activity hardcoded | Real `notifications` + `point_transactions` query |
| Analytics env impact | Wire to `environmental_impacts` table |

---

## Phase 4 — Sponsor Web Rebuild

### 4.1 Install
```bash
cd apps/sponsor-web
npm install react-router-dom @supabase/supabase-js react-hook-form @tanstack/react-query
```

### 4.2 Structure
```
src/
  lib/supabase.ts
  pages/
    LandingPage.tsx         ← existing App.tsx JSX (landing + inquiry form)
    LoginPage.tsx           ← new: sponsor email/password login
    dashboard/
      DashboardPage.tsx     ← campaign overview metrics
      RewardsPage.tsx       ← create/edit/delete rewards
      AnalyticsPage.tsx     ← redemption stats, cost tracking
  components/
    Layout/
      SponsorLayout.tsx     ← nav + sidebar for authenticated area
  App.tsx                   ← router shell
  App.css                   ← unchanged
```

### 4.3 Key Sponsor Dashboard Features
- **Rewards management**: create reward (name, points required, stock, quota, validity dates), edit, toggle active/inactive
- **Redemption stats**: total redeemed, cost spent this month, remaining quota, per-reward breakdown
- **Campaign analytics**: chart of redemptions over time, top redeemed rewards

---

## Phase 5 — Donor Mobile Rebuild

### 5.1 Install
```bash
cd apps/donor-mobile
npx expo install expo-router @react-navigation/native react-native-screens
npx expo install expo-location expo-camera expo-image-picker
npx expo install react-native-fast-tflite
npx expo install react-native-webview
npx expo install @supabase/supabase-js
```

### 5.2 Screen Map
| Screen | Path | Source |
|--------|------|--------|
| Splash | `app/(auth)/splash.tsx` | App.js |
| Login | `app/(auth)/login.tsx` | AuthScreen.js |
| Signup | `app/(auth)/signup.tsx` | AuthScreen.js |
| Forgot Password | `app/(auth)/forgot-password.tsx` | AuthScreen.js |
| Dashboard | `app/(app)/index.tsx` | App.js |
| Schedule Pickup | `app/(app)/schedule.tsx` | PickupScheduleScreen.js |
| Pickup History | `app/(app)/history.tsx` | App.js |
| Rewards | `app/(app)/rewards.tsx` | RewardsScreen.js |
| Leaderboard | `app/(app)/leaderboard.tsx` | App.js |
| Profile | `app/(app)/profile.tsx` | App.js |

### 5.3 Waste Classification in Schedule Pickup
```
SchedulePickupScreen flow:
  1. Tap "Scan Waste" → open camera (expo-camera)
  2. Capture photo → run wasteClassifier.classify(uri)
  3. Show result: category icon, "Plastic", recyclable badge, "Est. 10 pts/kg"
  4. Tap "Use This" → category pre-fills in items list
  5. User enters estimated weight → point preview auto-calculates
  6. User proceeds to date/time/address selection
  7. Submit → INSERT pickups + pickup_items + qr_codes
```

### 5.4 Address Entry Options
- Text input fields (manual)
- "Use my current location" button → `expo-location.getCurrentPositionAsync()` → stores lat/lng in addresses table → reverse-geocode display label using Nominatim (OpenStreetMap's free geocoder, no API key)

---

## Phase 6 — Collector Mobile Rebuild

### 6.1 Install
```bash
cd apps/collector-mobile
npx expo install expo-router @react-navigation/native react-native-screens
npx expo install expo-camera expo-image-picker expo-location
npx expo install react-native-fast-tflite
npx expo install react-native-webview
npx expo install expo-barcode-scanner
npx expo install @supabase/supabase-js
```

### 6.2 Screen Map
| Screen | Path |
|--------|------|
| Splash | `app/(auth)/splash.tsx` |
| Login + OTP | `app/(auth)/login.tsx` |
| Change Password (first login) | `app/(auth)/set-password.tsx` |
| Dashboard / Today's Route | `app/(app)/index.tsx` |
| Live Navigation Map | `app/(app)/navigate.tsx` |
| QR Scanner | `app/(app)/scan.tsx` |
| Pickup Completion | `app/(app)/pickup/[id].tsx` |
| Notifications | `app/(app)/notifications.tsx` |
| History | `app/(app)/history.tsx` |
| Profile | `app/(app)/profile.tsx` |

### 6.3 Live Navigation Map (Leaflet in WebView)

```tsx
// app/(app)/navigate.tsx
import { WebView } from 'react-native-webview'
import * as Location from 'expo-location'

// Inline HTML string with Leaflet + Routing plugin
const getMapHTML = (stops, currentLat, currentLng) => `
<!DOCTYPE html><html><head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine/dist/leaflet-routing-machine.js"></script>
</head><body style="margin:0">
  <div id="map" style="height:100vh"></div>
  <script>
    const map = L.map('map').setView([${currentLat}, ${currentLng}], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    // Draw route via OSRM between all stops
    const waypoints = ${JSON.stringify(stops.map(s => [s.lat, s.lng]))}
    L.Routing.control({ waypoints: waypoints.map(w => L.latLng(w[0], w[1])),
      routeWhileDragging: false }).addTo(map)
    // Current position marker
    const posMarker = L.marker([${currentLat}, ${currentLng}]).addTo(map)
    // Expose update function for RN bridge
    window.updatePosition = (lat, lng) => { posMarker.setLatLng([lat, lng]); map.panTo([lat, lng]) }
  </script>
</body></html>`

// expo-location watchPosition → injectJavaScript('updatePosition(lat, lng)') into WebView
// Every position update also sent to Supabase → admin map updates via Realtime
```

### 6.4 Pickup Completion with Waste Classification
```
QR scan → verify is_used=false → show pickup details
  → "Photograph Waste" button → camera capture
  → run wasteClassifier.classify() → show suggested category
  → collector confirms / overrides
  → enter weight per category
  → "Complete Pickup" →
      UPDATE qr_codes SET is_used=true
      UPDATE pickups SET status='completed', total_weight_kg, actual_pickup_time
      INSERT pickup_items (per category with weight + ai fields)
      → triggers fire: points + env impact + badge check
```

---

## Phase 7 — Push Notifications

```bash
npx expo install expo-notifications
```

- Register FCM token on login → store in users table (`fcm_token` column)
- Supabase Edge Function: on `notifications` INSERT → fan-out push via Firebase FCM
- Email via Resend Edge Function: on `redemptions` INSERT → send voucher email

---

## Phase 8 — Realtime (Admin Map)

Enable Realtime on `collectors` in Supabase dashboard.

```ts
// In RoutesPage → AdminRouteMap component
supabase.channel('collector-positions')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'collectors',
      filter: 'current_lat=neq.null' },
    payload => { updateCollectorOnMap(payload.new) })
  .subscribe()
```

---

## Phase 9 — Waste Classification Model

### 9.1 Dataset
- TrashNet (6 classes: cardboard → Paper, glass → Glass, metal → Metal, paper → Paper, plastic → Plastic, trash → mixed)
- Kaggle Garbage Classification (12 classes, superset)
- Map to our 6: Plastic / Paper / Metal / Glass / Electronics / Textiles

### 9.2 Training Pipeline
```python
# Fine-tune EfficientNet-B0 (TensorFlow/Keras)
base = tf.keras.applications.EfficientNetB0(include_top=False, weights='imagenet')
base.trainable = False  # freeze base initially
model = Sequential([base, GlobalAveragePooling2D(), Dense(128, activation='relu'),
                    Dropout(0.3), Dense(6, activation='softmax')])
# Train top layers → unfreeze last 20 layers → fine-tune
# Export: converter = tf.lite.TFLiteConverter.from_keras_model(model)
#         converter.optimizations = [tf.lite.Optimize.DEFAULT]  # quantize
#         tflite_model = converter.convert()
```
Target: ≥80% validation accuracy. Model size: <10MB after quantization.

### 9.3 Mobile Integration
```ts
// services/wasteClassifier.ts
import { useTensorflowModel } from 'react-native-fast-tflite'

const LABELS = ['Plastic','Paper','Metal','Glass','Electronics','Textiles']

export function useWasteClassifier() {
  const model = useTensorflowModel(require('../assets/models/waste_classifier.tflite'))

  async function classify(imageUri: string) {
    // resize to 224×224, normalize to [0,1], run inference
    // returns { category: string, confidence: number, isRecyclable: boolean }
  }
  return { classify, isLoading: model.state === 'loading' }
}
```

---

## Priority Queue

| # | Task | Phase | Size | Status |
|---|------|-------|------|--------|
| 1 | ~~Cleanup unused files~~ | 0 | XS | ✅ Done |
| 2 | Create all Supabase tables | 1.1 | L | — |
| 3 | Triggers (points, level, env impact) | 1.2 | M | — |
| 4 | RLS policies + Realtime config | 1.3–1.4 | M | — |
| 5 | .env files + supabaseClient rebuild | 2 | XS | — |
| 6 | Admin web structure + pages + map | 3 | XL | — |
| 7 | Sponsor web + auth + dashboard | 4 | L | — |
| 8 | Donor mobile + classifier integration | 5 | L | — |
| 9 | Collector mobile + live map + QR | 6 | XL | — |
| 10 | Push notifications | 7 | M | — |
| 11 | Realtime admin map | 8 | S | — |
| 12 | Train + export waste classifier model | 9.1–9.2 | L | — |
| 13 | Integrate model into both mobile apps | 9.3 | M | — |

---

## Enhancement Backlog

| Feature | Notes |
|---------|-------|
| Badge award logic | Edge Function evaluating criteria on pickup complete trigger |
| Leaderboard recalculation | Scheduled Edge Function (cron weekly/monthly) |
| Analytics CSV export | Client-side `papaparse` |
| Sponsor dashboard analytics charts | Chart.js or recharts in sponsor-web |
| Offline route caching | AsyncStorage for collector's current route when offline |
| Daily digest email | Scheduled Edge Function → Resend |
| Smart notification timing | Queue `scheduled_send_time` based on activity patterns |
| Admin broadcast notifications | Admin sends message to all donors / all collectors |
| Route auto-schedule | Edge Function cron: runs DRL-GA optimization daily at 6AM |

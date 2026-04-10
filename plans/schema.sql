-- ============================================================
-- MyCycle+ — Full Database Schema
-- Run in: Supabase SQL Editor (project: xzcjvsrjtclqsaaezief)
-- ============================================================

-- ============================================================
-- LAYER 1: Independent tables (no foreign keys)
-- ============================================================

create table if not exists service_areas (
  area_id        uuid primary key default gen_random_uuid(),
  area_name      text not null,
  state          text,
  postcode_range text,
  is_active      boolean default true,
  max_collectors int default 10,
  centroid_lat   decimal(10,8),
  centroid_lng   decimal(11,8),
  created_at     timestamptz default now()
);

create table if not exists vehicles (
  vehicle_id           uuid primary key default gen_random_uuid(),
  vehicle_type         text,
  license_plate        text unique,
  make_model           text,
  year                 int,
  capacity_kg          decimal(8,2),
  fuel_type            text,
  status               text default 'available',
  last_maintenance     date,
  next_maintenance_due date,
  insurance_expiry     date,
  road_tax_expiry      date,
  created_at           timestamptz default now()
);

create table if not exists item_categories (
  category_id           uuid primary key default gen_random_uuid(),
  category_name         text not null unique,
  description           text,
  base_points_per_kg    int default 10,
  icon_url              text,
  color_code            varchar(7),
  is_active             boolean default true,
  handling_instructions text,
  sorting_priority      int default 0,
  created_at            timestamptz default now()
);

create table if not exists badges (
  badge_id        uuid primary key default gen_random_uuid(),
  badge_name      text not null unique,
  description     text,
  criteria_text   text,
  icon_url        text,
  badge_color     varchar(10),
  rarity          text default 'common' check (rarity in ('common','rare','epic','legendary')),
  points_required int default 0,
  category        text,
  is_active       boolean default true,
  sort_order      int default 0,
  created_at      timestamptz default now()
);

create table if not exists system_analytics (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  metric_type     text not null,
  total_pickups   int default 0,
  total_weight_kg decimal(10,2) default 0,
  created_at      timestamptz default now()
);

create table if not exists sponsor_inquiries (
  id                   uuid primary key default gen_random_uuid(),
  company_name         text not null,
  industry             text,
  website              text,
  contact_person       text,
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

-- ============================================================
-- LAYER 2: USERS (references auth.users)
-- ============================================================

create table if not exists users (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  user_type           text not null check (user_type in ('donor','collector','sponsor','admin')),
  email               text unique not null,
  full_name           text,
  phone               text,
  profile_image_url   text,
  verification_status text default 'pending' check (verification_status in ('pending','verified')),
  is_active           boolean default true,
  last_login          timestamptz,
  created_at          timestamptz default now()
);

-- Auto-create user profile on Supabase auth signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users (user_id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'donor')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- LAYER 3: Role tables (depend on USERS)
-- ============================================================

create table if not exists donors (
  donor_id                 uuid primary key default gen_random_uuid(),
  user_id                  uuid unique not null references users(user_id) on delete cascade,
  total_points             int default 0,
  points_earned            int default 0,
  points_spent             int default 0,
  total_recycled_weight    decimal(10,2) default 0,
  pickups_completed        int default 0,
  current_rank             int,
  level_status             text default 'Beginner' check (level_status in ('Beginner','Eco Warrior','Green Champion')),
  preferred_pickup_time    time,
  last_pickup_date         date,
  notification_preferences jsonb default '{}',
  created_at               timestamptz default now()
);

create table if not exists collectors (
  collector_id      uuid primary key default gen_random_uuid(),
  user_id           uuid unique not null references users(user_id) on delete cascade,
  vehicle_id        uuid references vehicles(vehicle_id),
  area_id           uuid references service_areas(area_id),
  collector_code    text unique,
  rating            decimal(3,2) default 0,
  total_collections int default 0,
  employment_status text,
  emergency_contact text,
  last_active       timestamptz,
  current_lat       decimal(10,8),
  current_lng       decimal(11,8),
  created_at        timestamptz default now()
);

create table if not exists admins (
  admin_id    uuid primary key default gen_random_uuid(),
  user_id     uuid unique not null references users(user_id) on delete cascade,
  role_type   text,
  permissions jsonb default '{}',
  department  text,
  created_at  timestamptz default now()
);

create table if not exists sponsors (
  sponsor_id             uuid primary key default gen_random_uuid(),
  user_id                uuid unique not null references users(user_id) on delete cascade,
  company_name           text not null,
  business_registration  text,
  industry               text,
  website_url            text,
  contact_person         text,
  partnership_type       text,
  partnership_status     text default 'pending' check (partnership_status in ('pending','active','suspended')),
  partnership_start_date date,
  brand_assets           jsonb default '{}',
  created_at             timestamptz default now()
);

create table if not exists addresses (
  address_id     uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(user_id) on delete cascade,
  address_line_1 text,
  address_line_2 text,
  city           text,
  state          text,
  postcode       text,
  country        text default 'Malaysia',
  latitude       decimal(10,8),
  longitude      decimal(11,8),
  address_type   text default 'home' check (address_type in ('home','office','other')),
  created_at     timestamptz default now()
);

-- ============================================================
-- LAYER 4: Operations
-- ============================================================

create table if not exists collector_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  collector_id  uuid not null references collectors(collector_id) on delete cascade,
  otp_hash      text not null,
  sent_to_email text,
  sent_to_phone text,
  is_used       boolean default false,
  expires_at    timestamptz not null,
  created_at    timestamptz default now()
);

create table if not exists routes (
  route_id           uuid primary key default gen_random_uuid(),
  collector_id       uuid references collectors(collector_id),
  route_name         text,
  route_date         date,
  status             text default 'pending' check (status in ('pending','active','completed')),
  total_stops        int default 0,
  completed_stops    int default 0,
  total_distance_km  decimal(8,2),
  estimated_duration interval,
  actual_duration    interval,
  priority           text,
  start_time         timestamptz,
  end_time           timestamptz,
  route_notes        text,
  osrm_geometry      jsonb,
  created_at         timestamptz default now()
);

create table if not exists qr_codes (
  qr_id                uuid primary key default gen_random_uuid(),
  qr_code              text unique not null,
  qr_data              text,
  generated_at         timestamptz default now(),
  is_used              boolean default false,
  scanned_at           timestamptz,
  scanned_by_collector uuid references collectors(collector_id),
  scan_location_lat    decimal(10,8),
  scan_location_lng    decimal(11,8)
);

create table if not exists pickups (
  pickup_id            uuid primary key default gen_random_uuid(),
  donor_id             uuid not null references donors(donor_id),
  route_id             uuid references routes(route_id),
  address_id           uuid references addresses(address_id),
  qr_id                uuid references qr_codes(qr_id),
  scheduled_date       date,
  scheduled_time       time,
  actual_pickup_time   timestamptz,
  status               text default 'pending' check (status in ('pending','assigned','in_progress','completed','cancelled')),
  total_weight_kg      decimal(8,2),
  total_points_awarded int default 0,
  collector_notes      text,
  created_at           timestamptz default now()
);

create table if not exists pickup_items (
  pickup_item_id        uuid primary key default gen_random_uuid(),
  pickup_id             uuid not null references pickups(pickup_id) on delete cascade,
  category_id           uuid not null references item_categories(category_id),
  weight_kg             decimal(8,2),
  condition_status      text,
  points_per_kg         int,
  total_points          int,
  notes                 text,
  verification_photos   jsonb default '[]',
  ai_suggested_category text,
  ai_confidence         decimal(5,4),
  created_at            timestamptz default now()
);

-- ============================================================
-- LAYER 5: Gamification
-- ============================================================

create table if not exists rewards (
  reward_id        uuid primary key default gen_random_uuid(),
  sponsor_id       uuid references sponsors(sponsor_id),
  reward_name      text not null,
  description      text,
  points_required  int not null,
  category         text,
  stock_quantity   int default 0,
  redeemed_count   int default 0,
  image_url        text,
  terms_conditions text,
  valid_from       date,
  valid_until      date,
  is_active        boolean default true,
  daily_limit      int,
  user_limit       int,
  created_at       timestamptz default now()
);

create table if not exists sponsor_rewards (
  sponsor_reward_id   uuid primary key default gen_random_uuid(),
  reward_id           uuid not null references rewards(reward_id) on delete cascade,
  sponsor_id          uuid not null references sponsors(sponsor_id),
  cost_per_redemption decimal(8,2),
  monthly_quota       int,
  redeemed_this_month int default 0,
  created_at          timestamptz default now()
);

create table if not exists redemptions (
  redemption_id     uuid primary key default gen_random_uuid(),
  donor_id          uuid not null references donors(donor_id),
  reward_id         uuid not null references rewards(reward_id),
  points_spent      int not null,
  redemption_code   text unique not null,
  status            text default 'pending' check (status in ('pending','confirmed','delivered','expired')),
  redeemed_at       timestamptz default now(),
  confirmed_at      timestamptz,
  delivered_at      timestamptz,
  expires_at        timestamptz,
  delivery_method   text check (delivery_method in ('email','physical')),
  feedback_rating   int check (feedback_rating between 1 and 5),
  feedback_comments text
);

create table if not exists point_transactions (
  transaction_id   uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(user_id),
  pickup_id        uuid references pickups(pickup_id),
  redemption_id    uuid references redemptions(redemption_id),
  transaction_type text not null check (transaction_type in ('earn','spend','bonus','adjust')),
  points_amount    int not null,
  description      text,
  transaction_date timestamptz default now()
);

create table if not exists user_badges (
  user_badge_id   uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(user_id) on delete cascade,
  badge_id        uuid not null references badges(badge_id),
  earned_at       timestamptz default now(),
  earning_context text,
  unique(user_id, badge_id)
);

create table if not exists leaderboard (
  leaderboard_id  uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(user_id) on delete cascade,
  period_type     text not null check (period_type in ('weekly','monthly','yearly')),
  period_start    date not null,
  period_end      date not null,
  rank_position   int,
  total_points    int default 0,
  total_weight_kg decimal(10,2) default 0,
  pickups_count   int default 0,
  last_updated    timestamptz default now()
);

-- ============================================================
-- LAYER 6: Engagement & Analytics
-- ============================================================

create table if not exists notifications (
  notification_id     uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(user_id) on delete cascade,
  notification_type   text check (notification_type in ('pickup','reward','gamification','system')),
  title               text not null,
  message             text,
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

create table if not exists environmental_impacts (
  impact_id        uuid primary key default gen_random_uuid(),
  pickup_id        uuid not null references pickups(pickup_id) on delete cascade,
  co2_saved_kg     decimal(10,2),
  energy_saved_kwh decimal(10,2),
  trees_equivalent decimal(10,2),
  created_at       timestamptz default now()
);

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(user_id),
  action      text not null,
  entity_type text,
  entity_id   text,
  changed_at  timestamptz default now(),
  ip_address  text,
  metadata    jsonb default '{}'
);

-- ============================================================
-- TRIGGER: on_pickup_complete
-- Awards points, updates donor stats, logs env impact
-- ============================================================

create or replace function on_pickup_complete()
returns trigger language plpgsql security definer as $$
declare
  v_total_points  int := 0;
  v_total_weight  decimal(10,2) := 0;
  v_donor_user_id uuid;
begin
  if new.status = 'completed' and old.status != 'completed' then

    -- Sum points and weight from pickup_items
    select
      coalesce(sum(pi.total_points), 0),
      coalesce(sum(pi.weight_kg), 0)
    into v_total_points, v_total_weight
    from pickup_items pi
    where pi.pickup_id = new.pickup_id;

    -- Fallback: 10 pts/kg if no items logged
    if v_total_points = 0 and new.total_weight_kg is not null then
      v_total_points := (new.total_weight_kg * 10)::int;
      v_total_weight := new.total_weight_kg;
    end if;

    -- Stamp total on the pickup row
    update pickups
    set total_points_awarded = v_total_points,
        total_weight_kg = coalesce(new.total_weight_kg, v_total_weight),
        actual_pickup_time = now()
    where pickup_id = new.pickup_id;

    -- Get donor's auth user_id for point_transactions
    select u.user_id into v_donor_user_id
    from donors d
    join users u on u.user_id = d.user_id
    where d.donor_id = new.donor_id;

    -- Update donor stats + recalculate level
    update donors set
      total_points          = total_points + v_total_points,
      points_earned         = points_earned + v_total_points,
      total_recycled_weight = total_recycled_weight + v_total_weight,
      pickups_completed     = pickups_completed + 1,
      last_pickup_date      = current_date,
      level_status          = case
        when (total_points + v_total_points) >= 1000 then 'Green Champion'
        when (total_points + v_total_points) >= 500  then 'Eco Warrior'
        else 'Beginner'
      end
    where donor_id = new.donor_id;

    -- Log point transaction
    insert into point_transactions
      (user_id, pickup_id, transaction_type, points_amount, description)
    values
      (v_donor_user_id, new.pickup_id, 'earn', v_total_points,
       'Recycling pickup completed — points awarded');

    -- Log environmental impact
    insert into environmental_impacts
      (pickup_id, co2_saved_kg, energy_saved_kwh, trees_equivalent)
    values
      (new.pickup_id,
       round((v_total_weight * 2.5)::numeric, 2),
       round((v_total_weight * 1.8)::numeric, 2),
       round((v_total_weight * 0.017)::numeric, 3));

    -- Update collector stats
    update collectors set
      total_collections = total_collections + 1,
      last_active       = now()
    where collector_id = (
      select collector_id from routes where route_id = new.route_id
    );

    -- Update route completed_stops
    update routes set
      completed_stops = completed_stops + 1
    where route_id = new.route_id;

  end if;
  return new;
end;
$$;

drop trigger if exists trg_pickup_complete on pickups;
create trigger trg_pickup_complete
  after update on pickups
  for each row execute function on_pickup_complete();

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_donors_user_id          on donors(user_id);
create index if not exists idx_collectors_user_id      on collectors(user_id);
create index if not exists idx_admins_user_id          on admins(user_id);
create index if not exists idx_sponsors_user_id        on sponsors(user_id);
create index if not exists idx_addresses_user_id       on addresses(user_id);
create index if not exists idx_pickups_donor_id        on pickups(donor_id);
create index if not exists idx_pickups_route_id        on pickups(route_id);
create index if not exists idx_pickups_status          on pickups(status);
create index if not exists idx_pickup_items_pickup_id  on pickup_items(pickup_id);
create index if not exists idx_pickup_items_category   on pickup_items(category_id);
create index if not exists idx_routes_collector_id     on routes(collector_id);
create index if not exists idx_routes_date             on routes(route_date);
create index if not exists idx_routes_status           on routes(status);
create index if not exists idx_notifications_user_id   on notifications(user_id);
create index if not exists idx_notifications_is_read   on notifications(is_read);
create index if not exists idx_point_tx_user_id        on point_transactions(user_id);
create index if not exists idx_redemptions_donor_id    on redemptions(donor_id);
create index if not exists idx_redemptions_reward_id   on redemptions(reward_id);
create index if not exists idx_leaderboard_user_period on leaderboard(user_id, period_type);
create index if not exists idx_leaderboard_rank        on leaderboard(period_type, rank_position);
create index if not exists idx_user_badges_user_id     on user_badges(user_id);
create index if not exists idx_qr_codes_code           on qr_codes(qr_code);
create index if not exists idx_env_impacts_pickup      on environmental_impacts(pickup_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users                enable row level security;
alter table donors               enable row level security;
alter table collectors           enable row level security;
alter table admins               enable row level security;
alter table sponsors             enable row level security;
alter table addresses            enable row level security;
alter table service_areas        enable row level security;
alter table vehicles             enable row level security;
alter table item_categories      enable row level security;
alter table collector_invitations enable row level security;
alter table routes               enable row level security;
alter table qr_codes             enable row level security;
alter table pickups              enable row level security;
alter table pickup_items         enable row level security;
alter table rewards              enable row level security;
alter table sponsor_rewards      enable row level security;
alter table redemptions          enable row level security;
alter table point_transactions   enable row level security;
alter table badges               enable row level security;
alter table user_badges          enable row level security;
alter table leaderboard          enable row level security;
alter table notifications        enable row level security;
alter table environmental_impacts enable row level security;
alter table system_analytics     enable row level security;
alter table audit_logs           enable row level security;
alter table sponsor_inquiries    enable row level security;

-- Helper
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- USERS
create policy "users_select_own"   on users for select using (user_id = auth.uid() or is_admin());
create policy "users_update_own"   on users for update using (user_id = auth.uid() or is_admin());
create policy "users_insert_self"  on users for insert with check (user_id = auth.uid());

-- DONORS
create policy "donors_select_own"  on donors for select using (user_id = auth.uid() or is_admin());
create policy "donors_update_own"  on donors for update using (user_id = auth.uid() or is_admin());
create policy "donors_insert_self" on donors for insert with check (user_id = auth.uid());

-- COLLECTORS
create policy "collectors_select"  on collectors for select using (user_id = auth.uid() or is_admin());
create policy "collectors_update"  on collectors for update using (user_id = auth.uid() or is_admin());
create policy "collectors_insert"  on collectors for insert with check (is_admin());

-- ADMINS
create policy "admins_all"         on admins for all using (is_admin());

-- SPONSORS
create policy "sponsors_select"    on sponsors for select using (user_id = auth.uid() or is_admin());
create policy "sponsors_update"    on sponsors for update using (user_id = auth.uid() or is_admin());
create policy "sponsors_insert"    on sponsors for insert with check (user_id = auth.uid());

-- ADDRESSES
create policy "addresses_own"      on addresses for all using (user_id = auth.uid() or is_admin());

-- SERVICE_AREAS (public read, admin write)
create policy "service_areas_read" on service_areas for select using (true);
create policy "service_areas_admin" on service_areas for insert with check (is_admin());
create policy "service_areas_admin_upd" on service_areas for update using (is_admin());
create policy "service_areas_admin_del" on service_areas for delete using (is_admin());

-- VEHICLES (authenticated read, admin write)
create policy "vehicles_read"      on vehicles for select using (auth.uid() is not null);
create policy "vehicles_admin"     on vehicles for all using (is_admin());

-- ITEM_CATEGORIES (public read, admin write)
create policy "item_cat_read"      on item_categories for select using (true);
create policy "item_cat_admin"     on item_categories for all using (is_admin());

-- COLLECTOR_INVITATIONS (admin only)
create policy "invitations_admin"  on collector_invitations for all using (is_admin());

-- ROUTES
create policy "routes_select"      on routes for select using (
  is_admin() or
  collector_id in (select collector_id from collectors where user_id = auth.uid())
);
create policy "routes_admin_write" on routes for all using (is_admin());

-- QR_CODES
create policy "qr_select"          on qr_codes for select using (
  is_admin() or
  scanned_by_collector in (select collector_id from collectors where user_id = auth.uid()) or
  qr_id in (select qr_id from pickups where donor_id in (select donor_id from donors where user_id = auth.uid()))
);
create policy "qr_admin"           on qr_codes for all using (is_admin());
create policy "qr_insert_donor"    on qr_codes for insert with check (auth.uid() is not null);

-- PICKUPS
create policy "pickups_select"     on pickups for select using (
  is_admin() or
  donor_id in (select donor_id from donors where user_id = auth.uid()) or
  route_id in (select route_id from routes where collector_id in (select collector_id from collectors where user_id = auth.uid()))
);
create policy "pickups_insert"     on pickups for insert with check (
  donor_id in (select donor_id from donors where user_id = auth.uid())
);
create policy "pickups_update"     on pickups for update using (
  is_admin() or
  donor_id in (select donor_id from donors where user_id = auth.uid()) or
  route_id in (select route_id from routes where collector_id in (select collector_id from collectors where user_id = auth.uid()))
);

-- PICKUP_ITEMS
create policy "pickup_items_select" on pickup_items for select using (
  is_admin() or
  pickup_id in (
    select pickup_id from pickups where
      donor_id in (select donor_id from donors where user_id = auth.uid()) or
      route_id in (select route_id from routes where collector_id in (select collector_id from collectors where user_id = auth.uid()))
  )
);
create policy "pickup_items_write"  on pickup_items for insert with check (
  pickup_id in (
    select pickup_id from pickups where
      donor_id in (select donor_id from donors where user_id = auth.uid()) or
      route_id in (select route_id from routes where collector_id in (select collector_id from collectors where user_id = auth.uid()))
  )
);
create policy "pickup_items_admin"  on pickup_items for update using (is_admin());
create policy "pickup_items_upd_collector" on pickup_items for update using (
  pickup_id in (
    select pickup_id from pickups where
      route_id in (select route_id from routes where collector_id in (select collector_id from collectors where user_id = auth.uid()))
  )
);

-- REWARDS (active rewards public read; sponsor manages own)
create policy "rewards_read"       on rewards for select using (
  is_active = true or is_admin() or
  sponsor_id in (select sponsor_id from sponsors where user_id = auth.uid())
);
create policy "rewards_write"      on rewards for all using (
  is_admin() or
  sponsor_id in (select sponsor_id from sponsors where user_id = auth.uid())
);

-- SPONSOR_REWARDS
create policy "sponsor_rewards_read"  on sponsor_rewards for select using (
  is_admin() or
  sponsor_id in (select sponsor_id from sponsors where user_id = auth.uid())
);
create policy "sponsor_rewards_write" on sponsor_rewards for all using (
  is_admin() or
  sponsor_id in (select sponsor_id from sponsors where user_id = auth.uid())
);

-- REDEMPTIONS
create policy "redemptions_select" on redemptions for select using (
  is_admin() or
  donor_id in (select donor_id from donors where user_id = auth.uid()) or
  reward_id in (select reward_id from rewards where sponsor_id in (select sponsor_id from sponsors where user_id = auth.uid()))
);
create policy "redemptions_insert" on redemptions for insert with check (
  donor_id in (select donor_id from donors where user_id = auth.uid())
);
create policy "redemptions_admin"  on redemptions for update using (is_admin());

-- POINT_TRANSACTIONS
create policy "pt_own"             on point_transactions for select using (user_id = auth.uid() or is_admin());

-- BADGES (public read)
create policy "badges_read"        on badges for select using (true);
create policy "badges_admin"       on badges for all using (is_admin());

-- USER_BADGES (public read for leaderboard)
create policy "user_badges_read"   on user_badges for select using (true);
create policy "user_badges_admin"  on user_badges for all using (is_admin());

-- LEADERBOARD (public read)
create policy "leaderboard_read"   on leaderboard for select using (true);
create policy "leaderboard_admin"  on leaderboard for all using (is_admin());

-- NOTIFICATIONS
create policy "notif_own"          on notifications for all using (user_id = auth.uid() or is_admin());

-- ENVIRONMENTAL_IMPACTS (public read)
create policy "env_read"           on environmental_impacts for select using (true);
create policy "env_admin"          on environmental_impacts for all using (is_admin());

-- SYSTEM_ANALYTICS (admin only)
create policy "analytics_admin"    on system_analytics for all using (is_admin());

-- AUDIT_LOGS (admin only)
create policy "audit_admin"        on audit_logs for all using (is_admin());

-- SPONSOR_INQUIRIES (anyone can submit, admin reads)
create policy "inquiries_insert"   on sponsor_inquiries for insert with check (true);
create policy "inquiries_admin"    on sponsor_inquiries for select using (is_admin());

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table collectors;
alter publication supabase_realtime add table routes;
alter publication supabase_realtime add table pickups;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- SEED: Item categories
-- ============================================================

insert into item_categories (category_name, description, base_points_per_kg, color_code, sorting_priority) values
  ('Plastic',     'Plastic bottles, containers, packaging',  10, '#3B82F6', 1),
  ('Paper',       'Newspapers, cardboard, office paper',      8, '#10B981', 2),
  ('Metal',       'Aluminium cans, steel, copper',           15, '#6B7280', 3),
  ('Glass',       'Bottles, jars, glassware',                12, '#8B5CF6', 4),
  ('Electronics', 'E-waste: phones, batteries, cables',      20, '#F59E0B', 5),
  ('Textiles',    'Clothing, fabric, shoes',                  5, '#EC4899', 6)
on conflict (category_name) do nothing;

-- ============================================================
-- SEED: Service areas (Klang Valley demo)
-- ============================================================

insert into service_areas (area_name, state, postcode_range, centroid_lat, centroid_lng) values
  ('Kuala Lumpur City', 'Wilayah Persekutuan', '50000-60000', 3.1390,  101.6869),
  ('Petaling Jaya',     'Selangor',            '46000-47999', 3.1073,  101.6067),
  ('Subang Jaya',       'Selangor',            '47500-47810', 3.0456,  101.5810),
  ('Shah Alam',         'Selangor',            '40000-41999', 3.0733,  101.5185),
  ('Cheras',            'Selangor',            '43000-43200', 3.0802,  101.7456)
on conflict do nothing;

-- ============================================================
-- SEED: Badges
-- ============================================================

insert into badges (badge_name, description, criteria_text, rarity, points_required, category, sort_order) values
  ('First Recycle',     'Completed your first pickup',               'Complete 1 pickup',           'common',    0,   'milestone', 1),
  ('Eco Starter',       'Reached Eco Warrior level',                 'Earn 500 points',             'rare',      500, 'level',     2),
  ('Green Champion',    'Reached Green Champion level',              'Earn 1000 points',            'epic',      1000,'level',     3),
  ('Heavy Lifter',      'Recycled over 100 kg total',                'Total weight >= 100 kg',      'rare',      0,   'weight',    4),
  ('Consistent Carer',  'Completed 10 pickups',                      'Complete 10 pickups',         'rare',      0,   'milestone', 5),
  ('Legend Recycler',   'Completed 50 pickups',                      'Complete 50 pickups',         'legendary', 0,   'milestone', 6)
on conflict (badge_name) do nothing;

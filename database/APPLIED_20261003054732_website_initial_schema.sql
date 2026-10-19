-- RECOVERED RECORD: already applied to jozxswzkuzdinkpmymel. Do not re-run there.
-- Original migration 20261003054732 website_initial_schema
-- Run ONCE in a new Supabase project's SQL Editor.
-- No existing racing database, legacy table or uploaded timing data is changed.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) <= 100),
  phone text not null default '' check (char_length(phone) <= 30),
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
create policy "Read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  date date not null,
  location text not null check (char_length(location) between 1 and 200),
  distance text not null check (distance in ('1/8 mile','1/4 mile','1/2 mile')),
  system_id text not null check (system_id in ('01','02','03')),
  status text not null default 'upcoming' check (status in ('upcoming','past')),
  description text not null default '' check (char_length(description) <= 4000),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index events_published_date_idx on public.events(status,date) where published;
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
create policy "Members read published events" on public.events for select to authenticated
  using (published and (select auth.uid()) is not null
    and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false');

create table public.race_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  run_no integer not null check (run_no > 0),
  lane smallint not null check (lane in (1,2)),
  driver text not null check (char_length(driver) between 1 and 150),
  vehicle text not null default '' check (char_length(vehicle) <= 150),
  race_class text not null default '' check (char_length(race_class) <= 80),
  reaction numeric(9,3), -- Negative values may represent red-light starts.
  elapsed numeric(9,3) check (elapsed >= 0),
  speed numeric(9,3) check (speed >= 0), -- km/h. ET is over the event's distance.
  created_at timestamptz not null default now(),
  unique(event_id,run_no,lane)
);
alter table public.race_results enable row level security;
revoke all on public.race_results from anon, authenticated;
grant select on public.race_results to authenticated;
create policy "Members read published race results" on public.race_results for select to authenticated
  using ((select auth.uid()) is not null
    and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false'
    and exists(select 1 from public.events e where e.id=event_id and e.published));

-- Optional direct-submission inbox. Only the server-side quotation function
-- and authorised Supabase project administrators can access these records.
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 1 and 30),
  organisation text not null default '' check (char_length(organisation) <= 120),
  event_name text not null check (char_length(event_name) between 1 and 160),
  event_date date,
  venue text not null check (char_length(venue) between 1 and 200),
  distance text not null check (distance in ('1/8 mile','1/4 mile','1/2 mile','Other / to be confirmed')),
  message text not null check (char_length(message) between 1 and 2000),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
alter table public.quote_requests enable row level security;
revoke all on public.quote_requests from anon, authenticated;
grant all on public.profiles, public.events, public.race_results, public.quote_requests to service_role;
commit;


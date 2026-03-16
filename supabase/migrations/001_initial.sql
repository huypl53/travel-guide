create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_slug text unique not null,
  created_at timestamptz default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  type text not null check (type in ('homestay', 'destination')),
  name text not null,
  address text,
  lat double precision not null,
  lon double precision not null,
  priority integer not null default 3 check (priority between 1 and 5),
  source text not null default 'manual' check (source in ('manual', 'google_maps', 'csv'))
);

create table distance_cache (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  homestay_id uuid references locations(id) on delete cascade not null,
  destination_id uuid references locations(id) on delete cascade not null,
  straight_line_km double precision not null,
  driving_km double precision,
  driving_minutes double precision,
  unique (homestay_id, destination_id)
);

create index idx_locations_trip on locations(trip_id);
create index idx_distance_cache_trip on distance_cache(trip_id);

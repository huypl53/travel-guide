-- Add user_id to trips (nullable for anonymous trips)
ALTER TABLE trips ADD COLUMN user_id uuid REFERENCES auth.users;
CREATE INDEX idx_trips_user_id ON trips(user_id);

-- Saved trips join table
CREATE TABLE saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

-- trips policies
CREATE POLICY "trips_select" ON trips FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IS NULL
  OR share_slug IS NOT NULL
);
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (
  user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NULL)
);
CREATE POLICY "trips_delete" ON trips FOR DELETE USING (
  user_id = auth.uid() OR (user_id IS NULL AND auth.uid() IS NULL)
);

-- locations policies (inherit from trip)
CREATE POLICY "locations_select" ON locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);
CREATE POLICY "locations_insert" ON locations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);
CREATE POLICY "locations_update" ON locations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);
CREATE POLICY "locations_delete" ON locations FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);

-- distance_cache policies (inherit from trip)
CREATE POLICY "distance_cache_select" ON distance_cache FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);
CREATE POLICY "distance_cache_insert" ON distance_cache FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);
CREATE POLICY "distance_cache_update" ON distance_cache FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);
CREATE POLICY "distance_cache_delete" ON distance_cache FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);

-- saved_trips policies
CREATE POLICY "saved_trips_select" ON saved_trips FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "saved_trips_insert" ON saved_trips FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "saved_trips_delete" ON saved_trips FOR DELETE USING (
  user_id = auth.uid()
);

-- Index for efficient saved_trips lookups by trip
CREATE INDEX idx_saved_trips_trip_id ON saved_trips(trip_id);

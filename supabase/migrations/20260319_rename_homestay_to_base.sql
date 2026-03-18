-- Rename "homestay" -> "base" across the database schema and data

-- 1. Rename distance_cache.homestay_id column to base_id
ALTER TABLE distance_cache RENAME COLUMN homestay_id TO base_id;

-- 2. Drop the CHECK constraint first so we can update data
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check;

-- 3. Update existing location data
UPDATE locations SET type = 'base' WHERE type = 'homestay';

-- 4. Re-add the CHECK constraint with new allowed values
ALTER TABLE locations ADD CONSTRAINT locations_type_check CHECK (type IN ('base', 'destination'));

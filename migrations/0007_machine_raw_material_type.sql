-- Film machine raw material type.
--
-- Adds a nullable column to `machines` capturing the raw material (extruder)
-- type for Film machines. Allowed application-level values are:
--   * HDPE
--   * LDPE
--   * HDPE\LDPE
-- The column is nullable; existing rows are not backfilled.

ALTER TABLE "machines"
  ADD COLUMN IF NOT EXISTS "raw_material_type" varchar(20);

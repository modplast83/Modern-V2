-- Machine type-specific dimensional constraints.
--
-- Adds nullable columns to `machines` capturing the physical operating
-- limits per machine type:
--   * Film (extruder): min/max bag width in cm
--   * Printing (printer): max print colors (1..4 = N+N) + min/max cylinder in inches
--   * Cutting (cutter): min/max cutting length in cm
-- All columns are nullable; existing rows are not backfilled.

ALTER TABLE "machines"
  ADD COLUMN IF NOT EXISTS "min_width_cm" numeric(8, 2),
  ADD COLUMN IF NOT EXISTS "max_width_cm" numeric(8, 2),
  ADD COLUMN IF NOT EXISTS "max_print_colors" integer,
  ADD COLUMN IF NOT EXISTS "min_cylinder_inch" numeric(8, 2),
  ADD COLUMN IF NOT EXISTS "max_cylinder_inch" numeric(8, 2),
  ADD COLUMN IF NOT EXISTS "min_length_cm" numeric(8, 2),
  ADD COLUMN IF NOT EXISTS "max_length_cm" numeric(8, 2);

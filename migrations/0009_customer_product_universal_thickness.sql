-- Customer product universal thickness (السماكة العالمية).
--
-- Adds an auto-computed, DB-only column to `customer_products`. It is a stored
-- generated column derived from the product's side gussets and thickness:
--   * Flat bag (no side gussets):        thickness / 2 * 10
--   * Gusseted bag (both sides folded):  thickness / 4 * 10
--   * Any other case (e.g. a single gusset) falls back to the flat formula.
-- The column is not surfaced in the UI; it is computed automatically by the
-- database and recalculated whenever the source columns change.

ALTER TABLE "customer_products"
  ADD COLUMN IF NOT EXISTS "universal_thickness" numeric(12, 4)
  GENERATED ALWAYS AS (
    CASE
      WHEN (COALESCE("left_facing", 0) = 0 AND COALESCE("right_facing", 0) = 0) THEN "thickness" / 2 * 10
      WHEN ("left_facing" > 0 AND "right_facing" > 0) THEN "thickness" / 4 * 10
      ELSE "thickness" / 2 * 10
    END
  ) STORED;

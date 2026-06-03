-- Film machine thickness range.
--
-- Adds nullable min/max thickness capability columns to `machines`, used by the
-- smart distribution engine to match an order's product thickness against the
-- machine's supported thickness range (alongside width and raw material type).
-- Units match customer_products.thickness (numeric(8,3)). Existing rows are not
-- backfilled.

ALTER TABLE "machines"
  ADD COLUMN IF NOT EXISTS "min_thickness" numeric(8, 3),
  ADD COLUMN IF NOT EXISTS "max_thickness" numeric(8, 3);

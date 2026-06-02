-- Per-side print colors for customer products.
--
-- Adds two text[] columns on `customer_products` to store up to four
-- print colors (hex strings) for the front and back design sides. The
-- number of filled entries represents the number of print colors per
-- side. Columns are nullable and default to NULL (no colors set).

ALTER TABLE "customer_products"
  ADD COLUMN IF NOT EXISTS "front_print_colors" text[];

ALTER TABLE "customer_products"
  ADD COLUMN IF NOT EXISTS "back_print_colors" text[];

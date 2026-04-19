CREATE TABLE IF NOT EXISTS "bag_weight_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "bag_type" varchar(30) NOT NULL,
  "width_cm" numeric(8, 2) NOT NULL,
  "length_cm" numeric(8, 2) NOT NULL,
  "side_gusset_cm" numeric(8, 2) NOT NULL DEFAULT '0',
  "thickness_micron" numeric(8, 2) NOT NULL,
  "layers" integer NOT NULL DEFAULT 1,
  "density" numeric(6, 3) NOT NULL,
  "grams_per_bag" numeric(12, 4) NOT NULL,
  "bags_per_kg" numeric(12, 2) NOT NULL,
  "area_m2" numeric(12, 4) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "bag_weight_records_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_bag_weight_records_user_id" ON "bag_weight_records" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_bag_weight_records_created_at" ON "bag_weight_records" ("created_at");

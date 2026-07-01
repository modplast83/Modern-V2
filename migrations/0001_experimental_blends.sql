CREATE TABLE IF NOT EXISTS "experimental_blends" (
  "id" serial PRIMARY KEY NOT NULL,
  "blend_number" varchar(50) NOT NULL,
  "machine_id" varchar(20) NOT NULL,
  "screw_type" varchar(10) NOT NULL DEFAULT 'A',
  "notes" text,
  "motor_speed_a" numeric(8, 2),
  "heater1_a" numeric(8, 2),
  "heater2_a" numeric(8, 2),
  "heater3_a" numeric(8, 2),
  "motor_speed_b" numeric(8, 2),
  "heater1_b" numeric(8, 2),
  "heater2_b" numeric(8, 2),
  "heater3_b" numeric(8, 2),
  "heater_filter" numeric(8, 2),
  "heater_mold" numeric(8, 2),
  "heater_mold_head" numeric(8, 2),
  "film_size_cm" numeric(8, 2),
  "thickness_u" numeric(8, 2),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "experimental_blend_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "blend_id" integer NOT NULL,
  "screw" varchar(5) NOT NULL DEFAULT 'A',
  "material_type" varchar(50) NOT NULL,
  "quantity" numeric(10, 2) NOT NULL,
  "percentage" numeric(5, 2),
  CONSTRAINT "experimental_blend_items_blend_id_fk" FOREIGN KEY ("blend_id") REFERENCES "experimental_blends"("id") ON DELETE CASCADE
);

ALTER TABLE "experimental_blends" ADD CONSTRAINT IF NOT EXISTS "experimental_blends_machine_id_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id");

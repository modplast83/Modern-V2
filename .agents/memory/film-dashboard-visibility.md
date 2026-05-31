---
name: Film operator dashboard visibility
description: Why film-operator order visibility must key on production_stage, not just the film_completed flag.
---

# Film operator dashboard visibility

The film operator dashboard query (`getActiveProductionOrdersForOperator`) must filter on `production_stage = 'film'`, not only on `film_completed=false AND is_final_roll_created=false`.

**Why:** `film_completed` and `is_final_roll_created` are set ONLY by the "Final Roll" (رول نهائي) button. Regular rolls never set them, even when the produced weight reaches the target. Meanwhile `production_stage` auto-advances (in `updateProductionOrderCompletionPercentages`) to `printing`/`cutting`/`done` once roll weights reach the target. So orders that hit full quantity via regular rolls linger forever in the film dashboard unless the stage filter is applied. This had stuck 14 live orders at once.

**How to apply:** Any film-operator-specific listing should include `production_stage = 'film'`. Do NOT apply this to `/api/production/active-by-machine/:machineId` — that endpoint is shared by film/printing/cutting dashboards (keyed by machine) and is intentionally cross-stage. `production_stage` is NOT NULL DEFAULT 'film', so new orders with no rolls stay visible.

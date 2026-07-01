import { db } from "./server/db";
import { rolls } from "./shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1003, ${874})`);
      const lookup = await tx.execute(sql`
        SELECT po.production_order_number,
          COALESCE((SELECT MAX(r.roll_seq) FROM rolls r WHERE r.production_order_id = 874),0) AS max_seq
        FROM production_orders po WHERE po.id = 874`);
      const po = (lookup.rows as any[])[0];
      const nextSeq = parseInt(po.max_seq ?? "0", 10) + 1;
      const rollNumber = `${po.production_order_number}-R${String(nextSeq).padStart(3, "0")}`;
      const rollData: any = {
        production_order_id: 874, stage: "film", weight_kg: 51,
        film_machine_id: "MAC01", is_last_roll: false, created_by: 1,
        roll_seq: nextSeq, roll_number: rollNumber,
        qr_code_text: JSON.stringify({ roll_number: rollNumber, roll_seq: nextSeq }),
      };
      const [created] = await tx.insert(rolls).values(rollData).returning();
      console.log("INSERT OK ->", created.roll_number, "seq", created.roll_seq, "id", created.id);
      throw new Error("__ROLLBACK__");
    });
  } catch (e: any) {
    if (e.message === "__ROLLBACK__") console.log("Rolled back cleanly (no data committed)");
    else { console.log("REAL ERROR:", e.message); console.log((e.stack||"").split("\n").slice(0,6).join("\n")); }
  }
  process.exit(0);
}
main();

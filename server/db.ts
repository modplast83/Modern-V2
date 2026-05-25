import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const MAIN_POOL_MAX = Number(process.env.DB_POOL_MAX ?? 10);
const SESSION_POOL_MAX = Number(process.env.DB_SESSION_POOL_MAX ?? 3);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAIN_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err: Error) => {
  const code = (err as any).code;
  const transient =
    code === "57P01" ||
    code === "ECONNRESET" ||
    /terminating connection|Connection terminated/i.test(err.message);
  if (transient) {
    console.warn("⚠️ Transient DB pool error (will reconnect):", err.message);
    return;
  }
  console.error("🔴 Database pool error (non-fatal):", err.message);
  console.error("📍 Error code:", code || "Unknown");
});

export const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: SESSION_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

sessionPool.on("error", (err: Error) => {
  const code = (err as any).code;
  if (
    code === "57P01" ||
    code === "ECONNRESET" ||
    /terminating connection|Connection terminated/i.test(err.message)
  ) {
    return;
  }
  console.error("🔴 Session pool error (non-fatal):", err.message);
});

export const db = drizzle({ client: pool, schema });

const TRANSIENT_CODES = new Set(["57P01", "ECONNRESET", "ETIMEDOUT", "08006", "08003"]);

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; label?: string } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.code;
      const msg = String(err?.message ?? "");
      const transient =
        TRANSIENT_CODES.has(code) ||
        /terminating connection|Connection terminated|connect ECONNREFUSED/i.test(msg);
      if (!transient || attempt === retries) throw err;
      const delay = 50 * Math.pow(2, attempt);
      console.warn(
        `⚠️ DB transient error${opts.label ? ` [${opts.label}]` : ""} (attempt ${attempt + 1}/${retries + 1}): ${msg}. Retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

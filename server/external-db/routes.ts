import {
  external_db_connections,
  insertExternalDbConnectionSchema,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { Express } from "express";
import { z } from "zod";

import { db } from "../db";
import { requireAuth, requirePermission, type AuthRequest } from "../middleware/auth";

import { encryptSecret } from "./crypto";
import {
  testConnection,
  listTables,
  listColumns,
  runQuery,
  invalidatePool,
  type ExternalDbConfig,
} from "./service";

// Shape returned to the client — NEVER includes the password.
function toClientConnection(row: typeof external_db_connections.$inferSelect) {
  const { password_encrypted, ...safe } = row;
  return safe;
}

function toConfig(
  row: typeof external_db_connections.$inferSelect,
): ExternalDbConfig {
  return {
    id: row.id,
    host: row.host,
    port: row.port,
    database_name: row.database_name,
    username: row.username,
    password_encrypted: row.password_encrypted,
    encrypt: row.encrypt,
    trust_server_certificate: row.trust_server_certificate,
  };
}

const createSchema = insertExternalDbConnectionSchema.extend({
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const updateSchema = insertExternalDbConnectionSchema.partial().extend({
  password: z.string().min(1).optional(),
});

const testSchema = z.object({
  // Either test a saved connection by id, or test ad-hoc credentials.
  connectionId: z.number().int().positive().optional(),
  host: z.string().optional(),
  port: z.coerce.number().int().positive().optional(),
  database_name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  encrypt: z.boolean().optional(),
  trust_server_certificate: z.boolean().optional(),
});

async function getConnectionOr404(
  id: number,
): Promise<typeof external_db_connections.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(external_db_connections)
    .where(eq(external_db_connections.id, id))
    .limit(1);
  return row || null;
}

export function registerExternalDbRoutes(app: Express): void {
  // List connections (no passwords)
  app.get(
    "/api/external-db/connections",
    requireAuth,
    requirePermission("manage_settings"),
    async (_req: AuthRequest, res) => {
      try {
        const rows = await db
          .select()
          .from(external_db_connections)
          .orderBy(desc(external_db_connections.created_at));
        res.json(rows.map(toClientConnection));
      } catch (error) {
        console.error("[external-db] list error:", error);
        res.status(500).json({ message: "خطأ في جلب الاتصالات" });
      }
    },
  );

  // Create connection
  app.post(
    "/api/external-db/connections",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "بيانات غير صالحة",
            errors: parsed.error.flatten().fieldErrors,
          });
        }
        const { password, ...rest } = parsed.data;
        const [row] = await db
          .insert(external_db_connections)
          .values({
            ...rest,
            password_encrypted: encryptSecret(password),
            created_by: req.user?.id ?? null,
            updated_at: new Date(),
          })
          .returning();
        res.status(201).json(toClientConnection(row));
      } catch (error) {
        console.error("[external-db] create error:", error);
        res.status(500).json({ message: "خطأ في حفظ الاتصال" });
      }
    },
  );

  // Update connection
  app.patch(
    "/api/external-db/connections/:id",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ message: "معرّف غير صالح" });
        }
        const existing = await getConnectionOr404(id);
        if (!existing) {
          return res.status(404).json({ message: "الاتصال غير موجود" });
        }
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: "بيانات غير صالحة",
            errors: parsed.error.flatten().fieldErrors,
          });
        }
        const { password, ...rest } = parsed.data;
        const updateValues: Record<string, unknown> = {
          ...rest,
          updated_at: new Date(),
        };
        if (password) {
          updateValues.password_encrypted = encryptSecret(password);
        }
        const [row] = await db
          .update(external_db_connections)
          .set(updateValues)
          .where(eq(external_db_connections.id, id))
          .returning();
        invalidatePool(id);
        res.json(toClientConnection(row));
      } catch (error) {
        console.error("[external-db] update error:", error);
        res.status(500).json({ message: "خطأ في تحديث الاتصال" });
      }
    },
  );

  // Delete connection
  app.delete(
    "/api/external-db/connections/:id",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ message: "معرّف غير صالح" });
        }
        await db
          .delete(external_db_connections)
          .where(eq(external_db_connections.id, id));
        invalidatePool(id);
        res.json({ success: true });
      } catch (error) {
        console.error("[external-db] delete error:", error);
        res.status(500).json({ message: "خطأ في حذف الاتصال" });
      }
    },
  );

  // Test connection (saved by id, or ad-hoc credentials)
  app.post(
    "/api/external-db/test",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const parsed = testSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: "بيانات غير صالحة" });
        }
        let config: ExternalDbConfig;
        if (parsed.data.connectionId) {
          const row = await getConnectionOr404(parsed.data.connectionId);
          if (!row) {
            return res.status(404).json({ message: "الاتصال غير موجود" });
          }
          config = toConfig(row);
        } else {
          const d = parsed.data;
          if (!d.host || !d.database_name || !d.username || !d.password) {
            return res
              .status(400)
              .json({ message: "الحقول المطلوبة غير مكتملة" });
          }
          config = {
            host: d.host,
            port: d.port ?? 1433,
            database_name: d.database_name,
            username: d.username,
            password: d.password,
            encrypt: d.encrypt ?? true,
            trust_server_certificate: d.trust_server_certificate ?? false,
          };
        }
        await testConnection(config);
        res.json({ success: true, message: "تم الاتصال بنجاح" });
      } catch (error: any) {
        res
          .status(400)
          .json({ success: false, message: error?.message || "فشل الاتصال" });
      }
    },
  );

  // List tables for a saved connection
  app.get(
    "/api/external-db/connections/:id/tables",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const row = await getConnectionOr404(id);
        if (!row) {
          return res.status(404).json({ message: "الاتصال غير موجود" });
        }
        const tables = await listTables(toConfig(row));
        res.json(tables);
      } catch (error: any) {
        res
          .status(400)
          .json({ message: error?.message || "خطأ في جلب الجداول" });
      }
    },
  );

  // List columns for a table
  app.get(
    "/api/external-db/connections/:id/columns",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const schema = String(req.query.schema || "");
        const table = String(req.query.table || "");
        if (!schema || !table) {
          return res.status(400).json({ message: "اسم الجدول مطلوب" });
        }
        const row = await getConnectionOr404(id);
        if (!row) {
          return res.status(404).json({ message: "الاتصال غير موجود" });
        }
        const columns = await listColumns(toConfig(row), schema, table);
        res.json(columns);
      } catch (error: any) {
        res
          .status(400)
          .json({ message: error?.message || "خطأ في جلب الأعمدة" });
      }
    },
  );

  // Run a SELECT-only query
  app.post(
    "/api/external-db/connections/:id/query",
    requireAuth,
    requirePermission("manage_settings"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const sqlText = String(req.body?.sql || "");
        const row = await getConnectionOr404(id);
        if (!row) {
          return res.status(404).json({ message: "الاتصال غير موجود" });
        }
        const result = await runQuery(toConfig(row), sqlText);
        res.json(result);
      } catch (error: any) {
        res
          .status(400)
          .json({ message: error?.message || "خطأ في تنفيذ الاستعلام" });
      }
    },
  );
}

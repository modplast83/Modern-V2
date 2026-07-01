import mssql from "mssql";

import { decryptSecret, CredentialDecryptionError } from "./crypto";

export interface ExternalDbConfig {
  id?: number;
  host: string;
  port: number;
  database_name: string;
  username: string;
  // For test-before-save we accept a raw password; for saved connections we
  // pass password_encrypted and decrypt internally.
  password?: string;
  password_encrypted?: string;
  key_version?: number | null;
  encrypt: boolean;
  trust_server_certificate: boolean;
}

const CONNECT_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ROWS = 1000;

// Pool cache keyed by connection id so repeated queries reuse one pool.
const pools = new Map<number, mssql.ConnectionPool>();

function resolvePassword(config: ExternalDbConfig): string {
  if (typeof config.password === "string" && config.password.length > 0) {
    return config.password;
  }
  if (config.password_encrypted) {
    return decryptSecret(config.password_encrypted, config.key_version);
  }
  throw new Error("كلمة المرور غير متوفرة للاتصال");
}

function buildPoolConfig(config: ExternalDbConfig): mssql.config {
  return {
    server: config.host,
    port: config.port,
    database: config.database_name,
    user: config.username,
    password: resolvePassword(config),
    connectionTimeout: CONNECT_TIMEOUT_MS,
    requestTimeout: REQUEST_TIMEOUT_MS,
    pool: { max: 3, min: 0, idleTimeoutMillis: 30_000 },
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trust_server_certificate,
      enableArithAbort: true,
    },
  };
}

// Translate raw mssql errors into safe Arabic messages (no secret leakage).
function toArabicError(err: any): Error {
  // A credential that can't be decrypted is unrecoverable — surface the clear
  // "please re-enter the password" message instead of a generic connection error.
  if (err instanceof CredentialDecryptionError) {
    return err;
  }
  const code = String(err?.code || "");
  const msg = String(err?.message || "");
  if (code === "ELOGIN" || /Login failed/i.test(msg)) {
    return new Error("فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة");
  }
  if (code === "ETIMEOUT" || code === "ETIMconnection" || /timeout/i.test(msg)) {
    return new Error(
      "انتهت مهلة الاتصال: تأكد من أن الخادم متاح ويمكن الوصول إليه من الإنترنت",
    );
  }
  if (code === "ESOCKET" || code === "ECONNREFUSED" || /ECONNREFUSED|ENOTFOUND|getaddrinfo/i.test(msg)) {
    return new Error(
      "تعذر الوصول إلى الخادم: تحقق من العنوان والمنفذ وأن الخادم مفتوح للاتصال الخارجي",
    );
  }
  return new Error("خطأ في الاتصال بقاعدة البيانات الخارجية");
}

export async function testConnection(config: ExternalDbConfig): Promise<void> {
  let pool: mssql.ConnectionPool | null = null;
  try {
    pool = new mssql.ConnectionPool(buildPoolConfig(config));
    await pool.connect();
    await pool.request().query("SELECT 1 AS ok");
  } catch (err) {
    throw toArabicError(err);
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch {
        /* ignore */
      }
    }
  }
}

async function getPool(config: ExternalDbConfig): Promise<mssql.ConnectionPool> {
  if (!config.id) {
    // Ad-hoc pool (not cached) — caller must close.
    const p = new mssql.ConnectionPool(buildPoolConfig(config));
    await p.connect();
    return p;
  }
  const existing = pools.get(config.id);
  if (existing && existing.connected) return existing;
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* ignore */
    }
    pools.delete(config.id);
  }
  const pool = new mssql.ConnectionPool(buildPoolConfig(config));
  pool.on("error", () => {
    if (config.id) pools.delete(config.id);
  });
  await pool.connect();
  pools.set(config.id, pool);
  return pool;
}

export function invalidatePool(id: number): void {
  const p = pools.get(id);
  if (p) {
    p.close().catch(() => {});
    pools.delete(id);
  }
}

export interface TableInfo {
  schema: string;
  name: string;
  type: string;
}

export async function listTables(
  config: ExternalDbConfig,
): Promise<TableInfo[]> {
  try {
    const pool = await getPool(config);
    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS [name], TABLE_TYPE AS [type]
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    return result.recordset as TableInfo[];
  } catch (err) {
    throw toArabicError(err);
  }
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: string;
  maxLength: number | null;
}

export async function listColumns(
  config: ExternalDbConfig,
  schema: string,
  table: string,
): Promise<ColumnInfo[]> {
  try {
    const pool = await getPool(config);
    const result = await pool
      .request()
      .input("schema", mssql.NVarChar, schema)
      .input("table", mssql.NVarChar, table).query(`
        SELECT
          COLUMN_NAME AS [name],
          DATA_TYPE AS [dataType],
          IS_NULLABLE AS [isNullable],
          CHARACTER_MAXIMUM_LENGTH AS [maxLength]
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION
      `);
    return result.recordset as ColumnInfo[];
  } catch (err) {
    throw toArabicError(err);
  }
}

// Remove SQL comments so keyword/statement checks can't be bypassed.
function stripComments(sql: string): string {
  // Remove block comments /* ... */
  let out = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Remove line comments -- ...
  out = out.replace(/--[^\n\r]*/g, " ");
  return out;
}

const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
  "create",
  "merge",
  "exec",
  "execute",
  "grant",
  "revoke",
  "into",
  "sp_",
  "xp_",
  "shutdown",
  "backup",
  "restore",
  "openrowset",
  "opendatasource",
  "bulk",
  "waitfor",
];

export function validateSelectOnly(rawSql: string): string {
  if (typeof rawSql !== "string" || rawSql.trim().length === 0) {
    throw new Error("الاستعلام فارغ");
  }
  const cleaned = stripComments(rawSql).trim();
  if (cleaned.length === 0) {
    throw new Error("الاستعلام فارغ");
  }
  // Disallow multiple statements: only a single trailing semicolon is allowed.
  const withoutTrailing = cleaned.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) {
    throw new Error("غير مسموح بتنفيذ أكثر من جملة واحدة");
  }
  const lower = withoutTrailing.toLowerCase();
  if (!/^\s*(select|with)\b/.test(lower)) {
    throw new Error("يُسمح فقط باستعلامات القراءة (SELECT)");
  }
  for (const kw of FORBIDDEN_KEYWORDS) {
    // word-boundary match (sp_/xp_ are prefixes, handled by \b on the left)
    const re = new RegExp(`(^|[^a-z0-9_])${kw}([^a-z0-9_]|$)`, "i");
    if (re.test(withoutTrailing)) {
      throw new Error(`غير مسموح باستخدام الكلمة المحظورة: ${kw.toUpperCase()}`);
    }
  }
  return withoutTrailing;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

// A bound parameter value supplied at run time for a saved query placeholder.
export interface QueryParamBinding {
  name: string;
  type: "text" | "number" | "date";
  value: string | number | null;
}

function bindParams(
  request: mssql.Request,
  params: QueryParamBinding[],
): void {
  for (const p of params) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) {
      throw new Error(`اسم المعامل غير صالح: ${p.name}`);
    }
    if (p.type === "number") {
      const num =
        p.value === null || p.value === "" ? null : Number(p.value);
      if (num !== null && Number.isNaN(num)) {
        throw new Error(`قيمة رقمية غير صالحة للمعامل: ${p.name}`);
      }
      request.input(p.name, mssql.Float, num);
    } else if (p.type === "date") {
      const d =
        p.value === null || p.value === "" ? null : new Date(p.value);
      if (d !== null && Number.isNaN(d.getTime())) {
        throw new Error(`تاريخ غير صالح للمعامل: ${p.name}`);
      }
      request.input(p.name, mssql.DateTime, d);
    } else {
      const s = p.value === null ? null : String(p.value);
      request.input(p.name, mssql.NVarChar, s);
    }
  }
}

export async function runQuery(
  config: ExternalDbConfig,
  rawSql: string,
  params: QueryParamBinding[] = [],
): Promise<QueryResult> {
  const safeSql = validateSelectOnly(rawSql);
  try {
    const pool = await getPool(config);
    const request = pool.request();
    bindParams(request, params);
    // Server-controlled row cap so a heavy query can't exhaust memory.
    const batch = `SET ROWCOUNT ${MAX_ROWS + 1};\n${safeSql};\nSET ROWCOUNT 0;`;
    const result = await request.query(batch);
    let rows = (result.recordset || []) as Record<string, unknown>[];
    const truncated = rows.length > MAX_ROWS;
    if (truncated) rows = rows.slice(0, MAX_ROWS);
    const columns =
      rows.length > 0
        ? Object.keys(rows[0])
        : result.recordset && (result.recordset as any).columns
          ? Object.keys((result.recordset as any).columns)
          : [];
    return { columns, rows, rowCount: rows.length, truncated };
  } catch (err: any) {
    // Surface genuine SQL syntax/permission errors (sanitized) to help the user.
    const msg = String(err?.message || "");
    if (err?.number || /syntax|Invalid|incorrect|permission|denied/i.test(msg)) {
      throw new Error(`خطأ في تنفيذ الاستعلام: ${msg.slice(0, 300)}`);
    }
    throw toArabicError(err);
  }
}

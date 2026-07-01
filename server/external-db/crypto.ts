import crypto from "crypto";

// AES-256-GCM encryption for external DB credentials at rest.
//
// Keys are derived from SESSION_SECRET via scrypt so we never store a separate
// plaintext key. Because the key is tied to SESSION_SECRET, rotating that secret
// would otherwise make every stored credential undecryptable. To make rotation
// safe we version every ciphertext:
//
//   Stored format: v<N>:base64(iv):base64(authTag):base64(ciphertext)
//   Legacy format: base64(iv):base64(authTag):base64(ciphertext)  (treated as v1)
//
// The version (N) tells us which key encrypted the value. A key registry maps
// versions to derived keys, built from environment secrets:
//
//   - SESSION_SECRET          -> current key, version = CURRENT_KEY_VERSION
//   - SESSION_SECRET_PREVIOUS -> previous key, version = CURRENT_KEY_VERSION - 1
//
// Rotation procedure (see replit.md "Secrets rotation"):
//   1. Move the existing SESSION_SECRET value into SESSION_SECRET_PREVIOUS.
//   2. Set SESSION_SECRET to the new value.
//   3. Set EXTERNAL_DB_KEY_VERSION to the new (incremented) version.
//   4. Restart, then call POST /api/external-db/rotate-key to re-encrypt all
//      stored credentials with the new key.
//   5. Once migration succeeds, SESSION_SECRET_PREVIOUS can be removed.

const STATIC_SALT = "mpbf-external-db-credential-salt-v1";

// The key version used for all new writes. Defaults to 1. Bump this (via the
// EXTERNAL_DB_KEY_VERSION env var) when rotating SESSION_SECRET.
export const CURRENT_KEY_VERSION: number = (() => {
  const raw = process.env.EXTERNAL_DB_KEY_VERSION;
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isInteger(n) && n > 0 ? n : 1;
})();

// Thrown when a stored credential cannot be decrypted with any available key.
// Callers should surface a "please re-enter the password" message rather than a
// generic failure, since the password is unrecoverable and must be re-entered.
export class CredentialDecryptionError extends Error {
  constructor() {
    super(
      "تعذّر فك تشفير كلمة المرور المخزنة (ربما تم تغيير SESSION_SECRET). يرجى إعادة إدخال كلمة المرور لهذا الاتصال.",
    );
    this.name = "CredentialDecryptionError";
  }
}

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, STATIC_SALT, 32);
}

// Build the version -> key registry from the available environment secrets.
function buildKeyRegistry(): Map<number, Buffer> {
  const registry = new Map<number, Buffer>();
  const current = process.env.SESSION_SECRET;
  if (current && current.length > 0) {
    registry.set(CURRENT_KEY_VERSION, deriveKey(current));
  }
  const previous = process.env.SESSION_SECRET_PREVIOUS;
  if (previous && previous.length > 0) {
    // Map the previous secret to the version just below the current one. If the
    // version wasn't bumped, still register it under v1 so legacy values decrypt.
    const prevVersion = CURRENT_KEY_VERSION > 1 ? CURRENT_KEY_VERSION - 1 : 1;
    if (!registry.has(prevVersion)) {
      registry.set(prevVersion, deriveKey(previous));
    }
  }
  return registry;
}

function requireRegistry(): Map<number, Buffer> {
  const registry = buildKeyRegistry();
  if (registry.size === 0) {
    // Never fall back to a predictable/static key — that would make stored
    // external DB credentials recoverable from a DB dump. Fail loudly instead.
    throw new Error(
      "SESSION_SECRET غير مهيأ: لا يمكن تشفير/فك تشفير بيانات الاتصال بقاعدة البيانات الخارجية",
    );
  }
  return registry;
}

export function encryptSecret(plaintext: string): string {
  const registry = requireRegistry();
  const key = registry.get(CURRENT_KEY_VERSION);
  if (!key) {
    throw new Error(
      "SESSION_SECRET غير مهيأ: لا يمكن تشفير بيانات الاتصال بقاعدة البيانات الخارجية",
    );
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    `v${CURRENT_KEY_VERSION}`,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

interface ParsedSecret {
  version: number;
  ivB64: string;
  tagB64: string;
  ctB64: string;
}

// Parse a stored value, supporting both the versioned and legacy formats. The
// optional keyVersionHint (from the row's key_version column) is used for legacy
// values that have no inline version prefix.
function parseStored(stored: string, keyVersionHint?: number | null): ParsedSecret {
  const parts = stored.split(":");
  if (parts.length === 4 && /^v\d+$/i.test(parts[0])) {
    return {
      version: parseInt(parts[0].slice(1), 10),
      ivB64: parts[1],
      tagB64: parts[2],
      ctB64: parts[3],
    };
  }
  if (parts.length === 3) {
    return {
      version: keyVersionHint && keyVersionHint > 0 ? keyVersionHint : 1,
      ivB64: parts[0],
      tagB64: parts[1],
      ctB64: parts[2],
    };
  }
  throw new Error("صيغة كلمة المرور المخزنة غير صالحة");
}

function decryptWith(key: Buffer, parsed: ParsedSecret): string {
  const iv = Buffer.from(parsed.ivB64, "base64");
  const authTag = Buffer.from(parsed.tagB64, "base64");
  const ciphertext = Buffer.from(parsed.ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function decryptSecret(
  stored: string,
  keyVersionHint?: number | null,
): string {
  const registry = requireRegistry();
  const parsed = parseStored(stored, keyVersionHint);

  // Try the key indicated by the version first, then every other available key
  // as a fallback (covers slightly mismatched version numbers across a rotation).
  const tried = new Set<Buffer>();
  const order: Buffer[] = [];
  const primary = registry.get(parsed.version);
  if (primary) {
    order.push(primary);
    tried.add(primary);
  }
  for (const key of registry.values()) {
    if (!tried.has(key)) {
      order.push(key);
      tried.add(key);
    }
  }

  for (const key of order) {
    try {
      return decryptWith(key, parsed);
    } catch {
      // Wrong key — try the next one.
    }
  }
  throw new CredentialDecryptionError();
}

// Re-encrypt a stored value with the current key. Returns the new ciphertext, or
// null if it already uses the current key version (nothing to do). Throws
// CredentialDecryptionError if the value can't be decrypted with any key.
export function reencryptSecret(
  stored: string,
  keyVersionHint?: number | null,
): string | null {
  const parsed = parseStored(stored, keyVersionHint);
  const hasInlineVersion = /^v\d+:/i.test(stored);
  if (hasInlineVersion && parsed.version === CURRENT_KEY_VERSION) {
    return null;
  }
  const plaintext = decryptSecret(stored, keyVersionHint);
  return encryptSecret(plaintext);
}

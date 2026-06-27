import crypto from "crypto";

// AES-256-GCM encryption for external DB credentials at rest.
// The key is derived from SESSION_SECRET via scrypt so we never store a
// separate plaintext key. Stored format: base64(iv):base64(authTag):base64(ct)

const STATIC_SALT = "mpbf-external-db-credential-salt-v1";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length === 0) {
    // Never fall back to a predictable/static key — that would make stored
    // external DB credentials recoverable from a DB dump. Fail loudly instead.
    throw new Error(
      "SESSION_SECRET غير مهيأ: لا يمكن تشفير/فك تشفير بيانات الاتصال بقاعدة البيانات الخارجية",
    );
  }
  return crypto.scryptSync(secret, STATIC_SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("صيغة كلمة المرور المخزنة غير صالحة");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

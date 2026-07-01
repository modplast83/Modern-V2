/**
 * Robust ID generation utilities to prevent timestamp-based collisions
 *
 * This module provides various ID generation methods that are collision-resistant
 * even under high concurrent load.
 */

// Simple counter to ensure uniqueness within the same process/session
let sequenceCounter = 0;

/**
 * Generate a simple UUID v4 (random)
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID using timestamp + counter + random
 * More collision-resistant than plain timestamp
 */
export function generateShortId(prefix?: string): string {
  const timestamp = Date.now().toString(36); // Base36 is shorter
  const counter = (++sequenceCounter).toString(36).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 5);

  const id = `${timestamp}${counter}${random}`;
  return prefix ? `${prefix}${id}` : id;
}

/**
 * Generate a human-readable ID with year-based format
 * Format: PREFIX-YYYY-HHMMSS-RRR (H=hour/minute/second, R=random)
 */
export function generateReadableId(prefix: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const timeStr = [
    now.getHours().toString().padStart(2, "0"),
    now.getMinutes().toString().padStart(2, "0"),
    now.getSeconds().toString().padStart(2, "0"),
  ].join("");
  const random = Math.random().toString().substring(2, 5);
  const counter = (++sequenceCounter).toString().padStart(3, "0");

  return `${prefix}-${year}-${timeStr}-${random}${counter}`;
}

/**
 * Generate a sequential ID with prefix and padding
 * Uses timestamp + counter for better uniqueness
 */
export function generateSequentialId(
  prefix: string,
  length: number = 6,
): string {
  const timestamp = Date.now().toString();
  const counter = (++sequenceCounter).toString();
  const combined = timestamp + counter;

  // Take the last 'length' digits
  const digits = combined.slice(-length).padStart(length, "0");
  return `${prefix}${digits}`;
}

/**
 * Generate customer ID (collision-resistant)
 */
export function generateCustomerId(): string {
  return generateSequentialId("CID", 8); // CID + 8 digits
}

/**
 * Generate order number (human-readable with year)
 */
export function generateOrderNumber(): string {
  return generateReadableId("ORD");
}

/**
 * Generate job order number
 */
export function generateJobOrderNumber(): string {
  return generateReadableId("JO");
}

/**
 * Generate sequential roll number (01, 02, 03, etc.)
 */
export function generateRollNumber(rollCount: number): string {
  return (rollCount + 1).toString().padStart(2, "0");
}

/**
 * Generate legacy readable roll ID (kept for backward compatibility)
 */
export function generateReadableRollId(): string {
  return generateReadableId("R");
}

/**
 * Generate action number for maintenance actions
 */
export function generateActionNumber(): string {
  return generateSequentialId("MA", 8);
}

/**
 * Generate maintenance report number
 */
export function generateMaintenanceReportNumber(): string {
  return generateSequentialId("MR", 8);
}

/**
 * Generate operator negligence report number
 */
export function generateOperatorReportNumber(): string {
  return generateSequentialId("ON", 8);
}

/**
 * Generate certificate number
 */
export function generateCertificateNumber(
  enrollmentId: string | number,
): string {
  const shortId = generateShortId();
  return `CERT-${shortId}-${enrollmentId}`;
}

/**
 * Generate notification ID (already has good collision resistance but improving)
 */
export function generateNotificationId(type?: string): string {
  const shortId = generateShortId();
  return type ? `${type}_${shortId}` : `notif_${shortId}`;
}

/**
 * Generate message ID for chat/AI systems
 */
export function generateMessageId(): string {
  return generateShortId("msg");
}

/**
 * Reset sequence counter (mainly for testing)
 */
export function resetSequenceCounter(): void {
  sequenceCounter = 0;
}

export default {
  generateUUID,
  generateShortId,
  generateReadableId,
  generateSequentialId,
  generateCustomerId,
  generateOrderNumber,
  generateJobOrderNumber,
  generateRollNumber,
  generateActionNumber,
  generateMaintenanceReportNumber,
  generateOperatorReportNumber,
  generateCertificateNumber,
  generateNotificationId,
  generateMessageId,
  resetSequenceCounter,
};

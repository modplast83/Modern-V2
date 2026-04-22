/**
 * Transaction middleware for ensuring data consistency
 */

import { sql } from "drizzle-orm";
import { Response, Request, NextFunction } from "express";

import { db } from "../db";

/**
 * Wraps an async route handler to ensure it runs within a database transaction
 */
export function withTransaction(
  handler: (req: Request, res: Response, tx: any) => Promise<void>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db.transaction(async (tx) => {
        await handler(req, res, tx);
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Acquires an advisory lock for the given key
 * This prevents concurrent modifications to the same resource
 * @param tx - Transaction object
 * @param lockKey - Unique key for the lock
 * @param timeout - Timeout in milliseconds (default: 5000)
 */
export async function acquireAdvisoryLock(
  tx: any,
  lockKey: number,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    // Try to acquire the lock with timeout
    const result = await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${lockKey})`,
    );
    return true;
  } catch (error) {
    console.error(`Failed to acquire advisory lock for key ${lockKey}:`, error);
    return false;
  }
}

/**
 * Ensures a resource is locked for update within a transaction
 * @param tx - Transaction object
 * @param table - Table name
 * @param id - Resource ID
 * @param lockTimeout - Lock timeout in milliseconds
 */
export async function lockResourceForUpdate(
  tx: any,
  table: string,
  id: number,
  lockTimeout: number = 5000,
): Promise<void> {
  try {
    const timeoutMs = parseInt(String(lockTimeout), 10);
    if (isNaN(timeoutMs) || timeoutMs < 0) {
      throw new Error("Invalid lock timeout value");
    }
    const timeoutValue = `${timeoutMs}ms`;
    await tx.execute(sql`SET LOCAL lock_timeout = ${timeoutValue}`);
    await tx.execute(
      sql`SELECT * FROM ${sql.identifier(table)} WHERE id = ${id} FOR UPDATE NOWAIT`,
    );
  } catch (error: any) {
    if (error.code === "55P03") {
      throw new Error(`المورد مشغول حالياً، يرجى المحاولة مرة أخرى`);
    }
    throw error;
  }
}

/**
 * Middleware to handle optimistic locking using version numbers
 */
export interface OptimisticLockable {
  version?: number;
  updated_at?: Date;
}

export function checkOptimisticLock<T extends OptimisticLockable>(
  currentRecord: T,
  requestVersion?: number,
): void {
  if (
    requestVersion !== undefined &&
    currentRecord.version !== requestVersion
  ) {
    throw new Error(
      `البيانات تم تحديثها من قبل مستخدم آخر، يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى`,
    );
  }
}

/**
 * Retry a database operation with exponential backoff
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100,
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry for non-retryable errors
      if (error.code && !["40001", "40P01", "55P03"].includes(error.code)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

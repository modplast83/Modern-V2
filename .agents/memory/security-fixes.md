---
name: Security fixes pass 1 & 2
description: Two-pass security audit fixes — patterns, decisions, and what was changed to avoid re-introducing the same issues.
---

## Pass 1 fixes (auth & DB)
- `/api/customers`, `/api/rolls`, `/api/machines`, production-order activate/assign — all lacked `requirePermission`; added it.
- Roll creation had a race condition → fixed with `db.transaction + SELECT ... FOR UPDATE`.
- N+1 in `getMachineQueues` → resolved with a single joined query.
- `getAuthUserId` and `notificationManager` had untyped returns → typed properly.
- Dashboard / machine-queue cache invalidation added in `RollCreationModalEnhanced`.

## Pass 2 fixes (security hardening)

### Public order IDOR
- `/api/public/orders/:id` was returning `customer.phone` — removed. Public endpoint returns names only, never PII contact fields.

### Twilio webhook signature
- Was checking header _exists_ only. Now validates full HMAC-SHA1 per Twilio spec (URL + sorted param pairs, `timingSafeEqual`).
- **Why:** Forged webhook payloads could manipulate notification status without this.
- If `TWILIO_AUTH_TOKEN` is unset a loud `logger.warn` fires on every request — intentional to surface misconfiguration.

### Setup endpoint rate limit
- Added in-memory IP rate-limiter: 5 attempts per IP per 15-minute window → HTTP 429.
- Map key is first IP from `x-forwarded-for` (or `remoteAddress`). Map entries self-expire (checked on each hit).

### AI SQL sensitive table blocklist
- Pattern expanded to cover: `role_permissions`, `user_permissions`, `ai_agent_settings`, `ai_agent_feature_instructions`, `ai_agent_knowledge`, `sessions`.
- Pattern guards `UPDATE` and `INSERT INTO` only (SELECT is still allowed for those tables).

### AI sandbox user isolation
- `executeFunction(name, args, userPermissions?, userId?)` — added `userId` param.
- All `ai_sandbox_data` reads/writes/deletes are now scoped with `batch_id LIKE 'u{userId}_%'`.
- `generate_sandbox_data` prefixes generated batchIds with `u{userId}_`.
- `delete_all` respects admin vs non-admin: admins wipe all rows, regular users wipe only their own prefix.
- Call site: `executeFunction(fn.name, args, userPerms, (req as any).user?.id)`.

### Session resave
- Changed `resave: true` → `resave: false`.
- **Why:** The session extension middleware already calls `req.session.save()` manually; `resave: true` was causing an extra write on every request that touched the session.

### Silent catch blocks
- `cleanupOldDocs` inner and outer `catch {}` now log with `logger.warn` so file-system errors appear in server logs.
- **Gotcha:** `server/ai-agent-routes.ts` did not import `logger` — the `logger.warn` calls would have thrown `ReferenceError` on any fs error. Fixed by adding `import { logger } from "./lib/logger";`. When adding `logger.*` to a file, confirm the import exists.

## Bug-check pass (type errors)
- **SafeUser selects must be complete:** `SafeUser = Omit<User, "password">`. Any `db.select({...})` in a function typed to return `SafeUser` must list every non-password user column (esp. `must_change_password`, consumed by the force-password-change flow), or `tsc` errors and the field is silently undefined at runtime. `getSafeUser`/`getSafeUsers`/`getSafeUsersByRole` were missing it.
- `orders` table has NO `priority` column — `priority` lives on `user_requests`. The public order endpoint was sending `priority: order.priority` (always undefined); removed.
- `NotificationManager` interface in `server/storage.ts` must mirror the real signature in `server/services/notification-manager.ts` (`broadcastProductionUpdate(updateType?: "film"|"printing"|"cutting"|"all")`); the old `[key: string]: unknown` index signature blocked assigning the real class instance. Call site uses optional chaining since the methods are optional.

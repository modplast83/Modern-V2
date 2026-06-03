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

## Pass 3 fixes (Modern AI agent — private knowledge & doc access)

### Private-knowledge non-disclosure must be enforced server-side, not just by prompt
- Prompt instructions ("never quote verbatim") are NOT a control. Added deterministic `detectPrivateLeak()` (in `server/modern-agent/tools.ts`, exported + reused by routes) that substring-matches normalized private KB content against any user-visible output.
- Windowing rule: `win = min(60, content.length)`, step 20, PLUS an always-checked trailing window `content.slice(-win)`. A naive fixed `win=60` silently skips secrets of length 40–59 (the loop never runs) and skips the tail — both are exploitable gaps.
- Apply the guardrail to BOTH surfaces: the final assistant reply AND generated documents (combine title/intro/sections/table cells/footer before checking). A reply-only check is bypassable by asking the agent to put the secret in a PDF/Word doc, then downloading it.
- **How to apply:** fetch private contents once per chat request, pass into every tool's ToolContext (`privateKnowledge`), reuse for the final reply check. generate_document returns `{error:"private_content_blocked"}` and writes no file on a hit.

### Agent-generated documents need owner binding (IDOR)
- Temp-file docs are bound to creator via filename prefix `u{userId}-`; `getDocOwnerId()` parses it; download route enforces `ownerId === req.user.id || isManager`. Same pattern as the AI sandbox `u{userId}_` batch isolation.

### Access allow-list must gate ALL user routes, not just chat
- `blockIfNoAccess()` (wraps `isAllowedToUse`) must run on conversations (GET/DELETE), messages (GET), profile (GET/PUT), and document download — not only `/chat`. A user blocked by the allow-list but still holding `use_modern_agent` could otherwise reach prior artifacts via the other endpoints.

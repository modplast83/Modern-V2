---
name: mpbf-replit-factory-agent
description: specialized guidance for replit agent when modifying the mpbf modern-v2 factory management app. use when working on the react/vite client, express/typescript server, drizzle/postgresql schema, production orders, rolls, machines, warehouse, maintenance, quality, hr, permissions, reports, whatsapp integrations, object storage, public quote/order pages, or any safe-change review for this codebase.
---

# MPBF Replit Factory Agent

## First response behavior
- Treat this repository as a live factory-management system, not a demo app.
- Before changing code, identify which business area is affected: orders, production, rolls, warehouse, maintenance, quality, hr, permissions, reports, notifications, public quote/order view, or system settings.
- Prefer small, reversible changes. Avoid broad rewrites unless the user explicitly asks for a redesign.
- Explain assumptions in Arabic when communicating with AbuKhalid.

## Codebase facts
- Runtime is Node/TypeScript with `npm run dev` launching `server/index.ts` through `tsx`.
- Production build runs `vite build` then bundles `server/index.ts` with esbuild into `dist`.
- Frontend is React 18 + Vite with Wouter routing under `client/src`.
- Backend is Express under `server`.
- Database is PostgreSQL through Drizzle ORM. The main schema file is `shared/schema.ts`; migrations output to `migrations`.
- Shared validation and domain utilities live under `shared`.
- The app uses Arabic/English UI patterns; Arabic labels and RTL behavior matter.
- Important integrations include Replit Auth/session auth, OpenAI, Meta/Taqnyat/Twilio notifications, Adobe PDF services, object storage, Excel/PDF/QR/barcode generation, PWA/service worker, and monitoring middleware.

## Core app modules
Use these route/module concepts when adding or reviewing features:
- `/orders`: customer orders, production-order tabs, roll search, production reports redirects.
- `/production-dashboard`: unified operator dashboard replacing old film/printing/cutting operator routes.
- `/production-monitoring`: production monitoring.
- `/production-queues`: production queues.
- `/warehouse`: warehouse and inventory operations.
- `/maintenance`: maintenance requests, actions, reports, negligence, spare and consumable parts.
- `/quality`: quality issues, inspections, reports, and settings.
- `/hr`: attendance, leave, training, performance, employee-related records.
- `/definitions`: master data such as customers, items, machines, sections, categories, master batch.
- `/reports`: reporting modules.
- `/settings`: system settings, monitoring, MCP settings, roles/permissions as applicable.
- `/modern-agent`, `/tools`, `/admin-tools`: internal tooling.
- Public routes: `/mpbf` for bag quote/configuration and `/view/order/:id` for QR-based order viewing.
- Display/factory visualization routes: `/display-control`, `/display-screen`, `/factory-simulation`, `/factory-floor`.

## Manufacturing invariants that must not be broken
Maintain these rules when changing schema, APIs, storage, or UI:
1. Order production quantity: sum of production-order quantities must not exceed order total quantity plus allowed tolerance.
2. Production roll quantity: sum of roll weights must not exceed the production order final quantity plus tolerance.
3. Inventory must never go negative. Validate stock movement before commit.
4. Valid state transitions:
   - Orders: `waiting -> in_production -> completed/cancelled`.
   - Production orders: `pending -> active -> completed/cancelled`.
   - Rolls: `film -> printing -> cutting -> done`.
   - Machines: `active <-> maintenance <-> down`.
5. Rolls and production operations require a valid active machine.
6. Preserve foreign-key integrity and do not orphan child records.
7. Preserve temporal consistency: delivery dates, production timestamps, and roll stage dates must remain logical.
8. Waste values must be positive when recorded; quality scores must stay in valid ranges; waste must not exceed related production quantities.
9. Multi-table operations that affect stock, production, or roll state must use transactions or an existing safe storage method.
10. Errors shown to operators should be clear and Arabic-friendly.

## Permission and access rules
- Check `shared/permissions.ts` before adding new routes, buttons, destructive actions, or navigation entries.
- Do not expose protected operational pages without `ProtectedRoute` on the client and an auth/permission check on the API side where applicable.
- When adding a module to navigation, update `client/src/config/navigationConfig.ts` and ensure route access aligns with `roleUtils` and permission keys.
- Do not treat UI hiding as sufficient security; server routes must still validate authorization for sensitive operations.

## Frontend conventions
- Use existing React, Wouter, TanStack Query, Radix/shadcn-style components, Tailwind, and project layout conventions.
- Preserve lazy-loaded route style in `client/src/App.tsx` for page-level modules.
- Keep factory-floor screens simple: big actions, clear status, minimal text entry, Arabic labels where operators interact directly.
- Respect RTL through existing language/context utilities.
- For forms, use existing validation patterns and shared insert schemas where available.
- For data mutations, invalidate/refetch relevant queries rather than forcing full-page reloads unless current code already does so.

## Backend and database conventions
- Use Drizzle schema types and Zod insert schemas from `shared/schema.ts` when adding or validating records.
- Avoid editing `shared/schema.ts` casually. If schema changes are required, explain:
  - affected table(s),
  - migration/push impact,
  - existing data risk,
  - rollback concern.
- Keep request-body limits aligned with `server/index.ts`: standard endpoints should remain small; only documented upload/import/webhook routes should use heavier limits.
- Preserve raw-body capture for webhook routes that need signature verification.
- Avoid logging secrets, tokens, full webhook bodies, passwords, or large payloads.

## Safe-change checklist before finishing
Always perform or recommend the relevant checks:
1. `npm run check` for TypeScript.
2. `npm run lint` if code style or imports changed.
3. `npm run build` before deployment-sensitive changes.
4. Test at least one happy path and one validation/error path for the affected module.
5. For DB changes, verify `DATABASE_URL` is present before any Drizzle push and avoid destructive schema changes unless explicitly approved.

## Response format to AbuKhalid after a change
Respond in Arabic/Saudi tone with:
- **وش تغير:** concise list of changed behavior/files.
- **ليش:** business reason.
- **المخاطر:** any risk, especially database, permissions, or production flow risk.
- **اختبار سريع:** exact screens/API paths to test.
- **ملاحظة مهمة:** any assumption or missing confirmation.

## Hard stops
Do not proceed silently if a requested change would:
- delete or reset production data,
- bypass authentication or permissions,
- allow negative inventory,
- create rolls without active machine validation,
- change webhook signature verification,
- remove Arabic/RTL support from operator-facing screens,
- expose secrets or environment values in frontend code.

Ask for explicit confirmation before doing any of the above.

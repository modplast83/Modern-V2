# Phase 1 — Unprotected endpoints audit

The earlier scan flagged ~40 endpoints as "unprotected". After re-checking each
one with multi-line context, only the following routes truly have no
`requireAuth` / `requirePermission` / `requireAdmin` middleware. All of them
are intentional and have their own access controls. No code changes are
required in Phase 1.

| Line  | Method | Path                                   | Why public is OK                                    |
| ----- | ------ | -------------------------------------- | --------------------------------------------------- |
| 335   | POST   | /api/login                             | Login endpoint — credentials checked inside.        |
| 474   | GET    | /api/me                                | Returns 401 itself when no session.                 |
| 567   | POST   | /api/logout                            | Idempotent; safe without auth.                      |
| 2812  | GET    | /api/health                            | Liveness probe.                                     |
| 3874  | GET    | /api (catch-all 404)                   | Returns 404 only.                                   |
| 6962  | GET    | /api/setup/status                      | Bootstrap check used before any user exists.        |
| 6974  | POST   | /api/setup/initialize                  | First-run setup; guarded by `setup_completed` flag. |
| 7191  | GET    | /api/company/logo                      | Public branding asset.                              |
| 11939 | GET    | /api/factory-3d/snapshots/share/:token | Token-based share link.                             |
| 12359 | POST   | /api/mobile/login                      | Mobile login — credentials checked inside.          |
| 12460 | POST   | /api/mobile/refresh-token              | Refresh-token rotation; token validated inside.     |
| 12850 | GET    | /api/mobile/status                     | Mobile liveness probe.                              |

The destructive admin endpoints (`/api/database/cleanup`, `/api/database/restore`,
`/api/database/import/*`, `/api/database/backup/download/*`) ARE protected by
`requireAdmin` — earlier reports were false positives caused by single-line
grep against the multi-line `app.post(\n  "/path",\n  requireAdmin,` style.

Action for Phase 2: add a smoke-test script that asserts every `app.<verb>(...)`
in `routes.ts` either includes `requireAuth` / `requirePermission` /
`requireAdmin` or is on this allow-list.

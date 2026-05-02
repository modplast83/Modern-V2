# Threat Model

## Project Overview

MPBF is a full-stack factory-management application for a plastics manufacturing business. It uses a React 18 + Vite frontend and a Node.js/Express TypeScript backend with PostgreSQL via Drizzle ORM. The system manages users, roles, customers, quotes, orders, production orders, rolls, warehouse/inventory, HR, AI assistant workflows, document/PDF generation, object storage, and external messaging integrations.

Production users include administrators, managers, sales representatives, production staff, warehouse users, HR users, and mobile clients. The application relies on server-side sessions plus mobile bearer tokens. The production assumption for this threat model is that only production-reachable code matters; mock sandboxes and purely local developer tooling are out of scope unless a production route exposes them.

## Assets

- **User accounts, sessions, and mobile tokens** — session cookies, bearer tokens, role assignments, and permission sets control access to all operational data.
- **Business records** — customers, quotes, quote PDFs, orders, production orders, rolls, warehouse data, maintenance records, HR records, and reports are business-sensitive and often contain operational or personal data.
- **Pricing and commercial data** — quotes, line items, taxes, totals, customer tax numbers, contact details, and internal notes directly affect revenue and customer confidentiality.
- **System configuration and AI instructions** — system settings, AI agent settings, knowledge-base content, and feature instructions influence global system behavior and can alter how privileged automation behaves.
- **Application secrets and third-party credentials** — database credentials, OpenAI/API keys, webhook secrets, messaging credentials, and object-storage access must remain server-only.
- **Generated documents and uploaded objects** — PDFs, spreadsheets, transcriptions, and stored files may contain sensitive operational or personal information.

## Trust Boundaries

- **Browser/mobile client to Express API** — all client input is untrusted and every protected route must authenticate and authorize server-side.
- **Authenticated user to privileged user boundary** — the RBAC model distinguishes ordinary users from users with permissions such as `manage_orders`, `manage_settings`, `manage_ai_agent`, `manage_hr`, and others. Backend routes must enforce those distinctions even if the frontend hides pages.
- **Public to authenticated boundary** — a small number of routes are intentionally public (for example bootstrap/setup or selected sharing/webhook flows), but documents and operational records must not cross into the public surface without an explicit access token or equivalent server-side check.
- **Express API to PostgreSQL** — the backend has broad database access; any injection or permission bypass at the route or AI-tool layer can expose or modify core business data.
- **Express API to external services** — the server talks to OpenAI, messaging providers, OAuth/MCP components, and object storage; outbound calls and secrets handling must be constrained.
- **Application to object/document storage** — generated PDFs and documents are sensitive outputs and must not become publicly retrievable solely by predictable identifiers.

## Scan Anchors

- **Primary production entry points:** `server/index.ts`, `server/routes.ts`, `server/ai-agent-routes.ts`, `server/mcp-routes.ts`, `server/mcp-oauth.ts`
- **Authentication and authorization:** `server/middleware/auth.ts`, `server/middleware/session-auth.ts`, `server/replitAuth.ts`, `shared/permissions.ts`
- **High-risk code areas:** AI agent tool execution and document generation, quote/PDF handling, authenticated business-data routes, webhook/public endpoints, object-storage access
- **Public surfaces to re-check on future scans:** setup/bootstrap endpoints, share/download links, webhook endpoints, unauthenticated quote/document routes
- **Usually dev-only / lower-priority unless proven production-reachable:** `.agents/`, mockup/sandbox artifacts, local-only helper scripts

## Threat Categories

### Spoofing

The application supports both session-based browser auth and bearer-token mobile auth. Production security depends on every protected route resolving `req.user` from these mechanisms and refusing access when that identity is absent or inactive. Webhook-style public callbacks must authenticate the calling service with signatures or equivalent secrets rather than trusting source IPs or request shape.

### Tampering

This system stores high-value operational data: orders, production records, inventory, HR events, and AI configuration. Server-side authorization must ensure that only users with the relevant permission can create, update, or delete these records. Global configuration and AI behavior inputs are especially sensitive because a low-privilege user could otherwise modify workflows used by higher-privilege users.

### Information Disclosure

The backend exposes commercial and personal data including customer names, phone numbers, tax numbers, pricing, notes, internal production state, and employee-related records. API responses and generated documents must be scoped to the requesting user’s role and permission set. Public links must use strong, unguessable access tokens or require authentication; sequential IDs, document numbers, and static filenames are not sufficient protections.

### Denial of Service

Several routes perform document generation, AI calls, database queries, and file processing. Production safety requires request-size limits, bounded query behavior, rate limits on public or authentication-adjacent endpoints, and timeouts on external requests so a low-cost request cannot trigger expensive backend work repeatedly.

### Elevation of Privilege

This codebase has a rich RBAC model in `shared/permissions.ts`, so the dominant risk is broken server-side enforcement rather than missing permission concepts. Any route protected only by `requireAuth` that exposes data or actions intended for `manage_*`, `view_*`, or `use_*` roles can become a privilege-escalation path. The AI agent is a particularly sensitive boundary because tool execution can bypass normal route-level checks and effectively turn prompt input into privileged database reads or writes unless each tool is separately authorized.

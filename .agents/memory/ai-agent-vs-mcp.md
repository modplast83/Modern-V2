---
name: AI agent vs MCP separation
description: The "الوكيل الذكي" in-app AI agent and the MCP system are independent; removing/replacing one must not touch the other.
---

# AI agent and MCP are separate systems

The old in-app AI agent ("الوكيل الذكي") and the MCP integration system are **independent** despite both sounding "AI-related".

The old AI agent was fully removed: its pages, settings UI, backend routes, the permissions `view_ai_agent` / `use_ai_agent` / `manage_ai_agent` / `view_ai_agent_settings`, i18n blocks, and its DB tables (`ai_agent_*`, `ai_sandbox_*`). MCP was deliberately kept intact (`server/mcp-routes.ts`, `server/mcp-oauth.ts`, `view_mcp_settings`, the `mcp` settings tab).

**Why:** Conflating them risks breaking MCP while working on the agent (or vice versa).

**How to apply:**
- When removing/replacing the AI agent, never touch mcp-routes / mcp-oauth / `view_mcp_settings` / the `mcp` settings tab.
- The mobile capabilities feature list in `server/routes.ts` intentionally retains the `"ai_agent"` string (mobile API contract) — leave it during agent cleanup.
- `migrations/` snapshots (schema.ts/relations.ts) are historical and were NOT regenerated when `ai_agent_*` tables were dropped; don't hand-edit them to chase removed tables.
- Before destructive removal of feature tables, export them to `backups/` first (irreversible drops).

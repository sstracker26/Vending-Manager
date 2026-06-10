# VendingPro

A full-stack vending machine management system for a Bulgarian company. Two panels: Operator (public) and Admin (password-protected). Features: clients, machines, products, stock management, machine loads (sales tracking), schedules, expenses, reports, QR codes, change logs, dashboard stats.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + Radix UI + Recharts + Wouter

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schema (source of truth for DB)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — Generated React Query hooks (auto-generated, do not edit)
- `lib/api-zod/` — Generated Zod validation schemas (auto-generated, do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/vending-app/src/pages/` — React pages (admin/ and operator/)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas
- Session-based auth (express-session): master password, moderator password, per-admin bcrypt passwords
- All numeric DB columns (prices, quantities) stored as `numeric`/string — parse with `parseFloat()` in routes
- Stock is computed live from `stock_movements` table (in/out) — no separate stock counter column
- Machine loads create automatic stock outgoing movements
- Date format: DD.MM.YYYY, timezone: Europe/Sofia (GMT+2), currency: BGN (лв)

## Product

- **Operator Panel** (public): Record machine loads (restock events), view weekly schedule
- **Admin Panel** (password-protected): Full CRUD for clients, machines, products, operators; stock management; sales reports; expenses; change logs; dashboard with charts

## User preferences

- Bulgarian UI labels and sample data
- Currency: BGN (лв)
- Date format: DD.MM.YYYY

## Admin Credentials

- Master password: `MASTER_SECRET_2024` (env `MASTER_PASSWORD`)
- Moderator password: `mod2024` (env `MODERATOR_PASSWORD`)

## Gotchas

- After changing DB schema: run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- After changing OpenAPI spec: run `pnpm --filter @workspace/api-spec run codegen`
- `pnpm run typecheck:libs` must be run before leaf artifact typechecks when lib schemas change
- Do NOT run `pnpm dev` at workspace root — start services via workflows

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

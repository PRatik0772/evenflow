# EventFlow

A web-based event management platform for independent organisers in Australia — create events, sell tickets, and scan QR codes at the door.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/web run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — secret for express-session

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Wouter + TanStack Query v5 + shadcn/ui + Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: express-session + connect-pg-simple + passport-local + bcrypt (cost 12)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/users.ts` — users table (Drizzle schema)
- `lib/db/src/schema/password-reset-tokens.ts` — password reset token table
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/app.ts` — Express app with session + passport setup
- `artifacts/api-server/src/lib/passport.ts` — passport-local strategy, serialize/deserialize
- `artifacts/api-server/src/lib/email.ts` — email service (Resend REST API; logs to console if RESEND_API_KEY not set)
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth` + `requireRole(...roles)`
- `artifacts/api-server/src/routes/auth.ts` — `/api/auth/register|login|logout|me|forgot-password|reset-password`
- `artifacts/api-server/src/routes/checkout.ts` — checkout, confirm-session, wallet pass, check-in
- `artifacts/api-server/src/routes/events.ts` — events CRUD, tiers, orders, staff, clone, cancel
- `artifacts/web/src/` — React frontend

## Architecture decisions

- Sessions stored in Postgres via `connect-pg-simple` (table: `user_sessions`, auto-created)
- Passport `serializeUser` stores user UUID in session; `deserializeUser` fetches from DB on each request
- bcrypt cost factor 12 for password hashing
- Emails normalised to lowercase on register and login
- `requireRole(...roles)` accepts variadic roles so one middleware call can allow e.g. both organiser and admin
- Account locking: 5 failed login attempts → lock for 15 min (`failedLoginAttempts`, `lockedUntil` on users table)
- Password reset tokens stored in `password_reset_tokens` table; expire after 60 min; single-use (usedAt tracked)
- Email: `artifacts/api-server/src/lib/email.ts` uses Resend REST API when `RESEND_API_KEY` is set; falls back to console.log in dev
- Transactional emails sent: order confirmation (free checkout + Stripe confirm-session), event cancellation, password reset
- `POST /checkout` has NO `requireAuth` — guest checkout is intentional

## Product

Three user roles: **organiser** (creates/manages events), **attendee** (buys tickets), **staff** (scans QR at door). Default role on registration is attendee. Organisers are redirected to `/dashboard` after login; all other roles go to `/`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `bcrypt` is a native module — already externalised in `artifacts/api-server/build.mjs`; do not bundle it
- After every OpenAPI spec change, re-run codegen before using updated types
- Session cookie is `secure: true` in production only (mTLS proxy handles HTTPS in dev)
- `drizzle-kit push` requires a TTY; use `psql "$DATABASE_URL" -c "CREATE TABLE ..."` to create tables in the Replit shell
- `users` table has no `updatedAt` column — do not add it to `.set({})` in Drizzle updates
- To enable real emails in production: set `RESEND_API_KEY` secret and optionally `EMAIL_FROM`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

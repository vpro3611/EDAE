# Deployment Readiness Design

**Goal:** Prepare the project for deployment with Neon PostgreSQL, Aiven Valkey, a single Render backend web service, and a Vercel frontend using direct cross-origin API calls.

**Current state summary**

The repository contains a TypeScript/Express backend in the root project and a Vue/Vite frontend in `frontend/`. The backend already assumes Redis-backed rate limiting, BullMQ repeatable workers, SMTP, Google OAuth, and Puppeteer-based PDF generation. The frontend currently uses relative API paths and assumes a same-origin deployment model.

**Chosen production architecture**

- Database: Neon PostgreSQL via `DATABASE_URL`
- Cache/queues: Aiven for Valkey using the existing Redis-compatible client configuration
- Backend hosting: one Render web service
- Frontend hosting: one Vercel project
- Frontend/backend communication: direct browser calls from Vercel to Render
- Background processing: runs inside the single Render backend process exactly as this codebase does today

**Why this architecture**

This keeps the interview deployment lightweight and close to the current code. It avoids splitting the backend into separate API and worker services while preserving rate limiting, GitHub polling, scheduled report generation, and user purge jobs.

## Backend design

### CORS

The backend must explicitly enable CORS. The current code builds an `allowedOrigins` array but does not mount the `cors` middleware, so browser credentialed requests from Vercel would fail.

Production behavior:

- Allow the configured `FRONTEND_URL`
- Allow `http://localhost:3000`, `http://localhost:5173`, and `http://localhost:9000` for development
- Set `credentials: true`
- Reject unknown origins by returning `false` from the origin callback

### Cookie policy

Refresh-token cookies must be centralized in one shared helper to avoid drift across login, register confirm, Google login, refresh, and logout.

Environment-sensitive behavior:

- Development:
  - `httpOnly: true`
  - `secure: false`
  - `sameSite: 'lax'`
- Production:
  - `httpOnly: true`
  - `secure: true`
  - `sameSite: 'none'`

This is required because the frontend and backend will live on different default platform domains (`*.vercel.app` and `*.onrender.com`), making this a cross-site cookie scenario.

### Proxy awareness

The backend should trust the platform proxy so secure cookies and forwarded protocol behavior work correctly on Render. Express should be configured with `app.set('trust proxy', 1)`.

### Environment variables

Runtime variables must remain explicit and documented. The backend already validates core variables, but deploy documentation must clearly include:

- `DATABASE_URL`
- `NODE_ENV=production`
- `PORT`
- `APP_NAME`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `API_URL`
- `FRONTEND_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `GITHUB_POLL_INTERVAL_MS`
- `REPORT_WORKER_INTERVAL_MS`
- `USER_PURGE_CRON`

### Background work

No architectural split is needed. The backend should continue to:

- start the HTTP server
- bootstrap BullMQ workers
- run the user purge cron job

This matches the user's desire to keep everything under one Render web service and accept no-scaling constraints for an interview project.

## Frontend design

### API base URL

The frontend must stop assuming same-origin relative requests in production. It needs a configurable base URL so Vercel can call the Render backend directly.

Approach:

- Add a `VITE_API_BASE_URL` environment variable
- Configure Axios instances to use that base URL
- Keep `withCredentials: true`

Development may default to `http://localhost:3000` if the env var is absent, but production should require a real backend URL.

### Google OAuth

The frontend already reads `VITE_GOOGLE_CLIENT_ID`. Deployment docs should make clear that:

- the Vercel project needs `VITE_GOOGLE_CLIENT_ID`
- the Google OAuth client must include the Vercel frontend origin
- the backend Google credentials must match the same Google project

## Deployment documentation

The repository should include deploy-ready documentation for:

- Neon database setup and copying its connection string into `DATABASE_URL`
- Aiven Valkey host/port/password wiring into Redis env vars
- Render web service build/start commands
- Vercel frontend build configuration and env vars
- Required cross-origin auth notes for default platform domains

It should also explain that Puppeteer runs on the backend and may require Render-compatible install/build settings, but the existing Dockerfile already shows the required runtime packages.

## Validation plan

Before considering the project deploy-ready, verify:

- backend TypeScript build passes
- frontend TypeScript/Vite build passes
- auth controllers still set and clear cookies correctly
- CORS headers are present for the configured frontend origin
- frontend requests are routed to the configured API base URL
- docs reflect the real deployment process

## Scope boundaries

This work will not:

- split workers into a separate service
- replace cookie auth with token-only auth
- introduce custom domains
- redesign the product UX

## Implementation file targets

Expected backend changes:

- `src/app.ts`
- new shared cookie helper under `src/modules/authentification/` or similar
- auth controllers that currently set/clear refresh cookies

Expected frontend changes:

- `frontend/src/api/client.ts`
- optionally related frontend env documentation/config files

Expected docs/config changes:

- `README.md`
- `.env.example`
- possibly Vercel-specific config files if needed

## Risks and tradeoffs

- Cross-site cookies on default Vercel and Render domains are less robust than same-site or proxy-based deployments.
- Some browsers may treat third-party cookies more strictly over time.
- For an interview project, this is an acceptable tradeoff because it preserves the current backend design with minimal operational complexity.

# Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app deploy-ready for Neon PostgreSQL, Aiven Valkey, a single Render backend web service, and a Vercel frontend using direct cross-origin API calls.

**Architecture:** Centralize refresh-cookie policy in the backend, explicitly enable credentialed CORS for the configured frontend origin, and make the frontend use an environment-driven API base URL instead of same-origin relative requests. Update deploy docs and env examples so the production setup matches the code.

**Tech Stack:** TypeScript, Express, Jest, Supertest, Vue, Vite, Axios

---

### Task 1: Backend auth deployment safety

**Files:**
- Create: `src/modules/authentification/cookies.ts`
- Modify: `src/app.ts`
- Modify: `src/modules/authentification/controllers/controller.register_confirm.ts`
- Modify: `src/modules/authentification/controllers/controller.login_email.ts`
- Modify: `src/modules/authentification/controllers/controller.refresh.ts`
- Modify: `src/modules/authentification/controllers/controller.logout.ts`
- Modify: `src/modules/authentification/controllers/controller.google_login.ts`
- Test: `tests/modules/authentification/controllers/auth.controllers.e2e.test.ts`

- [ ] **Step 1: Write the failing tests for credentialed CORS and production cookies**

Add e2e assertions for:
- `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` on requests from `process.env.FRONTEND_URL`
- production auth cookies including `Secure` and `SameSite=None`
- dev cookies continuing to use `SameSite=Lax`

- [ ] **Step 2: Run the focused auth controller test file and verify it fails for the expected reasons**

Run: `node .\node_modules\jest\bin\jest.js tests\modules\authentification\controllers\auth.controllers.e2e.test.ts`

Expected: FAIL because CORS headers are absent and cookie attributes still use the old inline policy.

- [ ] **Step 3: Implement centralized cookie options and mount real CORS**

Create a shared helper for refresh-cookie options and use it in every auth controller that sets or clears the cookie. Update `src/app.ts` to:
- import and mount `cors`
- trust the Render proxy
- allow localhost dev origins plus `FRONTEND_URL`
- set `credentials: true`

- [ ] **Step 4: Re-run the focused auth controller test file and verify it passes**

Run: `node .\node_modules\jest\bin\jest.js tests\modules\authentification\controllers\auth.controllers.e2e.test.ts`

Expected: PASS

### Task 2: Frontend production API base URL

**Files:**
- Modify: `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.ts` via backend/frontend build verification

- [ ] **Step 1: Add a failing expectation to the plan checklist**

The current frontend assumes same-origin relative URLs. The target behavior is:
- production uses `VITE_API_BASE_URL`
- local development can fall back to `http://localhost:3000`
- both Axios clients keep `withCredentials: true`

- [ ] **Step 2: Run the frontend build to capture the current baseline**

Run: `npm.cmd run build`
Working directory: `D:\EDAE\frontend`

Expected: PASS or a non-code environment/tooling failure that we document while still implementing the API-base change.

- [ ] **Step 3: Implement base URL resolution in the Axios client**

Update `frontend/src/api/client.ts` to create both Axios instances with a shared `baseURL` derived from `import.meta.env.VITE_API_BASE_URL`, with a development fallback to `http://localhost:3000`.

- [ ] **Step 4: Re-run the frontend build**

Run: `npm.cmd run build`
Working directory: `D:\EDAE\frontend`

Expected: PASS

### Task 3: Deployment docs and environment examples

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update env examples for the chosen deployment**

Add or clarify the variables needed for:
- Neon `DATABASE_URL`
- Aiven Valkey `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Render `API_URL`, `FRONTEND_URL`
- Vercel `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`
- production cookie/CORS expectations

- [ ] **Step 2: Update README deployment guidance**

Document:
- backend on Render as one web service
- frontend on Vercel with direct API calls
- cross-origin cookie requirements on default platform domains
- Render/Vercel env var mapping

- [ ] **Step 3: Re-run backend and frontend builds after docs/config edits**

Run: `npm.cmd run build`
Working directory: `D:\EDAE`

Run: `npm.cmd run build`
Working directory: `D:\EDAE\frontend`

Expected: PASS

### Task 4: Final focused verification

**Files:**
- Verify only

- [ ] **Step 1: Run the focused auth controller tests**

Run: `node .\node_modules\jest\bin\jest.js tests\modules\authentification\controllers\auth.controllers.e2e.test.ts`

Expected: PASS

- [ ] **Step 2: Run the backend build**

Run: `npm.cmd run build`
Working directory: `D:\EDAE`

Expected: PASS

- [ ] **Step 3: Run the frontend build**

Run: `npm.cmd run build`
Working directory: `D:\EDAE\frontend`

Expected: PASS

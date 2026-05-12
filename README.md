# EDAE — Event-Driven Activity Engine

> Monitor GitHub repositories and receive real-time notifications on Telegram, Slack, or email — plus periodic PDF activity reports delivered straight to you.

---

##  Features

-  **Real-time GitHub notifications** — commits, releases, branches, tags, issues, pull requests, workflow runs, star/fork milestones
-  **Periodic PDF reports** — daily, weekly, or monthly GitHub activity summaries sent to your preferred channel
-  **Multiple delivery channels** — Telegram bot, Slack (webhook or bot), or email
-  **Secure credential storage** — connection credentials encrypted with AES-256-GCM at rest
-  **Google OAuth 2.0** — sign in or register with a Google account; existing users are automatically linked by email
-  **Full account management** — registration, email verification, password reset, email change, account deletion (all OTP-confirmed)
-  **Rate limiting** — built-in token-bucket rate limiting on all public endpoints to prevent abuse

---

##  Getting Started

### Option A — Docker (recommended)

The fastest way to run the full stack (backend, frontend, PostgreSQL, Redis).

**Prerequisites:** Docker ≥ 24 and Docker Compose v2.

```bash
git clone <repo-url>
cd EDAE

# Create your environment file from the template
cp .env.example .env.docker
# Edit .env.docker — fill in POSTGRES_PASSWORD, JWT secrets, SMTP creds, ENCRYPTION_KEY
```

```bash
docker compose up --build
```

That's it. Docker Compose will:
1. Start PostgreSQL and Redis with health checks.
2. Run database migrations (`migrate` service) before the backend starts.
3. Start the backend API on port `3000` (or `BACKEND_PORT`).
4. Build and serve the Vue frontend via nginx on port `80` (or `FRONTEND_PORT`).

**Useful commands:**

```bash
docker compose up -d            # start in background
docker compose logs -f backend  # stream backend logs
docker compose down             # stop all services
docker compose down -v          # stop and wipe volumes (destroys DB data)
```

### Option B — Local development

**Prerequisites:** Node.js ≥ 20, PostgreSQL ≥ 14, Redis ≥ 6.

```bash
git clone <repo-url>
cd EDAE
npm install
```

Copy the environment file and fill in your values:

```bash
cp .env.example .env
```

Run migrations and start the dev server:

```bash
npm run migrate
npm run dev
```

The backend starts on `PORT` (default `3000`) with hot-reload. Start the frontend separately:

```bash
cd frontend && npm install && npm run dev
```

The frontend Vite dev server runs on port `5173` and proxies `/pub` and `/protected` to the backend.

### Configuration reference

Variables marked **required** are validated at startup by `src/check_env_vars.ts` — the server will refuse to start if any are missing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `NODE_ENV` | ✅ | — | `development` or `production` |
| `PORT` | ✅ | — | HTTP server port |
| `APP_NAME` | ✅ | — | Displayed name in notification emails |
| `SMTP_HOST` | ✅ | — | SMTP server hostname |
| `SMTP_PORT` | ✅ | — | SMTP port (e.g. `587`) |
| `SMTP_USER` | ✅ | — | SMTP username / sender address |
| `SMTP_PASS` | ✅ | — | SMTP password or app password |
| `API_URL` | ✅ | — | Public base URL of the backend |
| `FRONTEND_URL` | ✅ | — | Frontend origin (used in CORS and email links) |
| `ACCESS_TOKEN_SECRET` | ✅ | — | Secret for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | ✅ | — | Secret for signing JWT refresh tokens |
| `ENCRYPTION_KEY` | ✅ | — | 32-byte AES-256 key as 64 hex chars |
| `GOOGLE_CLIENT_ID` | ✅ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ✅ | `postmessage` | OAuth redirect URI (`postmessage` for GIS popup flow) |
| `REDIS_HOST` | — | `localhost` | Redis hostname |
| `REDIS_PORT` | — | `6379` | Redis port |
| `REDIS_PASSWORD` | — | (none) | Redis password |
| `GITHUB_POLL_INTERVAL_MS` | — | `300000` | GitHub poll interval in ms |
| `TEST_DATABASE_URL` | — | — | Used by the test suite only, not at runtime |

> **Generating secrets:**
> ```bash
> openssl rand -base64 32   # for ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET
> openssl rand -hex 32      # for ENCRYPTION_KEY
> ```

---

##  Core Concepts

Understanding three domain objects is enough to use EDAE:

```
Connection
  "Where should I be notified?"
  e.g. a Telegram bot, a Slack channel, or an email address

GitHub Source
  "Which repository should I watch?"
  e.g. owner=facebook, repo=react

Subscription
  "When something happens on that repo, send me a message via that channel"
  Ties a GitHub Source + event type + Connection together

Report Config
  "Generate a PDF summary of all my watched repos and send it on a schedule"
```

---

##  Authentication

EDAE uses a short-lived JWT **access token** paired with a long-lived **refresh token**.

- The access token is returned in the response body — send it as `Authorization: Bearer <token>` on every protected request.
- The refresh token is set as an `httpOnly` cookie (`refreshToken`) — your HTTP client handles it automatically.

### Registration flow

```
POST /pub/auth/register          { email, password, name }
  → sends an OTP to your email

POST /pub/auth/register/confirm  { email, otp }
  → returns { accessToken, user }
```

### Login / session flow

```
POST /pub/auth/login    { email, password }
  → returns { accessToken, user }  +  sets refreshToken cookie

POST /pub/auth/refresh  (cookie sent automatically)
  → returns { accessToken }

POST /pub/auth/logout   (cookie sent automatically)
  → clears the refresh token
```

### Google OAuth flow

```
POST /pub/auth/google   { code }
  → returns { accessToken, user }  +  sets refreshToken cookie
```

The frontend initiates the Google Identity Services (GIS) popup via the `useCodeClient` composable from `vue3-google-signin`. When the user completes the Google sign-in screen, Google returns a one-time `code` to the JavaScript callback. The frontend then sends that code to `POST /pub/auth/google`.

The backend exchanges the code for a Google ID token, verifies it, and:

1. **Existing Google login** — user is found via `user_external_logins`; tokens are issued immediately.
2. **Email match** — a matching `users` row exists but has no Google login entry; the Google account is linked automatically.
3. **New user** — no matching record at all; a new account is created (pre-verified, no password) and linked.

In all cases the response is identical to a regular login: `{ accessToken, user }` with a `refreshToken` httpOnly cookie.

---

##  API Quick Reference

All protected routes require `Authorization: Bearer <accessToken>`.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pub/auth/register` | Start registration (sends OTP) |
| `POST` | `/pub/auth/register/confirm` | Confirm registration OTP → issues tokens |
| `POST` | `/pub/auth/login` | Email + password login → issues tokens |
| `POST` | `/pub/auth/google` | Google OAuth code exchange → issues tokens |
| `POST` | `/pub/auth/refresh` | Rotate refresh token → new access token |
| `POST` | `/pub/auth/logout` | Revoke refresh token |

### User

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/protected/user/me` | Get your own profile |
| `GET` | `/protected/user/:id` | Get another user's public profile |
| `PATCH` | `/protected/user/name` | Update display name |
| `PATCH` | `/protected/user/password` | Change password |
| `POST` | `/protected/user/email-change` | Request email change (sends OTP) |
| `POST` | `/protected/user/email-change/confirm` | Confirm email change with OTP |
| `POST` | `/protected/user/account-deletion` | Request account deletion (sends OTP) |
| `POST` | `/protected/user/account-deletion/confirm` | Permanently delete account |
| `POST` | `/pub/user/password-reset` | Request password reset (sends OTP) |
| `POST` | `/pub/user/password-reset/confirm` | Confirm password reset with OTP |

### Connections

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/protected/connections` | Create a new connection |
| `GET` | `/protected/connections` | List active connections |
| `GET` | `/protected/connections/deleted` | List soft-deleted connections |
| `PATCH` | `/protected/connections/:id` | Update connection name or credentials |
| `DELETE` | `/protected/connections/:id` | Soft-delete a connection |
| `POST` | `/protected/connections/:id/restore` | Restore a soft-deleted connection |

**Connection providers:**

```jsonc
// Telegram
{ "provider": "telegram", "bot_token": "...", "chat_id": "..." }

// Slack — incoming webhook
{ "provider": "slack", "webhook_url": "https://hooks.slack.com/..." }

// Slack — bot token
{ "provider": "slack", "bot_token": "xoxb-...", "channel_id": "C01234567" }

// Email
{ "provider": "email", "address": "you@example.com" }
```

### GitHub Sources

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/protected/github-sources` | Add a repository to watch |
| `GET` | `/protected/github-sources` | List your sources |
| `DELETE` | `/protected/github-sources/:id` | Remove a source |

```jsonc
// Create a source (access_token is optional — required for private repos)
{ "repo_owner": "facebook", "repo_name": "react", "access_token": null }
```

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/protected/subscriptions` | Subscribe to a GitHub event |
| `GET` | `/protected/subscriptions` | List your subscriptions |
| `DELETE` | `/protected/subscriptions/:id` | Remove a subscription |

**Available event types:**

| Event | What triggers it |
|-------|-----------------|
| `new_release` | A new release is published |
| `new_commit` | A new commit is pushed to the default branch |
| `new_branch` | A new branch is created |
| `new_tag` | A new tag is created |
| `issue_opened` | An issue is opened |
| `issue_closed` | An issue is closed |
| `pr_opened` | A pull request is opened |
| `pr_merged` | A pull request is merged |
| `workflow_completed` | A GitHub Actions workflow run completes |
| `star_milestone` | The repo reaches a star count threshold |
| `fork_milestone` | The repo reaches a fork count threshold |

**Message templates** use `{{ variable }}` placeholders. Available variables per event:

| Event | Variables |
|-------|-----------|
| `new_release` | `repo`, `tag_name`, `name`, `url` |
| `new_commit` | `repo`, `sha`, `message`, `author`, `url` |
| `new_branch` | `repo`, `branch` |
| `new_tag` | `repo`, `tag` |
| `issue_opened` / `issue_closed` | `repo`, `title`, `number`, `url` |
| `pr_opened` / `pr_merged` | `repo`, `title`, `number`, `url` |
| `workflow_completed` | `repo`, `workflow`, `conclusion`, `url` |
| `star_milestone` | `repo`, `stars`, `milestone` |
| `fork_milestone` | `repo`, `forks`, `milestone` |

**Config options** (passed via the `config` field):

| Event | Key | Description |
|-------|-----|-------------|
| `workflow_completed` | `workflow_id` | Notify only for a specific workflow ID |
| `star_milestone` | `milestone` | Star count threshold (default `100`) |
| `fork_milestone` | `milestone` | Fork count threshold (default `10`) |

**Example subscription:**

```jsonc
{
  "github_source_id": "<uuid>",
  "event_type": "new_release",
  "connection_id": "<uuid>",
  "message_template": "New release {{ tag_name }} on {{ repo }} — {{ url }}",
  "config": {}
}
```

### Reports

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/protected/report-configs` | Create a report schedule |
| `GET` | `/protected/report-configs` | List your report configs |
| `DELETE` | `/protected/report-configs/:id` | Delete a report config |
| `POST` | `/protected/reports/generate` | Trigger a report immediately |

```jsonc
// Create a weekly report sent every Monday
{
  "connection_id": "<uuid>",
  "frequency": "weekly",   // "daily" | "weekly" | "monthly"
  "schedule_day": 1        // 0=Sun … 6=Sat (only used for "weekly")
}

// Trigger on-demand
{ "config_id": "<uuid>" }
```

Reports are delivered as PDF attachments to the connection's channel. They cover commits, pull requests, releases, issues, and workflow runs across all your GitHub sources for the selected period.

---

##  Health Check

```bash
GET /pub/health
# → 200 { "message": "OK" }
```

---

##  Testing

```bash
npm test             # run all tests
npm run test:watch   # watch mode
npm run test:ci      # sequential (for CI pipelines)
npm run test:coverage
```

Tests require `TEST_DATABASE_URL` to be set. The suite includes unit tests, use-case tests with mocked dependencies, and end-to-end controller tests via `supertest` — no Docker required beyond a running PostgreSQL instance. Coverage threshold is enforced globally at **90%**.

---

##  License

See [LICENSE](./LICENSE).

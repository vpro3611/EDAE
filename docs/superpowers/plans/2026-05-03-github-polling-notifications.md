# GitHub Polling Notifications — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development.

**Goal:** Users watch GitHub repos for events and receive notifications to their Telegram/Slack/Email connections via 5-minute BullMQ polling. No domain required — all outbound.

**Architecture:** Two new modules (`github_source`, `subscription`) follow the existing Clean Architecture pattern exactly. A BullMQ repeatable job polls GitHub REST API, diffs against `last_seen` JSONB, renders a user-defined template, dispatches via existing connections.

**New deps:** `@octokit/rest`, `bullmq`

---

## Database

Two new tables (migrations follow existing format):

**`github_sources`**: `id`, `user_id → users`, `repo_owner`, `repo_name`, `access_token_encrypted` (nullable, AES via existing infra), `created_at`, `updated_at`

**`github_subscriptions`**: `id`, `github_source_id → github_sources CASCADE`, `event_type` (varchar), `connection_id → connections CASCADE`, `message_template` (text), `config` (jsonb default `{}`), `last_seen` (jsonb default `{}`), `is_active` (bool), `created_at`

---

## Supported Event Types

`new_release`, `new_commit`, `new_branch`, `new_tag`, `issue_opened`, `issue_closed`, `pr_opened`, `pr_merged`, `workflow_completed`, `star_milestone`, `fork_milestone`

Each stores its own `last_seen` shape (e.g. `{ latest_release_id }`, `{ sha }`, `{ branches: [] }`). First poll = baseline only, no notification sent.

**Template vars per event** (e.g. `new_release` → `{{ repo }}`, `{{ tag_name }}`, `{{ url }}`). Rendered with simple regex replace: `/\{\{\s*(\w+)\s*\}\}/g`.

---

## Modules

**`github_source`** — CRUD (create, list, hard-delete). Follows `connection` module pattern exactly: entity → validator → interfaces → reader/writer repos → usecases → tx_services → dto/mapper → controllers.

**`subscription`** — Same pattern + one extra usecase: `UpdateLastSeenUseCase`. Reader needs `getActiveSubscriptions()` returning a JOIN with `github_sources` (includes decrypted token, repo coords).

**`notification`** — Two files: `notification.template.ts` (pure `renderTemplate(tpl, vars)`) and `notification.dispatcher.ts` (sends to Telegram via `fetch`, Slack via `fetch`, Email via existing `InfraEmailNodemailerImplementation`).

---

## Worker

**`src/workers/github.poller.ts`** — `GithubPollerService` with one method per event type. Each method: takes `(octokit, owner, repo, lastSeen, config)` → returns `{ initialized, newLastSeen, events: TemplateVars[] }`.

**`src/workers/github.poll.worker.ts`** — Processes one `SubscriptionWithSource`: decrypt token → Octokit → poll → if events: fetch connection → decrypt credentials → render template → dispatch → update `last_seen`.

**`src/workers/worker.bootstrap.ts`** — One BullMQ `Queue('github-poll')`, one repeatable job every 5 min, one `Worker` that fetches all active subscriptions and calls the poll worker for each.

**`src/server.ts`** — Call `bootstrapWorkers()` after `startServer()`.

---

## Routes

```
POST   /protected/github-sources           create
GET    /protected/github-sources           list
DELETE /protected/github-sources/:id       delete

POST   /protected/subscriptions            create
GET    /protected/subscriptions            list (by source or all)
DELETE /protected/subscriptions/:id        delete
```

---

## Frontend

Add **Automations** tab to `DashboardView`. Two sections: **Sources** (add/remove GitHub repos + token) and **Subscriptions** (pick source → event type → connection → write template). New files: `frontend/src/api/github.ts`, `frontend/src/components/AutomationsTab.vue`.

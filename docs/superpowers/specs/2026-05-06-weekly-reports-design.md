# Design Spec: Weekly Reports Feature (PDF)

## Overview
Implement a "Weekly Reports" feature that aggregates activity (commits, PRs) from a user's subscribed GitHub repositories and sends a generated PDF report to their chosen service (Telegram, Slack, or Email).

## Goals
- Allow users to configure report frequency (daily, weekly, monthly).
- Generate a professional PDF report using Puppeteer.
- Deliver reports via existing notification channels, upgrading Slack to support file uploads.
- Support both automated (scheduled) and manual (on-demand) report generation.

## Architecture

### 1. Report Module (`src/modules/report`)
A new module to manage report configurations and orchestration.

**Entity: `ReportConfiguration`**
- `id`: UUID
- `user_id`: UUID (Relation to User)
- `connection_id`: UUID (Relation to Connection)
- `frequency`: `'daily' | 'weekly' | 'monthly'`
- `schedule_day`: `0-6` (0 = Sunday)
- `is_active`: Boolean
- `last_sent_at`: DateTime
- `created_at`, `updated_at`: DateTime

**Services:**
- `ReportService`: Orchestrates data fetching, PDF generation, and dispatching.
- `PdfService`: Uses Puppeteer to render HTML templates into PDF buffers.

### 2. PDF Generation (`PdfService`)
- **Engine**: Puppeteer (Headless Chrome).
- **Templating**: Handlebars to inject GitHub data into HTML/CSS.
- **Content**:
    - Aggregated stats (total commits, total PRs).
    - Repository breakdowns (list of commit messages, PR titles).
    - Curated summaries (structured text summarizing the week's focus).

### 3. Worker & Scheduling
- **Worker**: `src/workers/report.worker.ts`.
- **Logic**: Periodically (every hour) queries active `ReportConfiguration` records that are due for a report based on `frequency` and `last_sent_at`.
- **Manual Trigger**: REST API endpoint `POST /reports/generate` for immediate generation.

### 4. Notification Upgrades
Enhance `NotificationDispatcher` and `InfraEmailSenderInterface` to support file attachments.

**Telegram**:
- Use `sendDocument` API.

**Slack**:
- Transition from Incoming Webhooks to **Slack Bot Tokens** (`xoxb-...`).
- Use `files.uploadV2` API.
- Update `SlackCredentials` to include `bot_token` and `channel_id`.

**Email**:
- Update `sendNotification` to accept an optional attachment buffer.

## Data Flow
1. **Trigger**: `ReportWorker` (scheduled) or `Controller` (manual).
2. **Fetch Data**: `ReportService` calls GitHub API (`octokit.repos.listCommits`, `octokit.pulls.list`) for each user's source.
3. **Generate HTML**: Data is passed to a Handlebars template.
4. **Generate PDF**: Puppeteer renders HTML -> PDF Buffer.
5. **Dispatch**: `NotificationDispatcher` sends the buffer to the user's preferred connection.
6. **Update State**: Update `last_sent_at` in `ReportConfiguration`.

## Implementation Phases
1. **Phase 1: Foundations**: Create `ReportConfiguration` entity and migrations. Update Connection credentials.
2. **Phase 2: PDF Service**: Implement `PdfService` with Puppeteer and basic Handlebars template.
3. **Phase 3: Data Retrieval**: Implement GitHub activity fetching logic.
4. **Phase 4: Notifications**: Upgrade Telegram, Slack, and Email dispatchers for file support.
5. **Phase 5: Automation**: Implement `ReportWorker` and API endpoint.

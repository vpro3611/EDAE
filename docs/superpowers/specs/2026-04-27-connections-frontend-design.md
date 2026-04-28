---
title: Connections Frontend — Design Spec
date: 2026-04-27
status: approved
---

# Connections Frontend

## Goal

Add a Connections tab to the existing `DashboardView` that exposes the full connections API: create, list active, list deleted, update, soft-delete, and restore.

## Files

### New

| File | Purpose |
|------|---------|
| `frontend/src/api/connections.ts` | HTTP calls for all six connection endpoints, following the `user.ts` pattern (`privateApi` + `call()`) |
| `frontend/src/components/ConnectionsTab.vue` | All connections UI and state |

### Modified

| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Add `ConnectionDto`, `TelegramCredentials`, `SlackCredentials`, `EmailCredentials`, `ConnectionCredentials` |
| `frontend/src/views/DashboardView.vue` | Add `'connections'` to `Tab` union, add tab entry with icon, mount `<ConnectionsTab>` |

## API Layer (`connections.ts`)

Six functions, all using `call(async () => { ... })`:

- `listActive(): Promise<ConnectionDto[]>` — `GET /protected/connections`
- `listDeleted(): Promise<ConnectionDto[]>` — `GET /protected/connections/deleted`
- `createConnection(name, credentials): Promise<ConnectionDto>` — `POST /protected/connections`
- `updateConnection(id, payload): Promise<ConnectionDto>` — `PATCH /protected/connections/:id`
- `softDelete(id): Promise<void>` — `DELETE /protected/connections/:id`
- `restore(id): Promise<ConnectionDto>` — `POST /protected/connections/:id/restore`

## Types

```ts
export type TelegramCredentials = { provider: 'telegram'; bot_token: string; chat_id: string }
export type SlackCredentials    = { provider: 'slack'; webhook_url: string }
export type EmailCredentials    = { provider: 'email'; address: string }
export type ConnectionCredentials = TelegramCredentials | SlackCredentials | EmailCredentials

export interface ConnectionDto {
  id: string
  user_id: string
  provider: string
  name: string
  credentials: ConnectionCredentials
  created_at: string
  updated_at: string
  is_deleted: boolean
}
```

## ConnectionsTab Component

### State

| Ref | Type | Purpose |
|-----|------|---------|
| `connections` | `ConnectionDto[]` | Active connections, loaded on mount |
| `deletedConnections` | `ConnectionDto[]` | Soft-deleted, loaded lazily |
| `showDeleted` | `boolean` | Toggle deleted section visibility |
| `deletedLoaded` | `boolean` | Guard to avoid re-fetching |
| `showCreateForm` | `boolean` | Toggle create form visibility |
| `editingId` | `string \| null` | ID of connection being edited inline |
| `createLoading` | `boolean` | |
| `createError` | `string` | |
| `editLoading` | `boolean` | |
| `editError` | `string` | |
| `actionError` | `string` | Delete / restore errors |

### Create Form

- Name field (text, required)
- Provider selector: `telegram` / `slack` / `email`
- Credential fields rendered conditionally:
  - **Telegram**: `bot_token` (text) + `chat_id` (text)
  - **Slack**: `webhook_url` (url input)
  - **Email**: `address` (email input)
- On submit: call `createConnection`, prepend result to `connections`, reset form, hide form

### Active Connections List

- Shown when `connections.length > 0`, otherwise an empty state message
- Each row: name, provider badge, formatted `created_at`
- Per-row actions:
  - **Edit** — sets `editingId`, expands inline edit form below the row
  - **Delete** — calls `softDelete`, removes connection from `connections` list
- Inline edit form: same provider-aware fields, pre-filled from current connection. Sends only `name` and `credentials` if they changed. On save: replaces entry in `connections`, clears `editingId`.

### Deleted Connections Section

- Hidden by default; toggled with "Show deleted" / "Hide deleted" button
- Loads `listDeleted()` on first open (`deletedLoaded` guard)
- Each row: name, provider, formatted `updated_at` (deletion timestamp)
- **Restore** button: calls `restore`, moves connection back to `connections`, removes from `deletedConnections`

## Visual Style

Reuses existing dashboard CSS classes: `settings-block`, `block-header`, `block-title`, `block-desc`, `inline-form`, `float-field`, `btn-ghost`, `btn-primary-sm`, `inline-error`, `inline-success`, `btn-loading`. Provider badges use inline scoped styles matching the existing `card-badge` pattern.

## DashboardView Changes

- `Tab` union: add `'connections'`
- `tabs` array: add `{ id: 'connections', label: 'Connections', icon: ConnectionsIcon }`
- Template: add `<ConnectionsTab v-else-if="currentTab === 'connections'" />` after the security section
- Import `ConnectionsTab` component

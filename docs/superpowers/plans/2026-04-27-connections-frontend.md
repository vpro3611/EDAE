# Connections Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Connections tab to the existing dashboard that lets users create, view, edit, soft-delete, and restore notification connections (Telegram, Slack, Email).

**Architecture:** New `ConnectionsTab.vue` component holds all connections state and UI; a new `api/connections.ts` mirrors the existing `user.ts` pattern. `DashboardView.vue` mounts the component and gains one new tab entry. No new routes.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, Axios via existing `privateApi`/`call()` wrappers, Vite.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/types/index.ts` | Add `ConnectionDto` and credential union types |
| Create | `frontend/src/api/connections.ts` | HTTP calls for all 6 connection endpoints |
| Create | `frontend/src/components/ConnectionsTab.vue` | All connections UI: list, create, edit, delete, restore |
| Modify | `frontend/src/views/DashboardView.vue` | Add `'connections'` tab entry + mount `<ConnectionsTab>` |

---

### Task 1: Add connection types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Append types to `frontend/src/types/index.ts`**

Add at the bottom of the file:

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

- [ ] **Step 2: Verify type-check passes**

```bash
cd frontend && npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(connection): add ConnectionDto and credential types"
```

---

### Task 2: Create API layer

**Files:**
- Create: `frontend/src/api/connections.ts`

- [ ] **Step 1: Create `frontend/src/api/connections.ts`**

```ts
import { privateApi, call } from './client'
import type { ConnectionDto, ConnectionCredentials } from '../types'

export async function listActive(): Promise<ConnectionDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ connections: ConnectionDto[] }>('/protected/connections')
    return data.connections
  })
}

export async function listDeleted(): Promise<ConnectionDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ connections: ConnectionDto[] }>('/protected/connections/deleted')
    return data.connections
  })
}

export async function createConnection(name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ connection: ConnectionDto }>('/protected/connections', { name, credentials })
    return data.connection
  })
}

export async function updateConnection(
  id: string,
  payload: { name?: string; credentials?: ConnectionCredentials },
): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.patch<{ connection: ConnectionDto }>(`/protected/connections/${id}`, payload)
    return data.connection
  })
}

export async function softDelete(id: string): Promise<void> {
  return call(async () => {
    await privateApi.delete(`/protected/connections/${id}`)
  })
}

export async function restore(id: string): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ connection: ConnectionDto }>(`/protected/connections/${id}/restore`)
    return data.connection
  })
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd frontend && npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/connections.ts
git commit -m "feat(connection): add connections API layer"
```

---

### Task 3: Create ConnectionsTab component

**Files:**
- Create: `frontend/src/components/ConnectionsTab.vue`

- [ ] **Step 1: Create `frontend/src/components/ConnectionsTab.vue`**

```vue
<template>
  <div>
    <div class="section-header">
      <h2 class="section-title">Connections</h2>
      <p class="section-sub">Manage your notification integrations.</p>
    </div>

    <!-- ── Create block ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">New connection</div>
          <div class="block-desc">Connect Telegram, Slack, or Email notifications.</div>
        </div>
        <button class="btn-ghost" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Cancel' : 'Add' }}
        </button>
      </div>

      <form v-if="showCreateForm" @submit.prevent="handleCreate" class="inline-form">
        <div class="float-field" :class="{ active: createNameFocused || createName }">
          <input
            id="createName"
            v-model="createName"
            type="text"
            @focus="createNameFocused = true"
            @blur="createNameFocused = false"
          />
          <label for="createName">Connection name</label>
        </div>

        <div class="provider-select">
          <span class="field-label">Provider</span>
          <div class="provider-btns">
            <button
              v-for="p in providers"
              :key="p"
              type="button"
              class="provider-btn"
              :class="{ active: createProvider === p }"
              @click="createProvider = p"
            >{{ p }}</button>
          </div>
        </div>

        <template v-if="createProvider === 'telegram'">
          <div class="float-field" :class="{ active: createBotTokenFocused || createBotToken }">
            <input
              id="createBotToken"
              v-model="createBotToken"
              type="text"
              @focus="createBotTokenFocused = true"
              @blur="createBotTokenFocused = false"
            />
            <label for="createBotToken">Bot token</label>
          </div>
          <div class="float-field" :class="{ active: createChatIdFocused || createChatId }">
            <input
              id="createChatId"
              v-model="createChatId"
              type="text"
              @focus="createChatIdFocused = true"
              @blur="createChatIdFocused = false"
            />
            <label for="createChatId">Chat ID</label>
          </div>
        </template>

        <div v-if="createProvider === 'slack'" class="float-field" :class="{ active: createWebhookFocused || createWebhook }">
          <input
            id="createWebhook"
            v-model="createWebhook"
            type="url"
            @focus="createWebhookFocused = true"
            @blur="createWebhookFocused = false"
          />
          <label for="createWebhook">Webhook URL</label>
        </div>

        <div v-if="createProvider === 'email'" class="float-field" :class="{ active: createAddressFocused || createAddress }">
          <input
            id="createAddress"
            v-model="createAddress"
            type="email"
            @focus="createAddressFocused = true"
            @blur="createAddressFocused = false"
          />
          <label for="createAddress">Email address</label>
        </div>

        <div v-if="createError" class="inline-error">{{ createError }}</div>
        <div class="inline-actions">
          <button type="button" class="btn-ghost" @click="resetCreateForm">Cancel</button>
          <button type="submit" class="btn-primary-sm" :disabled="createLoading">
            <span v-if="createLoading" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Create</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ── Active list block ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Active connections</div>
          <div class="block-desc">{{ connections.length }} connection{{ connections.length !== 1 ? 's' : '' }}</div>
        </div>
      </div>

      <div v-if="listLoading" class="conn-loading">Loading…</div>
      <div v-else-if="connections.length === 0" class="conn-empty">No active connections yet.</div>

      <div v-for="conn in connections" :key="conn.id" class="conn-row">
        <div class="conn-info">
          <span class="conn-name">{{ conn.name }}</span>
          <span class="provider-badge" :data-provider="conn.provider">{{ conn.provider }}</span>
          <span class="conn-date">{{ formatDate(conn.created_at) }}</span>
        </div>
        <div class="conn-actions">
          <button class="btn-ghost btn-sm" @click="openEdit(conn)">Edit</button>
          <button class="btn-danger-sm" @click="handleDelete(conn.id)" :disabled="deletingId === conn.id">
            <span v-if="deletingId === conn.id" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Delete</span>
          </button>
        </div>

        <form v-if="editingId === conn.id" @submit.prevent="handleEdit(conn)" class="inline-form edit-form">
          <div class="float-field active">
            <input :id="`editName-${conn.id}`" v-model="editName" type="text" />
            <label :for="`editName-${conn.id}`">Connection name</label>
          </div>

          <template v-if="conn.provider === 'telegram'">
            <div class="float-field active">
              <input :id="`editBotToken-${conn.id}`" v-model="editBotToken" type="text" />
              <label :for="`editBotToken-${conn.id}`">Bot token</label>
            </div>
            <div class="float-field active">
              <input :id="`editChatId-${conn.id}`" v-model="editChatId" type="text" />
              <label :for="`editChatId-${conn.id}`">Chat ID</label>
            </div>
          </template>

          <div v-if="conn.provider === 'slack'" class="float-field active">
            <input :id="`editWebhook-${conn.id}`" v-model="editWebhook" type="url" />
            <label :for="`editWebhook-${conn.id}`">Webhook URL</label>
          </div>

          <div v-if="conn.provider === 'email'" class="float-field active">
            <input :id="`editAddress-${conn.id}`" v-model="editAddress" type="email" />
            <label :for="`editAddress-${conn.id}`">Email address</label>
          </div>

          <div v-if="editError" class="inline-error">{{ editError }}</div>
          <div class="inline-actions">
            <button type="button" class="btn-ghost" @click="editingId = null">Cancel</button>
            <button type="submit" class="btn-primary-sm" :disabled="editLoading">
              <span v-if="editLoading" class="btn-loading"><span></span><span></span><span></span></span>
              <span v-else>Save</span>
            </button>
          </div>
        </form>
      </div>

      <div v-if="actionError" class="inline-error">{{ actionError }}</div>
    </div>

    <!-- ── Deleted block ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Deleted connections</div>
          <div class="block-desc">Soft-deleted connections you can restore.</div>
        </div>
        <button class="btn-ghost" @click="toggleDeleted">
          {{ showDeleted ? 'Hide' : 'Show deleted' }}
        </button>
      </div>

      <template v-if="showDeleted">
        <div v-if="deletedLoading" class="conn-loading">Loading…</div>
        <div v-else-if="deletedConnections.length === 0" class="conn-empty">No deleted connections.</div>
        <div v-for="conn in deletedConnections" :key="conn.id" class="conn-row">
          <div class="conn-info">
            <span class="conn-name">{{ conn.name }}</span>
            <span class="provider-badge" :data-provider="conn.provider">{{ conn.provider }}</span>
            <span class="conn-date">Deleted {{ formatDate(conn.updated_at) }}</span>
          </div>
          <div class="conn-actions">
            <button class="btn-ghost btn-sm" @click="handleRestore(conn.id)" :disabled="restoringId === conn.id">
              <span v-if="restoringId === conn.id" class="btn-loading"><span></span><span></span><span></span></span>
              <span v-else>Restore</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as connApi from '../api/connections'
import type { ConnectionDto, ConnectionCredentials, TelegramCredentials, SlackCredentials, EmailCredentials } from '../types'

type Provider = 'telegram' | 'slack' | 'email'
const providers: Provider[] = ['telegram', 'slack', 'email']

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))
}

// ── Active list ──
const connections = ref<ConnectionDto[]>([])
const listLoading = ref(false)
const actionError = ref('')

onMounted(async () => {
  listLoading.value = true
  try {
    connections.value = await connApi.listActive()
  } catch (e) {
    actionError.value = (e as Error).message
  } finally {
    listLoading.value = false
  }
})

// ── Create form ──
const showCreateForm = ref(false)
const createName = ref('')
const createNameFocused = ref(false)
const createProvider = ref<Provider>('telegram')
const createBotToken = ref('')
const createBotTokenFocused = ref(false)
const createChatId = ref('')
const createChatIdFocused = ref(false)
const createWebhook = ref('')
const createWebhookFocused = ref(false)
const createAddress = ref('')
const createAddressFocused = ref(false)
const createLoading = ref(false)
const createError = ref('')

function resetCreateForm() {
  showCreateForm.value = false
  createName.value = ''
  createProvider.value = 'telegram'
  createBotToken.value = ''
  createChatId.value = ''
  createWebhook.value = ''
  createAddress.value = ''
  createError.value = ''
}

function buildCreateCredentials(): ConnectionCredentials | null {
  if (createProvider.value === 'telegram') {
    if (!createBotToken.value || !createChatId.value) return null
    return { provider: 'telegram', bot_token: createBotToken.value, chat_id: createChatId.value }
  }
  if (createProvider.value === 'slack') {
    if (!createWebhook.value) return null
    return { provider: 'slack', webhook_url: createWebhook.value }
  }
  if (!createAddress.value) return null
  return { provider: 'email', address: createAddress.value }
}

async function handleCreate() {
  createError.value = ''
  if (!createName.value.trim()) { createError.value = 'Name is required'; return }
  const credentials = buildCreateCredentials()
  if (!credentials) { createError.value = 'All credential fields are required'; return }
  createLoading.value = true
  try {
    const conn = await connApi.createConnection(createName.value.trim(), credentials)
    connections.value.unshift(conn)
    resetCreateForm()
  } catch (e) {
    createError.value = (e as Error).message
  } finally {
    createLoading.value = false
  }
}

// ── Inline edit ──
const editingId = ref<string | null>(null)
const editName = ref('')
const editBotToken = ref('')
const editChatId = ref('')
const editWebhook = ref('')
const editAddress = ref('')
const editLoading = ref(false)
const editError = ref('')

function openEdit(conn: ConnectionDto) {
  editingId.value = conn.id
  editName.value = conn.name
  editError.value = ''
  const creds = conn.credentials
  if (creds.provider === 'telegram') {
    editBotToken.value = (creds as TelegramCredentials).bot_token
    editChatId.value = (creds as TelegramCredentials).chat_id
  } else if (creds.provider === 'slack') {
    editWebhook.value = (creds as SlackCredentials).webhook_url
  } else {
    editAddress.value = (creds as EmailCredentials).address
  }
}

function buildEditCredentials(provider: string): ConnectionCredentials {
  if (provider === 'telegram') return { provider: 'telegram', bot_token: editBotToken.value, chat_id: editChatId.value }
  if (provider === 'slack') return { provider: 'slack', webhook_url: editWebhook.value }
  return { provider: 'email', address: editAddress.value }
}

async function handleEdit(conn: ConnectionDto) {
  editError.value = ''
  editLoading.value = true
  try {
    const updated = await connApi.updateConnection(conn.id, {
      name: editName.value.trim(),
      credentials: buildEditCredentials(conn.provider),
    })
    const idx = connections.value.findIndex(c => c.id === conn.id)
    if (idx !== -1) connections.value[idx] = updated
    editingId.value = null
  } catch (e) {
    editError.value = (e as Error).message
  } finally {
    editLoading.value = false
  }
}

// ── Delete ──
const deletingId = ref<string | null>(null)

async function handleDelete(id: string) {
  actionError.value = ''
  deletingId.value = id
  try {
    await connApi.softDelete(id)
    connections.value = connections.value.filter(c => c.id !== id)
    if (deletedLoaded.value) {
      deletedConnections.value = await connApi.listDeleted()
    }
  } catch (e) {
    actionError.value = (e as Error).message
  } finally {
    deletingId.value = null
  }
}

// ── Deleted section ──
const showDeleted = ref(false)
const deletedConnections = ref<ConnectionDto[]>([])
const deletedLoading = ref(false)
const deletedLoaded = ref(false)
const restoringId = ref<string | null>(null)

async function toggleDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value && !deletedLoaded.value) {
    deletedLoading.value = true
    try {
      deletedConnections.value = await connApi.listDeleted()
      deletedLoaded.value = true
    } catch (e) {
      actionError.value = (e as Error).message
    } finally {
      deletedLoading.value = false
    }
  }
}

async function handleRestore(id: string) {
  actionError.value = ''
  restoringId.value = id
  try {
    const conn = await connApi.restore(id)
    deletedConnections.value = deletedConnections.value.filter(c => c.id !== id)
    connections.value.unshift(conn)
  } catch (e) {
    actionError.value = (e as Error).message
  } finally {
    restoringId.value = null
  }
}
</script>

<style scoped>
.conn-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.conn-row:last-child { border-bottom: none; }

.conn-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.conn-name { font-size: 13px; color: var(--fg); font-weight: 500; }
.conn-date { font-size: 11px; color: var(--muted); margin-left: auto; }
.conn-actions { display: flex; gap: 8px; }

.provider-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
.provider-badge[data-provider="telegram"] { color: #4fc3f7; background: color-mix(in srgb, #4fc3f7 12%, transparent); border: 1px solid color-mix(in srgb, #4fc3f7 25%, transparent); }
.provider-badge[data-provider="slack"]    { color: #a8d8a8; background: color-mix(in srgb, #a8d8a8 12%, transparent); border: 1px solid color-mix(in srgb, #a8d8a8 25%, transparent); }
.provider-badge[data-provider="email"]   { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent); }

.provider-select { display: flex; flex-direction: column; gap: 6px; }
.provider-btns { display: flex; gap: 6px; }
.provider-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  text-transform: capitalize;
  transition: all 0.15s;
}
.provider-btn.active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.edit-form { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.conn-empty, .conn-loading { font-size: 13px; color: var(--muted); padding: 16px 0; }

.btn-sm { font-size: 11px; padding: 4px 10px; }
.btn-danger-sm {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, #e57373 40%, transparent);
  background: color-mix(in srgb, #e57373 10%, transparent);
  color: #e57373;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-danger-sm:hover:not(:disabled) { background: color-mix(in srgb, #e57373 20%, transparent); }
.btn-danger-sm:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd frontend && npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ConnectionsTab.vue
git commit -m "feat(connection): add ConnectionsTab component"
```

---

### Task 4: Wire into DashboardView

**Files:**
- Modify: `frontend/src/views/DashboardView.vue`

Three targeted edits:

- [ ] **Step 1: Add import at top of `<script setup>` block**

After the existing `import * as userApi` line, add:

```ts
import ConnectionsTab from '../components/ConnectionsTab.vue'
```

- [ ] **Step 2: Update `Tab` union type and `tabs` array**

Change:

```ts
type Tab = 'profile' | 'security' | 'danger'
```

To:

```ts
type Tab = 'profile' | 'security' | 'connections' | 'danger'
```

Add `ConnectionsIcon` inline definition alongside the other icon definitions (after `SecurityIcon`):

```ts
const ConnectionsIcon = { template: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>` }
```

Change the `tabs` array from:

```ts
const tabs = [
  { id: 'profile' as Tab, label: 'Profile', icon: ProfileIcon },
  { id: 'security' as Tab, label: 'Security', icon: SecurityIcon },
  { id: 'danger' as Tab, label: 'Danger Zone', icon: DangerIcon },
]
```

To:

```ts
const tabs = [
  { id: 'profile' as Tab, label: 'Profile', icon: ProfileIcon },
  { id: 'security' as Tab, label: 'Security', icon: SecurityIcon },
  { id: 'connections' as Tab, label: 'Connections', icon: ConnectionsIcon },
  { id: 'danger' as Tab, label: 'Danger Zone', icon: DangerIcon },
]
```

- [ ] **Step 3: Add `<ConnectionsTab>` to the template**

In the `<main class="content">` block, after the closing `</section>` of the security tab (`v-else-if="currentTab === 'security'"`) and before the danger zone section, add:

```html
<!-- ── Connections Tab ── -->
<section v-else-if="currentTab === 'connections'" class="tab-section" key="connections">
  <ConnectionsTab />
</section>
```

- [ ] **Step 4: Verify type-check passes**

```bash
cd frontend && npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify visually**

```bash
cd frontend && npm run dev
```

Open http://localhost:5173, log in, navigate to the Dashboard. Confirm:
- "Connections" tab appears between Security and Danger Zone in the sidebar
- Clicking it renders the Connections section (empty state if no connections exist)
- Create form opens when clicking "Add", provider toggle switches credential fields
- Creating a connection adds it to the active list
- Edit button expands inline form pre-filled with current values
- Delete removes from active list
- "Show deleted" loads the deleted list; Restore moves item back to active

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/DashboardView.vue
git commit -m "feat(connection): wire Connections tab into DashboardView"
```

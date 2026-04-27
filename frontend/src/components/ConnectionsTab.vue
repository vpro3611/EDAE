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

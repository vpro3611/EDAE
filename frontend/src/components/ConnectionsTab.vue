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
          <div class="float-field" :class="{ active: editNameFocused || editName }">
            <input :id="`editName-${conn.id}`" v-model="editName" type="text"
              @focus="editNameFocused = true" @blur="editNameFocused = false" />
            <label :for="`editName-${conn.id}`">Connection name</label>
          </div>

          <template v-if="conn.provider === 'telegram'">
            <div class="float-field" :class="{ active: editBotTokenFocused || editBotToken }">
              <input :id="`editBotToken-${conn.id}`" v-model="editBotToken" type="text"
                @focus="editBotTokenFocused = true" @blur="editBotTokenFocused = false" />
              <label :for="`editBotToken-${conn.id}`">Bot token</label>
            </div>
            <div class="float-field" :class="{ active: editChatIdFocused || editChatId }">
              <input :id="`editChatId-${conn.id}`" v-model="editChatId" type="text"
                @focus="editChatIdFocused = true" @blur="editChatIdFocused = false" />
              <label :for="`editChatId-${conn.id}`">Chat ID</label>
            </div>
          </template>

          <div v-if="conn.provider === 'slack'" class="float-field" :class="{ active: editWebhookFocused || editWebhook }">
            <input :id="`editWebhook-${conn.id}`" v-model="editWebhook" type="url"
              @focus="editWebhookFocused = true" @blur="editWebhookFocused = false" />
            <label :for="`editWebhook-${conn.id}`">Webhook URL</label>
          </div>

          <div v-if="conn.provider === 'email'" class="float-field" :class="{ active: editAddressFocused || editAddress }">
            <input :id="`editAddress-${conn.id}`" v-model="editAddress" type="email"
              @focus="editAddressFocused = true" @blur="editAddressFocused = false" />
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
const editNameFocused = ref(false)
const editBotToken = ref('')
const editBotTokenFocused = ref(false)
const editChatId = ref('')
const editChatIdFocused = ref(false)
const editWebhook = ref('')
const editWebhookFocused = ref(false)
const editAddress = ref('')
const editAddressFocused = ref(false)
const editLoading = ref(false)
const editError = ref('')

function openEdit(conn: ConnectionDto) {
  editingId.value = conn.id
  editName.value = conn.name
  editBotToken.value = ''
  editChatId.value = ''
  editWebhook.value = ''
  editAddress.value = ''
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
    if (!editName.value.trim()) {
      editError.value = 'Name is required'
      editLoading.value = false
      return
    }
    const payload: { name?: string; credentials?: ConnectionCredentials } = {}
    if (editName.value.trim()) {
      payload.name = editName.value.trim()
    }
    const origCreds = conn.credentials
    let credentialsChanged = false
    if (origCreds.provider === 'telegram') {
      credentialsChanged = editBotToken.value !== (origCreds as TelegramCredentials).bot_token
        || editChatId.value !== (origCreds as TelegramCredentials).chat_id
    } else if (origCreds.provider === 'slack') {
      credentialsChanged = editWebhook.value !== (origCreds as SlackCredentials).webhook_url
    } else {
      credentialsChanged = editAddress.value !== (origCreds as EmailCredentials).address
    }
    if (credentialsChanged) {
      payload.credentials = buildEditCredentials(conn.provider)
    }
    const updated = await connApi.updateConnection(conn.id, payload)
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
    const deleted = connections.value.find(c => c.id === id)
    connections.value = connections.value.filter(c => c.id !== id)
    if (deletedLoaded.value && deleted) {
      deletedConnections.value.unshift(deleted)
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
/* ── Shared dashboard utility classes (copied from DashboardView scoped styles) ── */
.section-header { margin-bottom: 4px; }
.section-title { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--text); letter-spacing: -0.01em; margin-bottom: 4px; }
.section-sub { font-size: 13px; color: var(--text-2); }

.settings-block {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px;
  display: flex; flex-direction: column; gap: 16px;
}

.block-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.block-desc { font-size: 13px; color: var(--text-2); line-height: 1.5; }

.inline-form { display: flex; flex-direction: column; gap: 14px; }

.float-field {
  position: relative; padding-top: 18px;
  border-bottom: 1px solid var(--border); transition: border-color 0.2s;
}
.float-field input {
  width: 100%; background: transparent; border: none; outline: none;
  color: var(--text); font-family: var(--font-ui); font-size: 15px;
  padding: 8px 36px 8px 0;
}
.float-field label {
  position: absolute; left: 0; top: 26px; font-size: 15px; color: var(--text-2);
  pointer-events: none; transition: top 0.2s, font-size 0.2s, color 0.2s, letter-spacing 0.2s;
}
.float-field.active label { top: 2px; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.float-field:focus-within { border-bottom-color: var(--accent); }

.float-field .field-toggle {
  position: absolute; right: 0; top: 50%; transform: translateY(-25%);
  background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px;
  display: flex; align-items: center; transition: color 0.2s;
}
.float-field .field-toggle:hover { color: var(--text-2); }

.field-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }

.inline-error { font-size: 12px; color: var(--error); padding: 6px 10px; background: rgba(224,96,96,0.08); border-radius: 3px; animation: shake 0.3s ease; }
.inline-success { font-size: 12px; color: var(--success); padding: 6px 10px; background: rgba(90,201,136,0.08); border-radius: 3px; }

.inline-actions { display: flex; gap: 10px; justify-content: flex-end; }

.btn-ghost {
  background: none; border: 1px solid var(--border); color: var(--text-2);
  font-family: var(--font-ui); font-size: 12px; font-weight: 500; letter-spacing: 0.06em;
  padding: 7px 14px; border-radius: 3px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.15); }

.btn-primary-sm {
  background: var(--accent); color: #1a1205; border: none;
  font-family: var(--font-ui); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 7px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 6px; white-space: nowrap; min-width: 72px; justify-content: center;
}
.btn-primary-sm:hover:not(:disabled) { background: #d9bb8e; box-shadow: 0 2px 12px rgba(200,169,126,0.25); }
.btn-primary-sm:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-loading { display: flex; gap: 4px; align-items: center; }
.btn-loading span { width: 4px; height: 4px; border-radius: 50%; background: #1a1205; animation: bounce 0.9s infinite ease-in-out; }
.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }

/* ── Component-specific styles ── */
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

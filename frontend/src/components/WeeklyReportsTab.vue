<template>
  <div>
    <div class="section-header">
      <h2 class="section-title">Weekly Reports</h2>
      <p class="section-sub">Schedule automated PDF summaries of your GitHub activity.</p>
    </div>

    <!-- ── Create block ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">New report schedule</div>
          <div class="block-desc">Choose a connection and delivery frequency.</div>
        </div>
        <button class="btn-ghost" @click="showCreate = !showCreate">
          {{ showCreate ? 'Cancel' : 'Add' }}
        </button>
      </div>

      <form v-if="showCreate" @submit.prevent="handleCreate" class="inline-form">
        <!-- Connection picker -->
        <div class="field-group">
          <span class="field-label">Connection</span>
          <select v-model="createConnectionId" class="select-input" required>
            <option value="" disabled>Select a connection…</option>
            <option v-for="c in connections" :key="c.id" :value="c.id">
              {{ c.name }} ({{ c.provider }})
            </option>
          </select>
          <div v-if="connectionsError" class="inline-error">{{ connectionsError }}</div>
        </div>

        <!-- Frequency picker -->
        <div class="field-group">
          <span class="field-label">Frequency</span>
          <div class="provider-btns">
            <button
              v-for="f in frequencies"
              :key="f"
              type="button"
              class="provider-btn"
              :class="{ active: createFrequency === f }"
              @click="createFrequency = f"
            >{{ f }}</button>
          </div>
        </div>

        <!-- Schedule day (weekly only) -->
        <div v-if="createFrequency === 'weekly'" class="field-group">
          <span class="field-label">Day of week</span>
          <div class="provider-btns">
            <button
              v-for="(day, idx) in weekdays"
              :key="idx"
              type="button"
              class="provider-btn"
              :class="{ active: createScheduleDay === idx }"
              @click="createScheduleDay = idx"
            >{{ day }}</button>
          </div>
        </div>

        <div v-if="createError" class="inline-error">{{ createError }}</div>
        <div v-if="createSuccess" class="inline-success">{{ createSuccess }}</div>

        <div class="inline-actions">
          <button type="button" class="btn-ghost" @click="showCreate = false">Cancel</button>
          <button type="submit" class="btn-primary-sm" :disabled="createLoading || !createConnectionId">
            <span v-if="createLoading" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Create</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ── Report configs list ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Active schedules</div>
          <div class="block-desc">Manage existing report configurations.</div>
        </div>
      </div>

      <div v-if="listLoading" class="empty-state">Loading…</div>
      <div v-else-if="listError" class="inline-error" style="margin-top: 12px">{{ listError }}</div>
      <div v-else-if="configs.length === 0" class="empty-state">No report schedules yet.</div>

      <div v-else class="item-list">
        <div v-for="cfg in configs" :key="cfg.id" class="item-row">
          <div class="item-info">
            <div class="item-name">
              <span class="badge-freq">{{ cfg.frequency }}</span>
              <span v-if="cfg.frequency === 'weekly'" class="item-sub">on {{ weekdays[cfg.schedule_day] }}</span>
            </div>
            <div class="item-meta">
              <span class="item-conn">→ {{ connectionName(cfg.connection_id) }}</span>
              <span class="item-last" v-if="cfg.last_sent_at">Last sent {{ formatDate(cfg.last_sent_at) }}</span>
              <span class="item-last" v-else>Never sent</span>
            </div>
          </div>

          <div class="item-actions">
            <button
              class="btn-ghost btn-sm"
              :disabled="generatingId === cfg.id"
              @click="handleGenerate(cfg.id)"
              title="Generate now"
            >
              <span v-if="generatingId === cfg.id" class="btn-loading"><span></span><span></span><span></span></span>
              <span v-else>Generate now</span>
            </button>
            <button
              class="btn-danger-sm"
              :disabled="deletingId === cfg.id"
              @click="handleDelete(cfg.id)"
            >
              <span v-if="deletingId === cfg.id" class="btn-loading"><span></span><span></span><span></span></span>
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="actionError" class="inline-error" style="margin-top: 10px">{{ actionError }}</div>
      <div v-if="actionSuccess" class="inline-success" style="margin-top: 10px">{{ actionSuccess }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as reportsApi from '../api/reports'
import * as connectionsApi from '../api/connections'
import type { ReportConfigDto, ReportFrequency, ConnectionDto } from '../types'

// ── State ──
const configs = ref<ReportConfigDto[]>([])
const connections = ref<ConnectionDto[]>([])

const listLoading = ref(false)
const listError = ref('')
const connectionsError = ref('')

const showCreate = ref(false)
const createConnectionId = ref('')
const createFrequency = ref<ReportFrequency>('weekly')
const createScheduleDay = ref(1) // Monday
const createLoading = ref(false)
const createError = ref('')
const createSuccess = ref('')

const deletingId = ref<string | null>(null)
const generatingId = ref<string | null>(null)
const actionError = ref('')
const actionSuccess = ref('')

const frequencies: ReportFrequency[] = ['daily', 'weekly', 'monthly']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Load ──
async function loadConfigs() {
  listLoading.value = true
  listError.value = ''
  try {
    configs.value = await reportsApi.listReportConfigs()
  } catch (e: any) {
    listError.value = e.message
  } finally {
    listLoading.value = false
  }
}

async function loadConnections() {
  try {
    connections.value = await connectionsApi.listActive()
  } catch (e: any) {
    connectionsError.value = e.message
  }
}

onMounted(() => {
  loadConfigs()
  loadConnections()
})

// ── Helpers ──
function connectionName(id: string): string {
  const c = connections.value.find(c => c.id === id)
  return c ? `${c.name} (${c.provider})` : id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Create ──
async function handleCreate() {
  createError.value = ''
  createSuccess.value = ''
  createLoading.value = true
  try {
    const cfg = await reportsApi.createReportConfig({
      connection_id: createConnectionId.value,
      frequency: createFrequency.value,
      schedule_day: createFrequency.value === 'weekly' ? createScheduleDay.value : 0,
    })
    configs.value.unshift(cfg)
    showCreate.value = false
    createConnectionId.value = ''
    createFrequency.value = 'weekly'
    createScheduleDay.value = 1
    createSuccess.value = 'Schedule created.'
    setTimeout(() => { createSuccess.value = '' }, 3000)
  } catch (e: any) {
    createError.value = e.message
  } finally {
    createLoading.value = false
  }
}

// ── Delete ──
async function handleDelete(id: string) {
  actionError.value = ''
  actionSuccess.value = ''
  deletingId.value = id
  try {
    await reportsApi.deleteReportConfig(id)
    configs.value = configs.value.filter(c => c.id !== id)
    actionSuccess.value = 'Schedule deleted.'
    setTimeout(() => { actionSuccess.value = '' }, 3000)
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    deletingId.value = null
  }
}

// ── Generate now ──
async function handleGenerate(id: string) {
  actionError.value = ''
  actionSuccess.value = ''
  generatingId.value = id
  try {
    await reportsApi.generateReport(id)
    // Refresh last_sent_at
    await loadConfigs()
    actionSuccess.value = 'Report generated and dispatched.'
    setTimeout(() => { actionSuccess.value = '' }, 4000)
  } catch (e: any) {
    actionError.value = e.message
  } finally {
    generatingId.value = null
  }
}
</script>

<style scoped>
/* ── Dashboard vocabulary (mirrors ConnectionsTab) ── */
.section-header { margin-bottom: 4px; }
.section-title { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--text); letter-spacing: -0.01em; margin-bottom: 4px; }
.section-sub { font-size: 13px; color: var(--text-2); }

.settings-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.block-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.block-desc { font-size: 13px; color: var(--text-2); line-height: 1.5; }

.inline-form { display: flex; flex-direction: column; gap: 14px; }
.inline-error { font-size: 12px; color: var(--error); padding: 6px 10px; background: rgba(224,96,96,0.08); border-radius: 3px; }
.inline-success { font-size: 12px; color: var(--success); padding: 6px 10px; background: rgba(90,201,136,0.08); border-radius: 3px; }
.inline-actions { display: flex; gap: 10px; justify-content: flex-end; }

.field-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }

.field-group { display: flex; flex-direction: column; gap: 8px; }

.btn-ghost {
  background: none; border: 1px solid var(--border); color: var(--text-2);
  font-family: var(--font-ui); font-size: 12px; font-weight: 500; letter-spacing: 0.06em;
  padding: 7px 14px; border-radius: 3px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.15); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary-sm {
  background: var(--accent); color: #1a1205; border: none;
  font-family: var(--font-ui); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 7px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 6px; white-space: nowrap; min-width: 72px; justify-content: center;
}
.btn-primary-sm:hover:not(:disabled) { background: #d9bb8e; box-shadow: 0 2px 12px rgba(200,169,126,0.25); }
.btn-primary-sm:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-loading { display: flex; gap: 4px; align-items: center; }
.btn-loading span { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: bounce 0.9s infinite ease-in-out; }
.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }

.provider-select { display: flex; flex-direction: column; gap: 6px; }
.provider-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.provider-btn {
  padding: 4px 12px; border-radius: 4px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); cursor: pointer;
  font-size: 12px; text-transform: capitalize; transition: all 0.15s; font-family: var(--font-ui);
}
.provider-btn.active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Select field ── */
.select-input {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  padding: 9px 12px;
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
  appearance: none;
  cursor: pointer;
}
.select-input:focus { border-color: var(--accent); }
.select-input option { background: #1a1a2e; color: var(--text); }

/* ── Config list ── */
.item-list { display: flex; flex-direction: column; gap: 0; }

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.item-row:last-child { border-bottom: none; }

.item-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }

.item-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.item-sub {
  color: var(--text-2);
  font-weight: 400;
  font-size: 12px;
}

.item-meta {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--muted);
  flex-wrap: wrap;
}

.badge-freq {
  display: inline-block;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 20px;
  font-size: 10px;
  color: var(--accent);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.item-actions { display: flex; gap: 8px; flex-shrink: 0; }

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
  display: flex; align-items: center; gap: 4px;
  font-family: var(--font-ui);
}
.btn-danger-sm:hover:not(:disabled) { background: color-mix(in srgb, #e57373 20%, transparent); }
.btn-danger-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.empty-state {
  text-align: center;
  padding: 24px 0;
  color: var(--muted);
  font-size: 13px;
}

@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
</style>

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

      <div v-if="listLoading" class="conn-loading">Loading…</div>
      <div v-else-if="listError" class="inline-error" style="margin-top: 12px">{{ listError }}</div>
      <div v-else-if="configs.length === 0" class="conn-empty">No report schedules yet.</div>

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

const configs = ref<ReportConfigDto[]>([])
const connections = ref<ConnectionDto[]>([])

const listLoading = ref(false)
const listError = ref('')
const connectionsError = ref('')

const showCreate = ref(false)
const createConnectionId = ref('')
const createFrequency = ref<ReportFrequency>('weekly')
const createScheduleDay = ref(1)
const createLoading = ref(false)
const createError = ref('')
const createSuccess = ref('')

const deletingId = ref<string | null>(null)
const generatingId = ref<string | null>(null)
const actionError = ref('')
const actionSuccess = ref('')

const frequencies: ReportFrequency[] = ['daily', 'weekly', 'monthly']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function connectionName(id: string): string {
  const c = connections.value.find(c => c.id === id)
  return c ? `${c.name} (${c.provider})` : id
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

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

async function handleGenerate(id: string) {
  actionError.value = ''
  actionSuccess.value = ''
  generatingId.value = id
  try {
    await reportsApi.generateReport(id)
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
/* Component-specific only — shared primitives from assets/shared.css */

.item-list { display: flex; flex-direction: column; }

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

.item-sub { color: var(--text-2); font-weight: 400; font-size: 12px; }

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
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: 20px;
  font-size: 10px;
  color: var(--accent);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.item-actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>

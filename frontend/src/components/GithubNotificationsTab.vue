<template>
  <div>
    <div class="section-header">
      <h2 class="section-title">GitHub Notifications</h2>
      <p class="section-sub">Monitor repositories and get notified about GitHub events.</p>
    </div>

    <!-- ── Add source ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Add repository</div>
          <div class="block-desc">Connect a GitHub repository to monitor.</div>
        </div>
        <button class="btn-ghost" @click="showSourceForm = !showSourceForm">
          {{ showSourceForm ? 'Cancel' : 'Add' }}
        </button>
      </div>
      <form v-if="showSourceForm" @submit.prevent="handleCreateSource" class="inline-form">
        <div class="field-row">
          <div class="float-field" :class="{ active: ownerFocused || sourceOwner }">
            <input id="srcOwner" v-model="sourceOwner" type="text"
              @focus="ownerFocused = true" @blur="ownerFocused = false" />
            <label for="srcOwner">Owner</label>
          </div>
          <div class="float-field" :class="{ active: repoFocused || sourceRepo }">
            <input id="srcRepo" v-model="sourceRepo" type="text"
              @focus="repoFocused = true" @blur="repoFocused = false" />
            <label for="srcRepo">Repository name</label>
          </div>
        </div>
        <div class="float-field" :class="{ active: tokenFocused || sourceToken }">
          <input id="srcToken" v-model="sourceToken" type="password" autocomplete="off"
            @focus="tokenFocused = true" @blur="tokenFocused = false" />
          <label for="srcToken">Access token (optional — required for private repos)</label>
        </div>
        <div v-if="sourceError" class="inline-error">{{ sourceError }}</div>
        <div class="inline-actions">
          <button type="button" class="btn-ghost" @click="resetSourceForm">Cancel</button>
          <button type="submit" class="btn-primary-sm" :disabled="sourceLoading">
            <span v-if="sourceLoading" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Add</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ── Sources list ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Monitored repositories</div>
          <div class="block-desc">{{ sources.length }} repositor{{ sources.length !== 1 ? 'ies' : 'y' }}</div>
        </div>
      </div>
      <div v-if="sourcesLoading" class="conn-loading">Loading…</div>
      <div v-else-if="sources.length === 0" class="conn-empty">No repositories added yet.</div>
      <div v-for="src in sources" :key="src.id" class="conn-row">
        <div class="conn-info">
          <span class="conn-name">{{ src.repo_owner }}/{{ src.repo_name }}</span>
          <span v-if="src.has_token" class="event-badge badge-token">token</span>
          <span class="conn-date">{{ formatDate(src.created_at) }}</span>
        </div>
        <div class="conn-actions">
          <button class="btn-danger-sm" @click="handleDeleteSource(src.id)" :disabled="deletingSourceId === src.id">
            <span v-if="deletingSourceId === src.id" class="btn-loading danger-load"><span></span><span></span><span></span></span>
            <span v-else>Remove</span>
          </button>
        </div>
      </div>
      <div v-if="sourceActionError" class="inline-error">{{ sourceActionError }}</div>
    </div>

    <!-- ── Subscriptions ── -->
    <div class="settings-block">
      <div class="block-header">
        <div>
          <div class="block-title">Subscriptions</div>
          <div class="block-desc">{{ sources.length === 0 ? 'Add a repository first.' : 'Event notifications per repository.' }}</div>
        </div>
        <button v-if="sources.length > 0" class="btn-ghost" @click="showSubForm = !showSubForm">
          {{ showSubForm ? 'Cancel' : 'Subscribe' }}
        </button>
      </div>

      <template v-if="sources.length > 0">
        <!-- Source filter pills -->
        <div class="source-selector">
          <span class="field-label">Repository</span>
          <div class="pills">
            <button
              v-for="src in sources"
              :key="src.id"
              type="button"
              class="provider-btn"
              :class="{ active: selectedSourceId === src.id }"
              @click="selectSource(src.id)"
            >{{ src.repo_owner }}/{{ src.repo_name }}</button>
          </div>
        </div>

        <!-- Add subscription form -->
        <form v-if="showSubForm" @submit.prevent="handleCreateSub" class="inline-form sub-form">
          <div class="select-field">
            <span class="field-label">Event type</span>
            <select v-model="subEventType" class="native-select">
              <option v-for="et in EVENT_TYPES" :key="et.value" :value="et.value">{{ et.label }}</option>
            </select>
          </div>

          <div class="select-field">
            <span class="field-label">Notification channel</span>
            <select v-model="subConnectionId" class="native-select">
              <option value="" disabled>Select a connection…</option>
              <option v-for="conn in connections" :key="conn.id" :value="conn.id">
                {{ conn.name }} ({{ conn.provider }})
              </option>
            </select>
          </div>

          <div v-if="subEventType === 'workflow_completed'" class="float-field" :class="{ active: wfFocused || subWorkflowId }">
            <input id="subWf" v-model="subWorkflowId" type="text"
              @focus="wfFocused = true" @blur="wfFocused = false" />
            <label for="subWf">Workflow name or ID</label>
          </div>

          <div v-if="subEventType === 'star_milestone' || subEventType === 'fork_milestone'">
            <div class="float-field" :class="{ active: msFocused || subMilestone }">
              <input id="subMs" v-model="subMilestone" type="number" min="1"
                :placeholder="subEventType === 'star_milestone' ? '100' : '10'"
                @focus="msFocused = true" @blur="msFocused = false" />
              <label for="subMs">Notify when {{ subEventType === 'star_milestone' ? 'stars' : 'forks' }} reach</label>
            </div>
            <div class="field-hint">
              You will receive a notification once the repository crosses this
              {{ subEventType === 'star_milestone' ? 'star' : 'fork' }} count.
              Default: {{ subEventType === 'star_milestone' ? '100' : '10' }}.
            </div>
          </div>

          <div v-if="subError" class="inline-error">{{ subError }}</div>
          <div class="inline-actions">
            <button type="button" class="btn-ghost" @click="resetSubForm">Cancel</button>
            <button type="submit" class="btn-primary-sm" :disabled="subLoading">
              <span v-if="subLoading" class="btn-loading"><span></span><span></span><span></span></span>
              <span v-else>Subscribe</span>
            </button>
          </div>
        </form>

        <!-- Subscriptions list -->
        <div v-if="subsLoading" class="conn-loading">Loading…</div>
        <div v-else-if="subscriptions.length === 0 && !showSubForm" class="conn-empty">No subscriptions for this repository.</div>
        <div v-for="sub in subscriptions" :key="sub.id" class="conn-row">
          <div class="conn-info">
            <span class="event-badge" :data-event="sub.event_type">{{ eventLabel(sub.event_type) }}</span>
            <span class="conn-name sub-via">via {{ connectionName(sub.connection_id) }}</span>
            <span class="conn-date">{{ formatDate(sub.created_at) }}</span>
          </div>
          <div class="conn-actions">
            <button class="btn-danger-sm" @click="handleDeleteSub(sub.id)" :disabled="deletingSubId === sub.id">
              <span v-if="deletingSubId === sub.id" class="btn-loading danger-load"><span></span><span></span><span></span></span>
              <span v-else>Remove</span>
            </button>
          </div>
        </div>
        <div v-if="subActionError" class="inline-error">{{ subActionError }}</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as sourcesApi from '../api/github_sources'
import * as subsApi from '../api/subscriptions'
import * as connApi from '../api/connections'
import type { GithubSourceDto, SubscriptionDto, ConnectionDto, SubscriptionEventType } from '../types'

const EVENT_TYPES: { value: SubscriptionEventType; label: string }[] = [
  { value: 'new_release',        label: 'New Release' },
  { value: 'new_commit',         label: 'New Commit' },
  { value: 'new_branch',         label: 'New Branch' },
  { value: 'new_tag',            label: 'New Tag' },
  { value: 'issue_opened',       label: 'Issue Opened' },
  { value: 'issue_closed',       label: 'Issue Closed' },
  { value: 'pr_opened',          label: 'PR Opened' },
  { value: 'pr_merged',          label: 'PR Merged' },
  { value: 'workflow_completed', label: 'Workflow Completed' },
  { value: 'star_milestone',     label: 'Star Milestone' },
  { value: 'fork_milestone',     label: 'Fork Milestone' },
]

const TEMPLATES: Record<SubscriptionEventType, string> = {
  new_release:        '[Release] {{repo}}\nVersion: {{name}} ({{tag_name}}) has been published.\n{{url}}',
  new_commit:         '[Commit] {{repo}}\nCommit {{sha}} by {{author}}\n"{{message}}"\n{{url}}',
  new_branch:         '[Branch] {{repo}}\nNew branch created: {{branch}}',
  new_tag:            '[Tag] {{repo}}\nNew tag pushed: {{tag}}',
  issue_opened:       '[Issue Opened] {{repo}}\n#{{number}}: {{title}}\n{{url}}',
  issue_closed:       '[Issue Closed] {{repo}}\n#{{number}}: {{title}}\n{{url}}',
  pr_opened:          '[PR Opened] {{repo}}\n#{{number}}: {{title}}\n{{url}}',
  pr_merged:          '[PR Merged] {{repo}}\n#{{number}}: {{title}}\n{{url}}',
  workflow_completed: '[Workflow] {{repo}}\n{{workflow}} completed — conclusion: {{conclusion}}\n{{url}}',
  star_milestone:     '[Star Milestone] {{repo}} reached {{stars}} stars (milestone: {{milestone}})',
  fork_milestone:     '[Fork Milestone] {{repo}} reached {{forks}} forks (milestone: {{milestone}})',
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
}

function eventLabel(type: SubscriptionEventType): string {
  return EVENT_TYPES.find(e => e.value === type)?.label ?? type
}

function connectionName(id: string): string {
  return connections.value.find(c => c.id === id)?.name ?? id.slice(0, 8) + '…'
}

// ── Sources ──
const sources = ref<GithubSourceDto[]>([])
const sourcesLoading = ref(false)
const sourceActionError = ref('')
const deletingSourceId = ref<string | null>(null)

const showSourceForm = ref(false)
const sourceOwner = ref('')
const sourceRepo = ref('')
const sourceToken = ref('')
const ownerFocused = ref(false)
const repoFocused = ref(false)
const tokenFocused = ref(false)
const sourceLoading = ref(false)
const sourceError = ref('')

function resetSourceForm() {
  showSourceForm.value = false
  sourceOwner.value = ''
  sourceRepo.value = ''
  sourceToken.value = ''
  sourceError.value = ''
}

async function handleCreateSource() {
  sourceError.value = ''
  if (!sourceOwner.value.trim()) { sourceError.value = 'Owner is required'; return }
  if (!sourceRepo.value.trim()) { sourceError.value = 'Repository name is required'; return }
  sourceLoading.value = true
  try {
    const src = await sourcesApi.createSource(
      sourceOwner.value.trim(),
      sourceRepo.value.trim(),
      sourceToken.value.trim() || null,
    )
    sources.value.unshift(src)
    if (!selectedSourceId.value) selectSource(src.id)
    resetSourceForm()
  } catch (e) {
    sourceError.value = (e as Error).message
  } finally {
    sourceLoading.value = false
  }
}

async function handleDeleteSource(id: string) {
  sourceActionError.value = ''
  deletingSourceId.value = id
  try {
    await sourcesApi.deleteSource(id)
    sources.value = sources.value.filter(s => s.id !== id)
    if (selectedSourceId.value === id) {
      const next = sources.value[0]
      selectedSourceId.value = next?.id ?? null
      if (next) await loadSubscriptions(next.id)
      else subscriptions.value = []
    }
  } catch (e) {
    sourceActionError.value = (e as Error).message
  } finally {
    deletingSourceId.value = null
  }
}

// ── Connections (for subscription form dropdown) ──
const connections = ref<ConnectionDto[]>([])

// ── Subscriptions ──
const subscriptions = ref<SubscriptionDto[]>([])
const subsLoading = ref(false)
const subActionError = ref('')
const deletingSubId = ref<string | null>(null)
const selectedSourceId = ref<string | null>(null)

const showSubForm = ref(false)
const subEventType = ref<SubscriptionEventType>('new_release')
const subConnectionId = ref('')
const subWorkflowId = ref('')
const subMilestone = ref('')
const wfFocused = ref(false)
const msFocused = ref(false)
const subLoading = ref(false)
const subError = ref('')

function resetSubForm() {
  showSubForm.value = false
  subEventType.value = 'new_release'
  subConnectionId.value = ''
  subWorkflowId.value = ''
  subMilestone.value = ''
  subError.value = ''
}

watch(subEventType, () => {
  subWorkflowId.value = ''
  subMilestone.value = ''
})

async function loadSubscriptions(sourceId: string) {
  subsLoading.value = true
  subActionError.value = ''
  try {
    subscriptions.value = await subsApi.listSubscriptions(sourceId)
  } catch (e) {
    subActionError.value = (e as Error).message
  } finally {
    subsLoading.value = false
  }
}

async function selectSource(id: string) {
  selectedSourceId.value = id
  await loadSubscriptions(id)
}

async function handleCreateSub() {
  subError.value = ''
  if (!selectedSourceId.value) return
  if (!subConnectionId.value) { subError.value = 'Select a notification channel'; return }
  if (subEventType.value === 'workflow_completed' && !subWorkflowId.value.trim()) {
    subError.value = 'Workflow name or ID is required'
    return
  }
  if ((subEventType.value === 'star_milestone' || subEventType.value === 'fork_milestone') && !subMilestone.value) {
    subError.value = 'Milestone count is required'
    return
  }

  const config: Record<string, unknown> = {}
  if (subEventType.value === 'workflow_completed') config.workflow_id = subWorkflowId.value.trim()
  if (subEventType.value === 'star_milestone' || subEventType.value === 'fork_milestone') {
    config.milestone = Number(subMilestone.value)
  }

  subLoading.value = true
  try {
    const sub = await subsApi.createSubscription({
      github_source_id: selectedSourceId.value,
      event_type: subEventType.value,
      connection_id: subConnectionId.value,
      message_template: TEMPLATES[subEventType.value],
      config,
    })
    subscriptions.value.unshift(sub)
    resetSubForm()
  } catch (e) {
    subError.value = (e as Error).message
  } finally {
    subLoading.value = false
  }
}

async function handleDeleteSub(id: string) {
  subActionError.value = ''
  deletingSubId.value = id
  try {
    await subsApi.deleteSubscription(id)
    subscriptions.value = subscriptions.value.filter(s => s.id !== id)
  } catch (e) {
    subActionError.value = (e as Error).message
  } finally {
    deletingSubId.value = null
  }
}

onMounted(async () => {
  sourcesLoading.value = true
  try {
    const [srcs, conns] = await Promise.all([sourcesApi.listSources(), connApi.listActive()])
    sources.value = srcs
    connections.value = conns
    if (srcs.length > 0) await selectSource(srcs[0].id)
  } catch (e) {
    sourceActionError.value = (e as Error).message
  } finally {
    sourcesLoading.value = false
  }
})
</script>

<style scoped>
/* ── Shared block styles (mirror DashboardView / ConnectionsTab) ── */
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
  padding: 8px 0;
}
.float-field label {
  position: absolute; left: 0; top: 26px; font-size: 15px; color: var(--text-2);
  pointer-events: none; transition: top 0.2s, font-size 0.2s, color 0.2s, letter-spacing 0.2s;
}
.float-field.active label { top: 2px; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.float-field:focus-within { border-bottom-color: var(--accent); }

.field-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.field-hint { font-size: 11px; color: var(--text-2); margin-top: 6px; line-height: 1.5; }

.inline-error { font-size: 12px; color: var(--error); padding: 6px 10px; background: rgba(224,96,96,0.08); border-radius: 3px; animation: shake 0.3s ease; }
.inline-actions { display: flex; gap: 10px; justify-content: flex-end; }

/* ── Field row (side-by-side) ── */
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 500px) { .field-row { grid-template-columns: 1fr; } }

/* ── Select ── */
.select-field { display: flex; flex-direction: column; gap: 6px; }

.native-select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 13px;
  padding: 8px 10px;
  cursor: pointer;
  transition: border-color 0.2s;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
}
.native-select:focus { border-color: var(--accent); }
.native-select option { background: #111; }

/* ── Source selector ── */
.source-selector { display: flex; flex-direction: column; gap: 7px; }
.pills { display: flex; gap: 6px; flex-wrap: wrap; }

.provider-btn {
  padding: 4px 12px; border-radius: 4px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); cursor: pointer;
  font-size: 12px; font-family: var(--font-ui);
  transition: all 0.15s;
}
.provider-btn.active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent); color: var(--accent);
}

/* ── Sub form separation ── */
.sub-form { padding-top: 4px; border-top: 1px solid var(--border); }

/* ── Rows ── */
.conn-row {
  padding: 12px 0; border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 8px;
}
.conn-row:last-child { border-bottom: none; }

.conn-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.conn-name { font-size: 13px; color: var(--text); font-weight: 500; }
.sub-via { font-weight: 400; color: var(--text-2); }
.conn-date { font-size: 11px; color: var(--muted); margin-left: auto; }
.conn-actions { display: flex; gap: 8px; }
.conn-empty, .conn-loading { font-size: 13px; color: var(--muted); padding: 16px 0; }

/* ── Badges ── */
.event-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
}
.badge-token { color: #5ac89e; background: color-mix(in srgb, #5ac89e 12%, transparent); border: 1px solid color-mix(in srgb, #5ac89e 25%, transparent); }

/* Event type colours — grouped by category */
[data-event="new_release"]        { color: #c8a97e; background: color-mix(in srgb, #c8a97e 12%, transparent); border: 1px solid color-mix(in srgb, #c8a97e 25%, transparent); }
[data-event="new_commit"]         { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 12%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 25%, transparent); }
[data-event="new_branch"]         { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 12%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 25%, transparent); }
[data-event="new_tag"]            { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 12%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 25%, transparent); }
[data-event="issue_opened"]       { color: #e8956d; background: color-mix(in srgb, #e8956d 12%, transparent); border: 1px solid color-mix(in srgb, #e8956d 25%, transparent); }
[data-event="issue_closed"]       { color: #5ac89e; background: color-mix(in srgb, #5ac89e 12%, transparent); border: 1px solid color-mix(in srgb, #5ac89e 25%, transparent); }
[data-event="pr_opened"]          { color: #8b9ef0; background: color-mix(in srgb, #8b9ef0 12%, transparent); border: 1px solid color-mix(in srgb, #8b9ef0 25%, transparent); }
[data-event="pr_merged"]          { color: #b57df0; background: color-mix(in srgb, #b57df0 12%, transparent); border: 1px solid color-mix(in srgb, #b57df0 25%, transparent); }
[data-event="workflow_completed"] { color: #6eb8e8; background: color-mix(in srgb, #6eb8e8 12%, transparent); border: 1px solid color-mix(in srgb, #6eb8e8 25%, transparent); }
[data-event="star_milestone"]     { color: #e8d06d; background: color-mix(in srgb, #e8d06d 12%, transparent); border: 1px solid color-mix(in srgb, #e8d06d 25%, transparent); }
[data-event="fork_milestone"]     { color: #e8d06d; background: color-mix(in srgb, #e8d06d 12%, transparent); border: 1px solid color-mix(in srgb, #e8d06d 25%, transparent); }

/* ── Buttons ── */
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

.btn-danger-sm {
  font-size: 11px; padding: 4px 10px; border-radius: 4px;
  border: 1px solid color-mix(in srgb, #e57373 40%, transparent);
  background: color-mix(in srgb, #e57373 10%, transparent);
  color: #e57373; cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; gap: 4px;
}
.btn-danger-sm:hover:not(:disabled) { background: color-mix(in srgb, #e57373 20%, transparent); }
.btn-danger-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-loading { display: flex; gap: 4px; align-items: center; }
.btn-loading span { width: 4px; height: 4px; border-radius: 50%; background: #1a1205; animation: bounce 0.9s infinite ease-in-out; }
.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }
.danger-load span { background: #e57373; }

@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
</style>

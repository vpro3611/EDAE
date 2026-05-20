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
            <span v-if="deletingSourceId === src.id" class="btn-loading"><span></span><span></span><span></span></span>
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
            <div class="field-hint" style="margin-top: 6px;">
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
              <span v-if="deletingSubId === sub.id" class="btn-loading"><span></span><span></span><span></span></span>
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

const connections = ref<ConnectionDto[]>([])
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
/* Component-specific only — shared primitives from assets/shared.css */

.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 500px) { .field-row { grid-template-columns: 1fr; } }

.source-selector { display: flex; flex-direction: column; gap: 7px; }
.pills { display: flex; gap: 6px; flex-wrap: wrap; }

.sub-form { padding-top: 4px; border-top: 1px solid var(--border); }

.sub-via { font-weight: 400; color: var(--text-2); }

/* Event badge colours */
.event-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
}

.badge-token { color: #5ac89e; background: color-mix(in srgb, #5ac89e 10%, transparent); border: 1px solid color-mix(in srgb, #5ac89e 22%, transparent); }

[data-event="new_release"]        { color: #c8a97e; background: color-mix(in srgb, #c8a97e 10%, transparent); border: 1px solid color-mix(in srgb, #c8a97e 22%, transparent); }
[data-event="new_commit"]         { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 10%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 22%, transparent); }
[data-event="new_branch"]         { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 10%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 22%, transparent); }
[data-event="new_tag"]            { color: #a0c4a0; background: color-mix(in srgb, #a0c4a0 10%, transparent); border: 1px solid color-mix(in srgb, #a0c4a0 22%, transparent); }
[data-event="issue_opened"]       { color: #e8956d; background: color-mix(in srgb, #e8956d 10%, transparent); border: 1px solid color-mix(in srgb, #e8956d 22%, transparent); }
[data-event="issue_closed"]       { color: #5ac89e; background: color-mix(in srgb, #5ac89e 10%, transparent); border: 1px solid color-mix(in srgb, #5ac89e 22%, transparent); }
[data-event="pr_opened"]          { color: #8b9ef0; background: color-mix(in srgb, #8b9ef0 10%, transparent); border: 1px solid color-mix(in srgb, #8b9ef0 22%, transparent); }
[data-event="pr_merged"]          { color: #b57df0; background: color-mix(in srgb, #b57df0 10%, transparent); border: 1px solid color-mix(in srgb, #b57df0 22%, transparent); }
[data-event="workflow_completed"] { color: #6eb8e8; background: color-mix(in srgb, #6eb8e8 10%, transparent); border: 1px solid color-mix(in srgb, #6eb8e8 22%, transparent); }
[data-event="star_milestone"]     { color: #e8d06d; background: color-mix(in srgb, #e8d06d 10%, transparent); border: 1px solid color-mix(in srgb, #e8d06d 22%, transparent); }
[data-event="fork_milestone"]     { color: #e8d06d; background: color-mix(in srgb, #e8d06d 10%, transparent); border: 1px solid color-mix(in srgb, #e8d06d 22%, transparent); }
</style>

<template>
  <div class="dashboard">
    <div class="ambient" aria-hidden="true">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="grid-overlay"></div>
    </div>

    <header class="topbar">
      <div class="topbar-brand">
        <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
          <polygon points="26,4 48,42 4,42" stroke="#c8a97e" stroke-width="1.5" fill="none"/>
          <polygon points="26,48 4,10 48,10" stroke="#c8a97e" stroke-width="1.5" fill="none" opacity="0.45"/>
          <circle cx="26" cy="26" r="3" fill="#c8a97e" opacity="0.8"/>
        </svg>
        <span class="brand-text">EDAE</span>
      </div>
      <div class="topbar-user">
        <span class="topbar-name">{{ user?.name }}</span>
        <button class="btn-logout" @click="handleLogout" :disabled="loggingOut">
          <LogoutIcon />
          <span>{{ loggingOut ? 'Signing out…' : 'Sign out' }}</span>
        </button>
      </div>
    </header>

    <div class="layout">
      <!-- Sidebar nav -->
      <nav class="sidebar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="nav-item"
          :class="{ active: currentTab === tab.id, danger: tab.id === 'danger' }"
          @click="currentTab = tab.id"
        >
          <component :is="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Content -->
      <main class="content">

        <!-- ── Profile Tab ── -->
        <section v-if="currentTab === 'profile'" class="tab-section" key="profile">
          <div class="section-header">
            <h2 class="section-title">Profile</h2>
            <p class="section-sub">Your personal information.</p>
          </div>

          <div class="profile-card">
            <div class="card-top">
              <div class="avatar">
                <span class="avatar-initials">{{ initials }}</span>
                <div class="avatar-ring"></div>
              </div>
              <div class="card-meta">
                <div class="card-name">{{ user?.name }}</div>
                <div class="card-badge" :class="user?.is_verified ? 'verified' : 'pending'">
                  <span class="badge-dot"></span>
                  {{ user?.is_verified ? 'Verified' : 'Unverified' }}
                </div>
              </div>
            </div>
            <div class="card-divider"></div>
            <div class="card-fields">
              <div class="card-field">
                <span class="field-label">Email</span>
                <span class="field-value">{{ user?.email }}</span>
              </div>
              <div class="card-field">
                <span class="field-label">Member since</span>
                <span class="field-value">{{ formatDate(user?.created_at) }}</span>
              </div>
              <div class="card-field">
                <span class="field-label">Last updated</span>
                <span class="field-value">{{ formatDate(user?.updated_at) }}</span>
              </div>
              <div class="card-field span-2">
                <span class="field-label">User ID</span>
                <span class="field-value field-id">{{ user?.id }}</span>
              </div>
            </div>
          </div>

          <!-- Edit name -->
          <div class="settings-block">
            <div class="block-header">
              <div>
                <div class="block-title">Display name</div>
                <div class="block-desc">Update how your name appears to others.</div>
              </div>
              <button v-if="!editingName" class="btn-ghost" @click="editingName = true; newName = user?.name ?? ''">
                Edit
              </button>
            </div>
            <form v-if="editingName" @submit.prevent="handleUpdateName" class="inline-form">
              <div class="float-field" :class="{ active: nameFocused || newName }">
                <input
                  id="newName"
                  v-model="newName"
                  type="text"
                  autocomplete="name"
                  @focus="nameFocused = true"
                  @blur="nameFocused = false"
                  ref="nameInput"
                />
                <label for="newName">Full name</label>
              </div>
              <div v-if="nameError" class="inline-error">{{ nameError }}</div>
              <div v-if="nameSuccess" class="inline-success">{{ nameSuccess }}</div>
              <div class="inline-actions">
                <button type="button" class="btn-ghost" @click="editingName = false">Cancel</button>
                <button type="submit" class="btn-primary-sm" :disabled="nameLoading">
                  <span v-if="nameLoading" class="btn-loading"><span></span><span></span><span></span></span>
                  <span v-else>Save</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- ── Security Tab ── -->
        <section v-else-if="currentTab === 'security'" class="tab-section" key="security">
          <div class="section-header">
            <h2 class="section-title">Security</h2>
            <p class="section-sub">Manage your password and email address.</p>
          </div>

          <!-- Change password -->
          <div class="settings-block">
            <div class="block-header">
              <div>
                <div class="block-title">Password</div>
                <div class="block-desc">Change your account password.</div>
              </div>
              <button v-if="!editingPassword" class="btn-ghost" @click="editingPassword = true">
                Change
              </button>
            </div>
            <form v-if="editingPassword" @submit.prevent="handleChangePassword" class="inline-form">
              <input type="hidden" autocomplete="username" :value="user?.email" />
              <div class="float-field" :class="{ active: oldPassFocused || oldPassword }">
                <input
                  id="oldPassword"
                  v-model="oldPassword"
                  :type="showOldPass ? 'text' : 'password'"
                  autocomplete="current-password"
                  @focus="oldPassFocused = true"
                  @blur="oldPassFocused = false"
                />
                <label for="oldPassword">Current password</label>
                <button type="button" class="field-toggle" @click="showOldPass = !showOldPass" tabindex="-1">
                  <component :is="showOldPass ? EyeOffIcon : EyeIcon" />
                </button>
              </div>
              <div class="float-field" :class="{ active: newPassFocused || newPassword }">
                <input
                  id="newPasswordSec"
                  v-model="newPassword"
                  :type="showNewPass ? 'text' : 'password'"
                  autocomplete="new-password"
                  @focus="newPassFocused = true"
                  @blur="newPassFocused = false"
                />
                <label for="newPasswordSec">New password</label>
                <button type="button" class="field-toggle" @click="showNewPass = !showNewPass" tabindex="-1">
                  <component :is="showNewPass ? EyeOffIcon : EyeIcon" />
                </button>
              </div>
              <div v-if="passwordError" class="inline-error">{{ passwordError }}</div>
              <div v-if="passwordSuccess" class="inline-success">{{ passwordSuccess }}</div>
              <div class="inline-actions">
                <button type="button" class="btn-ghost" @click="editingPassword = false; resetPasswordForm()">Cancel</button>
                <button type="submit" class="btn-primary-sm" :disabled="passwordLoading">
                  <span v-if="passwordLoading" class="btn-loading"><span></span><span></span><span></span></span>
                  <span v-else>Update</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Change email -->
          <div class="settings-block">
            <div class="block-header">
              <div>
                <div class="block-title">Email address</div>
                <div class="block-desc">Current: <span class="accent">{{ user?.email }}</span></div>
              </div>
              <button v-if="emailStep === 'idle'" class="btn-ghost" @click="emailStep = 'request'">
                Change
              </button>
            </div>

            <!-- Step 1: enter new email -->
            <form v-if="emailStep === 'request'" @submit.prevent="handleRequestEmailChange" class="inline-form">
              <div class="float-field" :class="{ active: newEmailFocused || newEmail }">
                <input
                  id="newEmail"
                  v-model="newEmail"
                  type="email"
                  autocomplete="email"
                  @focus="newEmailFocused = true"
                  @blur="newEmailFocused = false"
                />
                <label for="newEmail">New email address</label>
              </div>
              <div v-if="emailError" class="inline-error">{{ emailError }}</div>
              <div class="inline-actions">
                <button type="button" class="btn-ghost" @click="emailStep = 'idle'">Cancel</button>
                <button type="submit" class="btn-primary-sm" :disabled="emailLoading">
                  <span v-if="emailLoading" class="btn-loading"><span></span><span></span><span></span></span>
                  <span v-else>Send Code</span>
                </button>
              </div>
            </form>

            <!-- Step 2: enter OTP -->
            <div v-else-if="emailStep === 'confirm'" class="inline-form">
              <p class="step-hint">Enter the verification code sent to <strong class="accent">{{ newEmail }}</strong></p>
              <div class="otp-section">
                <OtpInput v-model="emailOtp" />
              </div>
              <div v-if="emailError" class="inline-error">{{ emailError }}</div>
              <div v-if="emailSuccess" class="inline-success">{{ emailSuccess }}</div>
              <div class="inline-actions">
                <button type="button" class="btn-ghost" @click="emailStep = 'request'">Back</button>
                <button type="button" class="btn-primary-sm" :disabled="emailLoading || emailOtp.length < 6" @click="handleConfirmEmailChange">
                  <span v-if="emailLoading" class="btn-loading"><span></span><span></span><span></span></span>
                  <span v-else>Verify</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Danger Tab ── -->
        <section v-else-if="currentTab === 'danger'" class="tab-section" key="danger">
          <div class="section-header">
            <h2 class="section-title danger-title">Danger Zone</h2>
            <p class="section-sub">Irreversible actions. Proceed with caution.</p>
          </div>

          <div class="settings-block danger-block">
            <div class="block-header">
              <div>
                <div class="block-title">Delete account</div>
                <div class="block-desc">Permanently remove your account and all associated data. This cannot be undone.</div>
              </div>
            </div>

            <div v-if="deletionStep === 'idle'" class="inline-actions">
              <button class="btn-danger" @click="handleRequestDeletion" :disabled="deletionLoading">
                <span v-if="deletionLoading" class="btn-loading danger-loading"><span></span><span></span><span></span></span>
                <span v-else>Request Deletion</span>
              </button>
            </div>

            <div v-else-if="deletionStep === 'confirm'" class="inline-form">
              <p class="step-hint danger-hint">A confirmation code has been sent to your email. Enter it below to permanently delete your account.</p>
              <div class="otp-section">
                <OtpInput v-model="deletionOtp" />
              </div>
              <div v-if="deletionError" class="inline-error">{{ deletionError }}</div>
              <div class="inline-actions">
                <button type="button" class="btn-ghost" @click="deletionStep = 'idle'">Cancel</button>
                <button type="button" class="btn-danger" :disabled="deletionLoading || deletionOtp.length < 6" @click="handleConfirmDeletion">
                  <span v-if="deletionLoading" class="btn-loading danger-loading"><span></span><span></span><span></span></span>
                  <span v-else>Confirm Deletion</span>
                </button>
              </div>
            </div>

            <div v-if="deletionError && deletionStep === 'idle'" class="inline-error">{{ deletionError }}</div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import OtpInput from '../components/OtpInput.vue'
import * as userApi from '../api/user'

type Tab = 'profile' | 'security' | 'danger'
type EmailStep = 'idle' | 'request' | 'confirm'
type DeletionStep = 'idle' | 'confirm'

const router = useRouter()
const auth = useAuthStore()
const loggingOut = ref(false)
const currentTab = ref<Tab>('profile')

const user = computed(() => auth.user)

const initials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))
}

async function handleLogout() {
  loggingOut.value = true
  await auth.logout()
  router.push('/auth/login')
}

// ── Profile / name ──
const editingName = ref(false)
const newName = ref('')
const nameFocused = ref(false)
const nameLoading = ref(false)
const nameError = ref('')
const nameSuccess = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

async function handleUpdateName() {
  nameError.value = ''
  nameSuccess.value = ''
  if (!newName.value.trim()) { nameError.value = 'Name cannot be empty'; return }
  nameLoading.value = true
  try {
    const { user: updated } = await userApi.updateName(newName.value.trim())
    auth.updateUser(updated)
    nameSuccess.value = 'Name updated.'
    setTimeout(() => { editingName.value = false; nameSuccess.value = '' }, 1200)
  } catch (e) {
    nameError.value = (e as Error).message
  } finally {
    nameLoading.value = false
  }
}

// ── Security / password ──
const editingPassword = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const oldPassFocused = ref(false)
const newPassFocused = ref(false)
const showOldPass = ref(false)
const showNewPass = ref(false)
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

function resetPasswordForm() {
  oldPassword.value = ''
  newPassword.value = ''
  passwordError.value = ''
  passwordSuccess.value = ''
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (!oldPassword.value || !newPassword.value) { passwordError.value = 'Both fields are required'; return }
  passwordLoading.value = true
  try {
    await userApi.changePassword(oldPassword.value, newPassword.value)
    passwordSuccess.value = 'Password changed.'
    resetPasswordForm()
    setTimeout(() => { editingPassword.value = false; passwordSuccess.value = '' }, 1200)
  } catch (e) {
    passwordError.value = (e as Error).message
  } finally {
    passwordLoading.value = false
  }
}

// ── Security / email change ──
const emailStep = ref<EmailStep>('idle')
const newEmail = ref('')
const newEmailFocused = ref(false)
const emailOtp = ref('')
const emailLoading = ref(false)
const emailError = ref('')
const emailSuccess = ref('')

async function handleRequestEmailChange() {
  emailError.value = ''
  if (!newEmail.value) return
  emailLoading.value = true
  try {
    await userApi.requestEmailChange(newEmail.value)
    emailStep.value = 'confirm'
  } catch (e) {
    emailError.value = (e as Error).message
  } finally {
    emailLoading.value = false
  }
}

async function handleConfirmEmailChange() {
  if (emailOtp.value.length < 6) return
  emailError.value = ''
  emailLoading.value = true
  try {
    const { user: updated } = await userApi.confirmEmailChange(emailOtp.value)
    auth.updateUser(updated)
    emailSuccess.value = 'Email updated.'
    setTimeout(() => {
      emailStep.value = 'idle'
      newEmail.value = ''
      emailOtp.value = ''
      emailSuccess.value = ''
    }, 1400)
  } catch (e) {
    emailError.value = (e as Error).message
    emailOtp.value = ''
  } finally {
    emailLoading.value = false
  }
}

// ── Danger / account deletion ──
const deletionStep = ref<DeletionStep>('idle')
const deletionOtp = ref('')
const deletionLoading = ref(false)
const deletionError = ref('')

async function handleRequestDeletion() {
  deletionError.value = ''
  deletionLoading.value = true
  try {
    await userApi.requestAccountDeletion()
    deletionStep.value = 'confirm'
  } catch (e) {
    deletionError.value = (e as Error).message
  } finally {
    deletionLoading.value = false
  }
}

async function handleConfirmDeletion() {
  if (deletionOtp.value.length < 6) return
  deletionError.value = ''
  deletionLoading.value = true
  try {
    await userApi.confirmAccountDeletion(deletionOtp.value)
    await auth.logout()
    router.push('/auth/login')
  } catch (e) {
    deletionError.value = (e as Error).message
    deletionOtp.value = ''
  } finally {
    deletionLoading.value = false
  }
}

// ── Tab icons ──
const ProfileIcon = { template: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>` }
const SecurityIcon = { template: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` }
const DangerIcon   = { template: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 20 2 20"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>` }
const LogoutIcon   = { template: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>` }
const EyeIcon      = { template: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` }
const EyeOffIcon   = { template: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>` }

const tabs = [
  { id: 'profile' as Tab, label: 'Profile', icon: ProfileIcon },
  { id: 'security' as Tab, label: 'Security', icon: SecurityIcon },
  { id: 'danger' as Tab, label: 'Danger Zone', icon: DangerIcon },
]

// Focus name input when editing opens
async function openEditName() {
  editingName.value = true
  newName.value = user.value?.name ?? ''
  await nextTick()
  nameInput.value?.focus()
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Ambient */
.ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.ambient-orb { position: absolute; border-radius: 50%; filter: blur(80px); }
.orb-1 { width: 600px; height: 400px; top: -100px; left: -100px; background: radial-gradient(ellipse, rgba(200,169,126,0.05) 0%, transparent 70%); animation: orbFloat 14s ease-in-out infinite; }
.orb-2 { width: 500px; height: 500px; bottom: -150px; right: -100px; background: radial-gradient(ellipse, rgba(100,80,180,0.04) 0%, transparent 70%); animation: orbFloat 18s ease-in-out infinite reverse; }
.grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(200,169,126,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,126,0.02) 1px, transparent 1px); background-size: 60px 60px; }

/* Topbar */
.topbar {
  position: relative; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 40px;
  border-bottom: 1px solid var(--border);
  background: rgba(7, 7, 15, 0.75);
  backdrop-filter: blur(20px);
  animation: fadeDown 0.5s ease both;
}

.topbar-brand { display: flex; align-items: center; gap: 10px; filter: drop-shadow(0 0 8px rgba(200,169,126,0.2)); }
.brand-text { font-family: var(--font-display); font-size: 11px; font-weight: 600; letter-spacing: 0.4em; text-transform: uppercase; color: var(--accent); }

.topbar-user { display: flex; align-items: center; gap: 16px; }
.topbar-name { font-size: 13px; color: var(--text-2); }

.btn-logout {
  display: flex; align-items: center; gap: 8px;
  background: none; border: 1px solid var(--border); color: var(--text-2);
  font-family: var(--font-ui); font-size: 12px; font-weight: 500; letter-spacing: 0.06em;
  padding: 7px 14px; border-radius: 3px; cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.btn-logout:hover:not(:disabled) { color: var(--text); border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
.btn-logout:disabled { opacity: 0.5; cursor: not-allowed; }

/* Layout */
.layout {
  position: relative; z-index: 1;
  display: flex; flex: 1;
  max-width: 1100px; margin: 0 auto; width: 100%;
  padding: 40px 24px;
  gap: 40px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

@media (max-width: 700px) {
  .layout { flex-direction: column; gap: 0; padding: 0; }
}

/* Sidebar */
.sidebar {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}

@media (max-width: 700px) {
  .sidebar {
    flex-direction: row;
    flex: none;
    border-bottom: 1px solid var(--border);
    padding: 0;
    gap: 0;
  }
}

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  border: none; background: none; cursor: pointer;
  font-family: var(--font-ui); font-size: 13px; font-weight: 500;
  color: var(--text-2);
  text-align: left;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.nav-item:hover { color: var(--text); background: rgba(255,255,255,0.04); }
.nav-item.active { color: var(--accent); background: var(--accent-dim); }
.nav-item.danger { color: rgba(224, 96, 96, 0.7); }
.nav-item.danger:hover { color: var(--error); background: rgba(224,96,96,0.08); }
.nav-item.danger.active { color: var(--error); background: rgba(224,96,96,0.1); }

@media (max-width: 700px) {
  .nav-item { flex: 1; justify-content: center; border-radius: 0; padding: 12px 8px; font-size: 12px; }
  .nav-item span { display: none; }
}

/* Content */
.content { flex: 1; min-width: 0; }

@media (max-width: 700px) {
  .content { padding: 24px 16px; }
}

.tab-section { display: flex; flex-direction: column; gap: 28px; animation: fadeSlideUp 0.35s ease both; }

.section-header { margin-bottom: 4px; }
.section-title { font-family: var(--font-display); font-size: 28px; font-weight: 400; color: var(--text); letter-spacing: -0.01em; margin-bottom: 4px; }
.section-sub { font-size: 13px; color: var(--text-2); }
.danger-title { color: var(--error); }

/* Profile card */
.profile-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px;
  position: relative; overflow: hidden;
}
.profile-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(200,169,126,0.25), transparent); }

.card-top { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; }
.avatar { position: relative; }
.avatar-initials {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--accent-dim); border: 1px solid var(--border-accent);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 18px; font-weight: 500; color: var(--accent);
  line-height: 52px; text-align: center;
  display: block;
}
.avatar-ring { position: absolute; inset: -3px; border-radius: 50%; border: 1px solid rgba(200,169,126,0.18); }
.card-name { font-family: var(--font-display); font-size: 20px; font-weight: 400; color: var(--text); margin-bottom: 5px; }
.card-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 9px; border-radius: 100px; }
.card-badge.verified { background: rgba(90,201,136,0.1); color: var(--success); border: 1px solid rgba(90,201,136,0.2); }
.card-badge.pending { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--border-accent); }
.badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.card-divider { height: 1px; background: var(--border); margin-bottom: 20px; }
.card-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; }
.span-2 { grid-column: span 2; }
.card-field { display: flex; flex-direction: column; gap: 3px; }
.field-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.field-value { font-size: 14px; color: var(--text); }
.field-id { font-family: 'Courier New', monospace; font-size: 11px; color: var(--text-2); word-break: break-all; }

/* Settings blocks */
.settings-block {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 22px 24px;
  display: flex; flex-direction: column; gap: 16px;
}

.danger-block { border-color: rgba(224,96,96,0.2); background: rgba(224,96,96,0.03); }

.block-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.block-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.block-desc { font-size: 13px; color: var(--text-2); line-height: 1.5; }

/* Floating field (inline) */
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

.field-toggle {
  position: absolute; right: 0; top: 50%; transform: translateY(-25%);
  background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px;
  display: flex; align-items: center; transition: color 0.2s;
}
.field-toggle:hover { color: var(--text-2); }

.inline-actions { display: flex; gap: 10px; justify-content: flex-end; }
.inline-error { font-size: 12px; color: var(--error); padding: 6px 10px; background: rgba(224,96,96,0.08); border-radius: 3px; animation: shake 0.3s ease; }
.inline-success { font-size: 12px; color: var(--success); padding: 6px 10px; background: rgba(90,201,136,0.08); border-radius: 3px; }

.step-hint { font-size: 13px; color: var(--text-2); line-height: 1.5; }
.danger-hint { color: rgba(224, 96, 96, 0.8); }
.accent { color: var(--accent); }

.otp-section { padding: 8px 0; }

/* Buttons */
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

.btn-danger {
  background: rgba(224,96,96,0.12); color: var(--error); border: 1px solid rgba(224,96,96,0.25);
  font-family: var(--font-ui); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 8px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; gap: 6px; min-width: 150px; justify-content: center;
}
.btn-danger:hover:not(:disabled) { background: rgba(224,96,96,0.2); border-color: rgba(224,96,96,0.4); }
.btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-loading { display: flex; gap: 4px; align-items: center; }
.btn-loading span { width: 4px; height: 4px; border-radius: 50%; background: #1a1205; animation: bounce 0.9s infinite ease-in-out; }
.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }
.danger-loading span { background: var(--error); }

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes orbFloat { 0%, 100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,30px) scale(0.95); } }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
</style>

<template>
  <AuthLayout>
    <div class="auth-form">
      <div class="form-header">
        <h1 class="form-title">Create account</h1>
        <p class="form-sub">Join and get started in minutes.</p>
      </div>

      <form @submit.prevent="handleRegister" novalidate>
        <div class="field-group">
          <div class="float-field" :class="{ active: nameFocused || name, error: fieldErrors.name }">
            <input
              id="name"
              v-model="name"
              type="text"
              autocomplete="name"
              @focus="nameFocused = true"
              @blur="nameFocused = false"
            />
            <label for="name">Full name</label>
          </div>

          <div class="float-field" :class="{ active: emailFocused || email, error: fieldErrors.email }">
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              @focus="emailFocused = true"
              @blur="emailFocused = false"
            />
            <label for="email">Email address</label>
          </div>

          <div class="float-field" :class="{ active: passwordFocused || password, error: fieldErrors.password }">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
            />
            <label for="password">Password</label>
            <button type="button" class="field-toggle" @click="showPassword = !showPassword" tabindex="-1">
              <component :is="showPassword ? EyeOffIcon : EyeIcon" />
            </button>
          </div>
        </div>

        <div v-if="error" class="error-banner">
          <span class="error-icon">⚠</span> {{ error }}
        </div>

        <button class="btn-primary" type="submit" :disabled="loading">
          <span v-if="loading" class="btn-loading">
            <span></span><span></span><span></span>
          </span>
          <span v-else>Create Account</span>
        </button>
      </form>

      <div class="form-footer">
        <span class="footer-text">Already have an account?</span>
        <RouterLink to="/auth/login" class="footer-link">Sign in</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const nameFocused = ref(false)
const emailFocused = ref(false)
const passwordFocused = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!name.value.trim()) errors.name = 'Required'
  if (!email.value) errors.email = 'Required'
  if (!password.value) errors.password = 'Required'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleRegister() {
  error.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await auth.register(name.value.trim(), email.value, password.value)
    router.push('/auth/confirm')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

const EyeIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
}
const EyeOffIcon = {
  template: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
}
</script>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.form-header {
  animation: fadeSlideUp 0.5s ease both;
}

.form-title {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}

.form-sub {
  font-size: 13.5px;
  color: var(--text-2);
  font-weight: 400;
}

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.float-field {
  position: relative;
  padding-top: 18px;
  border-bottom: 1px solid var(--border);
  transition: border-color 0.2s;
}

.float-field + .float-field {
  margin-top: 4px;
}

.float-field input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 15px;
  padding: 8px 36px 8px 0;
  letter-spacing: 0.01em;
}

.float-field label {
  position: absolute;
  left: 0;
  top: 26px;
  font-family: var(--font-ui);
  font-size: 15px;
  color: var(--text-2);
  pointer-events: none;
  transition: top 0.2s ease, font-size 0.2s ease, color 0.2s ease, letter-spacing 0.2s ease;
}

.float-field.active label {
  top: 2px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.float-field:focus-within {
  border-bottom-color: var(--accent);
}

.float-field.error {
  border-bottom-color: var(--error);
}

.float-field.error.active label {
  color: var(--error);
}

.field-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-25%);
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.field-toggle:hover {
  color: var(--text-2);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(224, 96, 96, 0.08);
  border: 1px solid rgba(224, 96, 96, 0.2);
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--error);
  animation: shake 0.35s ease;
}

.error-icon { font-size: 12px; flex-shrink: 0; }

.btn-primary {
  width: 100%;
  padding: 14px;
  background: var(--accent);
  color: #1a1205;
  border: none;
  border-radius: 3px;
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.btn-primary:hover:not(:disabled) {
  background: #d9bb8e;
  box-shadow: 0 4px 20px rgba(200,169,126,0.3);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-loading {
  display: flex;
  gap: 5px;
  align-items: center;
}

.btn-loading span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1a1205;
  animation: bounce 0.9s infinite ease-in-out;
}

.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }

.form-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  animation: fadeSlideUp 0.5s 0.2s ease both;
}

.footer-text { font-size: 13px; color: var(--text-2); }

.footer-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: color 0.2s;
}

.footer-link:hover { color: var(--text); }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40%           { transform: scale(1.2); opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
</style>

<template>
  <AuthLayout>
    <div class="auth-form">
      <!-- Step 1: request -->
      <template v-if="step === 'request'">
        <div class="form-header">
          <h1 class="form-title">Reset password</h1>
          <p class="form-sub">Enter your email and we'll send a reset code.</p>
        </div>

        <form @submit.prevent="handleRequest" novalidate>
          <div class="float-field" :class="{ active: emailFocused || email }">
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

          <div v-if="error" class="error-banner">
            <span>⚠</span> {{ error }}
          </div>

          <button class="btn-primary" type="submit" :disabled="loading">
            <span v-if="loading" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Send Reset Code</span>
          </button>
        </form>

        <div class="form-footer">
          <RouterLink to="/auth/login" class="footer-link">Back to sign in</RouterLink>
        </div>
      </template>

      <!-- Step 2: confirm -->
      <template v-else-if="step === 'confirm'">
        <div class="form-header">
          <div class="envelope-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="10" width="32" height="22" rx="2" stroke="#c8a97e" stroke-width="1.2" fill="none"/>
              <path d="M4 12 L20 22 L36 12" stroke="#c8a97e" stroke-width="1.2" fill="none"/>
            </svg>
          </div>
          <h1 class="form-title">New password</h1>
          <p class="form-sub">Enter the code sent to <strong class="accent">{{ email }}</strong> and your new password.</p>
        </div>

        <form @submit.prevent="handleConfirm" novalidate>
          <div class="otp-section">
            <p class="otp-label">Verification code</p>
            <OtpInput v-model="otp" />
          </div>

          <div class="float-field" :class="{ active: passwordFocused || newPassword }">
            <input
              id="newPassword"
              v-model="newPassword"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
            />
            <label for="newPassword">New password</label>
            <button type="button" class="field-toggle" @click="showPassword = !showPassword" tabindex="-1">
              <component :is="showPassword ? EyeOffIcon : EyeIcon" />
            </button>
          </div>

          <div v-if="error" class="error-banner">
            <span>⚠</span> {{ error }}
          </div>

          <button class="btn-primary" type="submit" :disabled="loading || otp.length < 6 || !newPassword">
            <span v-if="loading" class="btn-loading"><span></span><span></span><span></span></span>
            <span v-else>Reset Password</span>
          </button>
        </form>

        <div class="form-footer">
          <button class="footer-link" type="button" @click="step = 'request'">Try different email</button>
        </div>
      </template>

      <!-- Step 3: success -->
      <template v-else>
        <div class="success-state">
          <div class="success-icon">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="20" stroke="#5ac988" stroke-width="1.5"/>
              <polyline points="13,22 19,28 31,16" stroke="#5ac988" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 class="form-title">Password reset</h1>
          <p class="form-sub">Your password has been updated. You can now sign in with your new credentials.</p>
          <RouterLink to="/auth/login" class="btn-primary" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:8px;">
            Sign In
          </RouterLink>
        </div>
      </template>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AuthLayout from '../components/AuthLayout.vue'
import OtpInput from '../components/OtpInput.vue'
import { requestPasswordReset, confirmPasswordReset } from '../api/auth'

type Step = 'request' | 'confirm' | 'done'

const step = ref<Step>('request')
const email = ref('')
const otp = ref('')
const newPassword = ref('')
const emailFocused = ref(false)
const passwordFocused = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function handleRequest() {
  if (!email.value) return
  error.value = ''
  loading.value = true
  try {
    await requestPasswordReset(email.value)
    step.value = 'confirm'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function handleConfirm() {
  if (otp.value.length < 6 || !newPassword.value) return
  error.value = ''
  loading.value = true
  try {
    await confirmPasswordReset(email.value, otp.value, newPassword.value)
    step.value = 'done'
  } catch (e) {
    error.value = (e as Error).message
    otp.value = ''
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeSlideUp 0.5s ease both;
}

.envelope-icon {
  filter: drop-shadow(0 0 12px rgba(200,169,126,0.3));
}

.form-title {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--text);
  letter-spacing: -0.01em;
}

.form-sub {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.6;
}

.accent { color: var(--accent); font-weight: 500; }

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

.otp-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.otp-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
}

.float-field {
  position: relative;
  padding-top: 18px;
  border-bottom: 1px solid var(--border);
  transition: border-color 0.2s;
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
}

.float-field label {
  position: absolute;
  left: 0;
  top: 26px;
  font-size: 15px;
  color: var(--text-2);
  pointer-events: none;
  transition: top 0.2s, font-size 0.2s, color 0.2s, letter-spacing 0.2s;
}

.float-field.active label {
  top: 2px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.float-field:focus-within { border-bottom-color: var(--accent); }

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

.field-toggle:hover { color: var(--text-2); }

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

.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-loading { display: flex; gap: 5px; align-items: center; }

.btn-loading span {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #1a1205;
  animation: bounce 0.9s infinite ease-in-out;
}

.btn-loading span:nth-child(2) { animation-delay: 0.15s; }
.btn-loading span:nth-child(3) { animation-delay: 0.3s; }

.form-footer {
  display: flex;
  justify-content: center;
  animation: fadeSlideUp 0.5s 0.2s ease both;
}

.footer-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-ui);
  transition: color 0.2s;
}

.footer-link:hover { color: var(--text); }

.success-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeSlideUp 0.5s ease both;
}

.success-icon {
  filter: drop-shadow(0 0 16px rgba(90,201,136,0.3));
}

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
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
</style>

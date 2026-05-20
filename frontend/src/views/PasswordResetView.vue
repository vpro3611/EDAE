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
            <span class="error-icon">⚠</span> {{ error }}
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

          <!-- Password strength -->
          <Transition name="strength">
            <div v-if="newPassword" class="password-strength">
              <div class="strength-segments">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="strength-seg"
                  :class="{ active: i <= strengthData.score }"
                  :style="{ background: i <= strengthData.score ? strengthData.color : undefined }"
                ></div>
              </div>
              <span class="strength-label" :style="{ color: strengthData.color }">
                {{ strengthData.label }}
              </span>
            </div>
          </Transition>

          <div v-if="error" class="error-banner">
            <span class="error-icon">⚠</span> {{ error }}
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
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="#5ac988" stroke-width="1.5"/>
              <circle cx="26" cy="26" r="18" stroke="rgba(90,201,136,0.2)" stroke-width="1"/>
              <polyline points="16,26 22,32 36,18" stroke="#5ac988" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
import { ref, computed } from 'vue'
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

const strengthData = computed(() => {
  const pw = newPassword.value
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const
  const colors = ['', '#e06060', '#d4943a', '#c8a97e', '#5ac988'] as const
  return { score: clamped, label: labels[clamped], color: colors[clamped] }
})

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
  filter: drop-shadow(0 0 14px rgba(200,169,126,0.35));
  animation: envelopePulse 3s ease-in-out infinite;
}

.form-title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--text);
  letter-spacing: -0.01em;
}

.form-sub { font-size: 13.5px; color: var(--text-2); line-height: 1.7; }

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

/* Password strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-segments { display: flex; gap: 4px; flex: 1; }

.strength-seg {
  flex: 1;
  height: 2px;
  border-radius: 1px;
  background: var(--border);
  transition: background 0.3s ease;
}

.strength-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  min-width: 38px;
  text-align: right;
  transition: color 0.3s;
  font-weight: 500;
}

.strength-enter-active { transition: opacity 0.25s, transform 0.25s; }
.strength-leave-active { transition: opacity 0.15s, transform 0.15s; }
.strength-enter-from  { opacity: 0; transform: translateY(-4px); }
.strength-leave-to    { opacity: 0; transform: translateY(-4px); }

/* Success state */
.success-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeSlideUp 0.5s ease both;
}

.success-icon {
  filter: drop-shadow(0 0 20px rgba(90, 201, 136, 0.35));
  animation: successPulse 2.5s ease-in-out infinite;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes envelopePulse {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(200,169,126,0.35)); }
  50%      { filter: drop-shadow(0 0 26px rgba(200,169,126,0.55)); }
}

@keyframes successPulse {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(90,201,136,0.35)); }
  50%      { filter: drop-shadow(0 0 32px rgba(90,201,136,0.6)); }
}
</style>

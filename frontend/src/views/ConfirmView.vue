<template>
  <AuthLayout>
    <div class="auth-form">
      <div class="form-header">
        <div class="envelope-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="10" width="32" height="22" rx="2" stroke="#c8a97e" stroke-width="1.2" fill="none"/>
            <path d="M4 12 L20 22 L36 12" stroke="#c8a97e" stroke-width="1.2" fill="none"/>
          </svg>
        </div>
        <h1 class="form-title">Check your email</h1>
        <p class="form-sub">
          We sent a verification code to<br>
          <strong class="email-hint">{{ displayEmail }}</strong>
        </p>
      </div>

      <form @submit.prevent="handleConfirm" novalidate>
        <div class="otp-section">
          <p class="otp-label">Enter 6-digit code</p>
          <OtpInput v-model="otp" />
        </div>

        <div v-if="error" class="error-banner">
          <span class="error-icon">⚠</span> {{ error }}
        </div>

        <button class="btn-primary" type="submit" :disabled="loading || otp.length < 6">
          <span v-if="loading" class="btn-loading">
            <span></span><span></span><span></span>
          </span>
          <span v-else>Verify & Continue</span>
        </button>
      </form>

      <div class="form-footer">
        <span class="footer-text">Wrong email?</span>
        <RouterLink to="/auth/register" class="footer-link">Go back</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'
import OtpInput from '../components/OtpInput.vue'

const router = useRouter()
const auth = useAuthStore()

const otp = ref('')
const loading = ref(false)
const error = ref('')

const displayEmail = computed(() => auth.pendingEmail ?? '')

async function handleConfirm() {
  if (otp.value.length < 6) return
  error.value = ''
  loading.value = true
  try {
    await auth.confirmRegistration(displayEmail.value, otp.value)
    router.push('/dashboard')
  } catch (e) {
    error.value = (e as Error).message
    otp.value = ''
  } finally {
    loading.value = false
  }
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.envelope-icon {
  filter: drop-shadow(0 0 14px rgba(200,169,126,0.3));
  margin-bottom: 4px;
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

.email-hint {
  color: var(--accent);
  font-weight: 500;
}

form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

.otp-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.otp-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-2);
  font-weight: 500;
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
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

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

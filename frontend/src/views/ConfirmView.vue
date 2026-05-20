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
          <strong class="accent">{{ displayEmail }}</strong>
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
          <span v-else>Verify &amp; Continue</span>
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
  filter: drop-shadow(0 0 18px rgba(200,169,126,0.35));
  margin-bottom: 4px;
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

.form-sub {
  font-size: 13.5px;
  color: var(--text-2);
  line-height: 1.7;
}

form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes envelopePulse {
  0%, 100% { filter: drop-shadow(0 0 18px rgba(200,169,126,0.35)); }
  50%      { filter: drop-shadow(0 0 30px rgba(200,169,126,0.55)); }
}
</style>

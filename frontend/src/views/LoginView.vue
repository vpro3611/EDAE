<template>
  <AuthLayout>
    <div class="auth-form">
      <div class="form-header">
        <h1 class="form-title">Welcome back</h1>
        <p class="form-sub">Sign in to continue your session.</p>
      </div>

      <form @submit.prevent="handleLogin" novalidate>
        <div class="field-group">
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
              autocomplete="current-password"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
            />
            <label for="password">Password</label>
            <button type="button" class="field-toggle" @click="showPassword = !showPassword" tabindex="-1">
              <EyeIcon v-if="!showPassword" />
              <EyeOffIcon v-else />
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
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="divider">
        <span class="divider-text">or</span>
      </div>

      <div class="google-section">
        <div v-if="googleError" class="error-banner">
          <span class="error-icon">⚠</span> {{ googleError }}
        </div>
        <button
          class="btn-google"
          type="button"
          @click="handleGoogleLogin"
          :disabled="!isGoogleReady || googleLoading"
        >
          <span v-if="googleLoading" class="btn-loading">
            <span></span><span></span><span></span>
          </span>
          <template v-else>
            <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </template>
        </button>
      </div>

      <div class="form-footer">
        <span class="footer-text">No account?</span>
        <RouterLink to="/auth/register" class="footer-link">Create one</RouterLink>
      </div>
      <div class="form-footer" style="margin-top: -20px;">
        <RouterLink to="/auth/reset-password" class="footer-link footer-link--muted">Forgot password?</RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCodeClient } from 'vue3-google-signin'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../components/AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const emailFocused = ref(false)
const passwordFocused = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})

const googleLoading = ref(false)
const googleError = ref('')

const { isReady: isGoogleReady, login: startGoogleLogin } = useCodeClient({
  onSuccess: async ({ code }) => {
    googleError.value = ''
    googleLoading.value = true
    try {
      await auth.googleLogin(code)
      router.push('/dashboard')
    } catch (e) {
      googleError.value = (e as Error).message
    } finally {
      googleLoading.value = false
    }
  },
  onError: () => {
    googleError.value = 'Google sign-in failed. Please try again.'
  },
})

function handleGoogleLogin() {
  googleError.value = ''
  startGoogleLogin()
}

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!email.value) errors.email = 'Required'
  if (!password.value) errors.password = 'Required'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleLogin() {
  error.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
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

.form-header { animation: fadeSlideUp 0.5s ease both; }

.form-title {
  font-family: var(--font-display);
  font-size: 40px;
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
  letter-spacing: 0.01em;
}

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

.field-group { display: flex; flex-direction: column; gap: 0; }

.google-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeSlideUp 0.5s 0.15s ease both;
}

/* Google button */
.btn-google {
  width: 100%;
  padding: 13px 16px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
}

.btn-google:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.18);
  transform: translateY(-1px);
}

.btn-google:active:not(:disabled) { transform: translateY(0); }
.btn-google:disabled { opacity: 0.5; cursor: not-allowed; }
.google-icon { flex-shrink: 0; }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>

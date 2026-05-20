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

        <!-- Password strength -->
        <Transition name="strength">
          <div v-if="password" class="password-strength">
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
import { ref, computed } from 'vue'
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

const strengthData = computed(() => {
  const pw = password.value
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

.form-sub { font-size: 13.5px; color: var(--text-2); font-weight: 400; }

form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeSlideUp 0.5s 0.1s ease both;
}

.field-group { display: flex; flex-direction: column; gap: 0; }

/* Password strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.strength-segments {
  display: flex;
  gap: 4px;
  flex: 1;
}

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

/* Strength transition */
.strength-enter-active { transition: opacity 0.25s, transform 0.25s; }
.strength-leave-active { transition: opacity 0.15s, transform 0.15s; }
.strength-enter-from  { opacity: 0; transform: translateY(-4px); }
.strength-leave-to    { opacity: 0; transform: translateY(-4px); }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>

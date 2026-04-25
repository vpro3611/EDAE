import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import * as authApi from '../api/auth'
import { syncToken, syncRefreshFn } from '../api/token'
import type { UserDtoForSelf } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserDtoForSelf | null>(null)
  const accessToken = ref<string | null>(null)
  const pendingEmail = ref<string | null>(sessionStorage.getItem('pendingEmail'))

  const isAuthenticated = computed(() => !!accessToken.value)

  // Keep the token bridge in sync whenever accessToken changes.
  watch(accessToken, (val) => syncToken(val))

  function setPendingEmail(email: string | null) {
    pendingEmail.value = email
    if (email) sessionStorage.setItem('pendingEmail', email)
    else sessionStorage.removeItem('pendingEmail')
  }

  function updateUser(updated: UserDtoForSelf) {
    user.value = updated
  }

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    accessToken.value = data.accessToken
    user.value = data.user
    return data
  }

  async function register(name: string, email: string, password: string) {
    await authApi.register(name, email, password)
    setPendingEmail(email)
  }

  async function confirmRegistration(email: string, otp: string) {
    const data = await authApi.confirmRegistration(email, otp)
    accessToken.value = data.accessToken
    user.value = data.user
    setPendingEmail(null)
    return data
  }

  async function refresh(): Promise<boolean> {
    try {
      const data = await authApi.refresh()
      accessToken.value = data.accessToken
      user.value = data.user
      return true
    } catch {
      accessToken.value = null
      user.value = null
      return false
    }
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    accessToken.value = null
    user.value = null
    setPendingEmail(null)
  }

  // Register the refresh function so the private API client can trigger it
  // on 401 without importing this store directly.
  syncRefreshFn(refresh)

  return {
    user,
    accessToken,
    pendingEmail,
    isAuthenticated,
    login,
    register,
    confirmRegistration,
    refresh,
    logout,
    setPendingEmail,
    updateUser,
  }
})

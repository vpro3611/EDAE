import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      return auth.isAuthenticated ? '/dashboard' : '/auth/login'
    },
  },
  {
    path: '/auth/login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/confirm',
    component: () => import('../views/ConfirmView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/reset-password',
    component: () => import('../views/PasswordResetView.vue'),
    meta: { guest: true },
  },
  {
    path: '/dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let booted = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!booted) {
    booted = true
    if (!auth.isAuthenticated) {
      await auth.refresh()
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/auth/login'
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return '/dashboard'
  }

  if (to.path === '/auth/confirm' && !auth.pendingEmail && !auth.isAuthenticated) {
    return '/auth/register'
  }
})

export default router

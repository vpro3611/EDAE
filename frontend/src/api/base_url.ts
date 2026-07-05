type ApiEnv = {
  DEV?: boolean
  PROD?: boolean
  VITE_API_BASE_URL?: string
}

const DEV_API_BASE_URL = 'http://localhost:3000'

export function resolveApiBaseUrl(env: ApiEnv): string {
  if (env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL
  }

  if (env.DEV) {
    return DEV_API_BASE_URL
  }

  throw new Error('VITE_API_BASE_URL is required in production')
}

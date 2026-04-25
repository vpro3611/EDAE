import axios, { type AxiosError } from 'axios'
import { getToken, callRefresh } from './token'

interface ApiErrorData {
  message?: string
  error?: string
  issues?: Array<{ message: string }>
}

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<ApiErrorData>).response?.data
    if (typeof data?.message === 'string') return data.message
    if (typeof data?.error === 'string') return data.error
    if (Array.isArray(data?.issues)) return data.issues.map(i => i.message).join(', ')
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

export async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export const publicApi = axios.create({ withCredentials: true })

export const privateApi = axios.create({ withCredentials: true })

privateApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

privateApi.interceptors.response.use(
  (response) => response,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && err.config) {
      const ok = await callRefresh()
      if (ok) {
        const token = getToken()
        err.config.headers = err.config.headers ?? {}
        err.config.headers.Authorization = `Bearer ${token}`
        return privateApi(err.config)
      }
    }
    return Promise.reject(err)
  },
)

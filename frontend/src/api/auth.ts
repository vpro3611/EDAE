import { publicApi, call } from './client'
import type { AuthResponse, MessageResponse } from '../types'

export async function login(email: string, password: string): Promise<AuthResponse> {
  return call(async () => {
    const { data } = await publicApi.post<AuthResponse>('/pub/auth/login', { email, password })
    return data
  })
}

export async function register(name: string, email: string, password: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await publicApi.post<MessageResponse>('/pub/auth/register', { name, email, password })
    return data
  })
}

export async function confirmRegistration(email: string, otp: string): Promise<AuthResponse> {
  return call(async () => {
    const { data } = await publicApi.post<AuthResponse>('/pub/auth/register/confirm', { email, otp })
    return data
  })
}

export async function refresh(): Promise<AuthResponse> {
  const { data } = await publicApi.post<AuthResponse>('/pub/auth/refresh')
  return data
}

export async function logout(): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await publicApi.post<MessageResponse>('/pub/auth/logout')
    return data
  })
}

export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await publicApi.post<MessageResponse>('/pub/user/password-reset', { email })
    return data
  })
}

export async function confirmPasswordReset(email: string, otp: string, newPassword: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await publicApi.post<MessageResponse>('/pub/user/password-reset/confirm', { email, otp, newPassword })
    return data
  })
}

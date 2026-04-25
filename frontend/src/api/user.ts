import { privateApi, call } from './client'
import type { UserDtoForSelf, UserDtoForOthers, MessageResponse } from '../types'

export async function getSelfProfile(): Promise<UserDtoForSelf> {
  return call(async () => {
    const { data } = await privateApi.get<UserDtoForSelf>('/protected/user/me')
    return data
  })
}

export async function getOtherProfile(targetId: string): Promise<UserDtoForOthers> {
  return call(async () => {
    const { data } = await privateApi.get<UserDtoForOthers>(`/protected/user/${targetId}`)
    return data
  })
}

export async function updateName(name: string): Promise<{ user: UserDtoForSelf }> {
  return call(async () => {
    const { data } = await privateApi.patch<{ user: UserDtoForSelf }>('/protected/user/name', { name })
    return data
  })
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await privateApi.patch<MessageResponse>('/protected/user/password', { oldPassword, newPassword })
    return data
  })
}

export async function requestEmailChange(newEmail: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await privateApi.post<MessageResponse>('/protected/user/email-change', { newEmail })
    return data
  })
}

export async function confirmEmailChange(otp: string): Promise<{ user: UserDtoForSelf }> {
  return call(async () => {
    const { data } = await privateApi.post<{ user: UserDtoForSelf }>('/protected/user/email-change/confirm', { otp })
    return data
  })
}

export async function requestAccountDeletion(): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await privateApi.post<MessageResponse>('/protected/user/account-deletion')
    return data
  })
}

export async function confirmAccountDeletion(otp: string): Promise<MessageResponse> {
  return call(async () => {
    const { data } = await privateApi.post<MessageResponse>('/protected/user/account-deletion/confirm', { otp })
    return data
  })
}

import { privateApi, call } from './client'
import type { ConnectionDto, ConnectionCredentials } from '../types'

export async function listActive(): Promise<ConnectionDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ connections: ConnectionDto[] }>('/protected/connections')
    return data.connections
  })
}

export async function listDeleted(): Promise<ConnectionDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ connections: ConnectionDto[] }>('/protected/connections/deleted')
    return data.connections
  })
}

export async function createConnection(name: string, credentials: ConnectionCredentials): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ connection: ConnectionDto }>('/protected/connections', { name, credentials })
    return data.connection
  })
}

export async function updateConnection(
  id: string,
  payload: { name?: string; credentials?: ConnectionCredentials },
): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.patch<{ connection: ConnectionDto }>(`/protected/connections/${id}`, payload)
    return data.connection
  })
}

export async function softDelete(id: string): Promise<void> {
  return call(async () => {
    await privateApi.delete(`/protected/connections/${id}`)
  })
}

export async function restore(id: string): Promise<ConnectionDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ connection: ConnectionDto }>(`/protected/connections/${id}/restore`)
    return data.connection
  })
}

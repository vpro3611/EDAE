import { privateApi, call } from './client'
import type { GithubSourceDto } from '../types'

const BASE = '/protected/github-sources'

export function listSources(): Promise<GithubSourceDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ sources: GithubSourceDto[] }>(BASE)
    return data.sources
  })
}

export function createSource(
  repo_owner: string,
  repo_name: string,
  access_token: string | null,
): Promise<GithubSourceDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ source: GithubSourceDto }>(BASE, {
      repo_owner,
      repo_name,
      access_token: access_token || undefined,
    })
    return data.source
  })
}

export function deleteSource(id: string): Promise<void> {
  return call(async () => {
    await privateApi.delete(`${BASE}/${id}`)
  })
}

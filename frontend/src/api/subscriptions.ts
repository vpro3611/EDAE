import { privateApi, call } from './client'
import type { SubscriptionDto, SubscriptionEventType } from '../types'

const BASE = '/protected/subscriptions'

export function listSubscriptions(source_id: string): Promise<SubscriptionDto[]> {
  return call(async () => {
    const { data } = await privateApi.get<{ subscriptions: SubscriptionDto[] }>(BASE, {
      params: { source_id },
    })
    return data.subscriptions
  })
}

export function createSubscription(payload: {
  github_source_id: string
  event_type: SubscriptionEventType
  connection_id: string
  message_template: string
  config?: Record<string, unknown>
}): Promise<SubscriptionDto> {
  return call(async () => {
    const { data } = await privateApi.post<{ subscription: SubscriptionDto }>(BASE, payload)
    return data.subscription
  })
}

export function deleteSubscription(id: string): Promise<void> {
  return call(async () => {
    await privateApi.delete(`${BASE}/${id}`)
  })
}

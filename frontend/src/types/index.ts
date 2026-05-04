export interface UserDtoForSelf {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
  is_verified: boolean
}

export interface UserDtoForOthers {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  accessToken: string
  user: UserDtoForSelf
}

export interface MessageResponse {
  message: string
}

export type TelegramCredentials = { provider: 'telegram'; bot_token: string; chat_id: string }
export type SlackCredentials    = { provider: 'slack'; webhook_url: string }
export type EmailCredentials    = { provider: 'email'; address: string }
export type ConnectionCredentials = TelegramCredentials | SlackCredentials | EmailCredentials

export interface ConnectionDto {
  id: string
  user_id: string
  provider: string
  name: string
  credentials: ConnectionCredentials
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface GithubSourceDto {
  id: string
  user_id: string
  repo_owner: string
  repo_name: string
  has_token: boolean
  created_at: string
  updated_at: string
}

export type SubscriptionEventType =
  | 'new_release' | 'new_commit' | 'new_branch' | 'new_tag'
  | 'issue_opened' | 'issue_closed' | 'pr_opened' | 'pr_merged'
  | 'workflow_completed' | 'star_milestone' | 'fork_milestone'

export interface SubscriptionDto {
  id: string
  github_source_id: string
  event_type: SubscriptionEventType
  connection_id: string
  message_template: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

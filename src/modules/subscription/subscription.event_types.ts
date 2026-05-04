export const SUBSCRIPTION_EVENT_TYPES = [
    'new_release',
    'new_commit',
    'new_branch',
    'new_tag',
    'issue_opened',
    'issue_closed',
    'pr_opened',
    'pr_merged',
    'workflow_completed',
    'star_milestone',
    'fork_milestone',
] as const;

export type SubscriptionEventType = typeof SUBSCRIPTION_EVENT_TYPES[number];

# GitHub Notifications Frontend Plan

**Goal:** Add a "GitHub" tab to the dashboard for managing sources and subscriptions.

## Steps

1. Add types (`GithubSourceDto`, `SubscriptionDto`) to `frontend/src/types/index.ts`
2. Create `frontend/src/api/github_sources.ts` (list, create, delete)
3. Create `frontend/src/api/subscriptions.ts` (list, create, delete)
4. Create `frontend/src/components/GithubNotificationsTab.vue` — two sections: Sources + Subscriptions, following ConnectionsTab pattern
5. Wire into `DashboardView.vue` — add tab entry + render component

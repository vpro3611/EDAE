# Feature Design: GitHub Event Notification System

## 1. Overview

The system will enable users to monitor GitHub repositories for specific events (e.g., new releases, pull requests, issues) and receive timely notifications. This involves configuring repositories, selecting event types, and choosing notification channels. The backend utilizes a polling mechanism to detect events, and a dispatcher to send notifications.

## 2. Backend Architecture

The backend implementation is largely in place, organized into several modules:

### 2.1. `github_source` Module
*   **Purpose:** Manages the configuration of GitHub repositories that the system will monitor.
*   **Key Components:** Uses use cases (`create.usecase.ts`, `list.usecase.ts`, `delete.usecase.ts`) to manage repository details such as `repoOwner`, `repoName`, and `accessToken`.

### 2.2. `subscription` Module
*   **Purpose:** Handles user subscriptions to specific GitHub events.
*   **Key Components:**
    *   Defines `SubscriptionEventType` (e.g., `new_release`, `pr_opened`, `issue_closed`).
    *   Uses use cases (`create.usecase.ts`, `list.usecase.ts`, `delete.usecase.ts`) to manage user subscriptions, linking them to specific repositories, event types, connection credentials, message templates, and configuration.

### 2.3. `notification` Module
*   **Purpose:** Dispatches notifications to various channels.
*   **Key Components:**
    *   `NotificationDispatcher`: Sends messages via Telegram, Slack, or Email using provided `ConnectionCredentials`.
    *   `notification.template`: Provides message templates that can be rendered with event-specific data. Pre-defined templates will be used for each event type.

### 2.4. `workers` Module (`github.poller.ts` and `github.poll.worker.ts`)
*   **Purpose:** Implements the core logic for detecting GitHub events.
*   **Mechanism:** A polling strategy using `@octokit/rest` to periodically check configured GitHub repositories for new events.
*   **Process:**
    1.  `GithubPollWorker` receives `SubscriptionWithSource` data, including repository details, event type, last seen state, and connection credentials.
    2.  It uses `GithubPollerService` to call the appropriate polling function based on the `event_type`.
    3.  If new events are detected, `GithubPollerService` returns event data and an updated `lastSeen` state.
    4.  The `GithubPollWorker` updates the `lastSeen` state in the database.
    5.  It then retrieves user connection credentials.
    6.  For each new event, it renders a pre-defined message template using the event data.
    7.  Finally, it dispatches the notification using the `NotificationDispatcher`.

## 3. Frontend Implementation

The user interface for managing this feature will be handled by a dedicated "frontend skill," as per the user's instruction. This UI will be responsible for:

*   Allowing users to add and manage GitHub repositories they wish to monitor.
*   Providing a clear interface for users to select which GitHub events they want to receive notifications for from their monitored repositories.
*   Enabling users to configure their notification preferences, including selecting preferred notification channels (Telegram, Slack, Email) and managing the necessary connection credentials.
*   Potentially displaying a history or log of received notifications.

## 4. Data Flow Summary

1.  **Configuration:** User configures GitHub repositories and selects desired event types, notification channels, and credentials via the frontend. This data is stored in the backend.
2.  **Polling:** The `GithubPollWorker` periodically polls configured GitHub repositories for subscribed event types using the `GithubPollerService`.
3.  **Event Detection:** New events are detected by comparing the current state with the `lastSeen` state.
4.  **Notification Generation:** For detected events, `GithubPollerService` formats event data. The `GithubPollWorker` then uses this data with pre-defined `message_template`s to create notification messages.
5.  **Dispatch:** The `NotificationDispatcher` sends the formatted messages to the user's chosen notification channels.

## 5. Error Handling and Resilience

*   **Polling Failures:** Errors during GitHub API polling will be logged, and the system may implement retry mechanisms or exponential backoff for API requests to handle transient issues and respect rate limits.
*   **Dispatching Failures:** Failures in sending notifications (e.g., invalid credentials, channel API errors) will be logged and potentially surfaced to the user.
*   **Rate Limiting:** Considerations will be made for GitHub API rate limits, potentially influencing polling frequency or batching strategies.

## 6. Success Criteria

*   Users can successfully configure repositories and subscribe to desired GitHub events.
*   Notifications are reliably sent for detected GitHub events through the user's chosen channels.
*   The system is robust and handles API errors or connection issues gracefully.

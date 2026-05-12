# Design Doc: Google OAuth 2.0 Integration

## 1. Overview
Integrate Google OAuth 2.0 authentication into EDAE using the Authorization Code Flow. This allows users to sign in or register using their Google accounts, providing a seamless and secure alternative to traditional email/password login.

## 2. Architecture

### 2.1 Database Changes
We will move towards a multi-provider architecture by introducing a separate table for external logins and making the password field optional.

#### New Table: `user_external_logins`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() |
| `user_id` | `uuid` | FK (users.id), NOT NULL, ON DELETE CASCADE |
| `provider` | `varchar(50)` | NOT NULL (e.g., 'google') |
| `external_id` | `varchar(255)` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() |

*   **Indexes:** Unique constraint on `(provider, external_id)`.

#### Table: `users` (Modified)
*   `password_hashed`: Change to `NULLABLE`.

### 2.2 Sequence Diagram (Auth Code Flow)
1.  **Frontend:** User clicks "Login with Google".
2.  **Frontend:** Redirects to Google OAuth screen (`response_type=code`).
3.  **Google:** User authenticates and redirects back to Frontend with `code`.
4.  **Frontend:** Calls `POST /pub/auth/google { code }`.
5.  **Backend:**
    *   Exchanges `code` for Google `id_token` and `access_token`.
    *   Verifies `id_token` and extracts `sub` (Google ID), `email`, and `name`.
    *   Checks `user_external_logins` for `(provider='google', external_id=sub)`.
    *   If not found, checks `users` for `email`.
        *   If email exists: Link account (create `user_external_logins` entry).
        *   If email doesn't exist: Create new user (mark `is_verified=true`) and link.
    *   Generates standard App Access/Refresh tokens.
6.  **Backend:** Returns `AuthResponse` (user info + tokens).
7.  **Frontend:** Stores tokens and redirects to Dashboard.

## 3. Implementation Details

### 3.1 Backend (Node.js/Express)
*   **Library:** `google-auth-library`.
*   **Module:** New `GoogleAuthUseCase` in `src/modules/authentification`.
*   **Controller:** New `GoogleAuthController` in `src/modules/authentification/controllers`.
*   **Repository:** Update `RepositoryUserReader` and `RepositoryUserWriter` (or create `RepositoryExternalLogin`).

### 3.2 Frontend (Vue.js)
*   **API:** New `googleLogin(code: string)` in `frontend/src/api/auth.ts`.
*   **Component:** Update `LoginView.vue` with Google Sign-In button.
*   **Configuration:** Add `VITE_GOOGLE_CLIENT_ID` to `.env`.

## 4. Error Handling
*   `INVALID_GOOGLE_CODE`: Return 400 if Google rejects the code.
*   `EMAIL_TAKEN_UNLINKED`: (Handled by automatic linking, but should be logged).
*   `GOOGLE_API_ERROR`: Return 502 if Google services are unreachable.

## 5. Security Considerations
*   **State Parameter:** Use `state` to prevent CSRF during OAuth redirect.
*   **Token Verification:** Always verify `id_token` on the backend using the Google Public Keys.
*   **Secrets:** `GOOGLE_CLIENT_SECRET` must stay only on the backend.

## 6. Testing Strategy
*   **Unit Tests:** Test `GoogleAuthUseCase` with mocked Google API responses.
*   **Integration Tests:** Test the database linking logic (already existing user vs. new user).
*   **Manual Testing:** End-to-end flow from the browser.

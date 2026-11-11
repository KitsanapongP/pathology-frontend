# Browser session

The agreed storage policy is refresh token in `sessionStorage`, access token in
memory. Reload restores access by `POST /v1/auth/refresh` with `{ refresh_token }`.
Only the versioned `pathology:session:v1` entry is removed on session clear;
preferences, fixtures and IndexedDB drafts/audio are preserved. The stored entry
also contains refresh expiry and the mandatory-password-change flag. Storage
blocked by browser policy falls back to memory for that tab (reload signs out).
sessionStorage is JavaScript-readable and does not protect tokens from XSS. Tabs
have independent sessions; a newly opened tab may inherit a copy from its opener,
so rotation across cloned tabs depends on backend policy. No cross-tab promise
or globally synchronized logout is claimed.

`portalSession.accept(tokens, requestStartedAt)` is the login handoff. Tokens are
`access_token`, `refresh_token`, `token_type` (Bearer), `expires_in` and
`refresh_expires_in` in seconds. Login must also supply boolean
`must_change_password`. Refresh uses the same token fields; if it omits the flag,
the current restriction is preserved. Refresh never releases an existing password
restriction, even if it returns false. Only password-change success clears the
session and a fresh login can establish an unrestricted session.

The timer refreshes 30 seconds before a five-minute token expires (10% of lifetime
for shorter tokens). API calls and window focus/visibility/pageshow also check
expiry to handle throttled timers. Refresh promises are shared across all browser
calls. HTTP 401 triggers one refresh and one replay; late 401s reuse a token that
has already rotated. A second 401 or any failed refresh clears the session.
Cancellation does not cancel a shared refresh needed by other requests. Failed
refreshes have a 15-second timeout. Requests that finish after logout or a new
login cannot expose their stale result or resurrect a previous session.

Root `SessionGuard` hides children while restoring/redirecting, protects all
routes except login (`/`), and uses replace navigation. Mandatory-password
sessions may access only `/change-password`, including when navigating to login.
These are frontend guards; backend authorization and password restrictions must
still be enforced on API endpoints. Static exports contain no private response
data. Role authorization is not inferred from the previous demo role buttons.

Both sign-out controls call `POST /v1/auth/logout` with `{ refresh_token }` and
the current bearer token when available. Local tokens are cleared immediately,
including on network failure. The server call has a 10-second timeout. This does
not revoke an already issued access token: backend has no blocklist and that
token can remain valid until expiry (up to five minutes). Never claim otherwise.

## Testing

Session unit tests use fake time past five minutes, concurrent 401s, token
rotation, reload restoration, failed refresh/logout and stale-response races.
`npm run test:e2e` builds with a synthetic API origin `http://api.e2e.test` and
Playwright intercepts its requests. It starts an isolated production server on
127.0.0.1:3100. Synthetic browser tests cover expiry, guarded routes and logout
with back/reload; they do not contact Keycloak or prove live backend integration.

Task 2 verified on 2026-11-11: check passed (25 Node tests, 46 Vitest tests,
TypeScript and production build); lint passed after removing an unused import.
All five Chromium tests passed, including 360 seconds of simulated session time
and back/reload after failed server logout. Live Keycloak/CORS remains unverified.

## First password change (Task 3)

`/change-password` is the only permitted route for a restricted session, including
after reload. It validates the current password, new password (at least 8
characters) and a matching confirmation. Only `{ old_password, new_password }`
is sent in `PUT /v1/users/me/password`; passwords are never persisted. Backend
field errors remain field-scoped; `users.wrong_password` marks the current-password
field by code. Submissions are single-flight and aborted when the form unmounts.
Success records a one-time login notice, clears local tokens immediately and
replaces the route with login because backend closes every user session. There
is no client-side flag bypass or automatic login after a password change.

Task 3 verified on 2026-11-11: `npm run check` passed (25 Node tests, 49 Vitest
tests and production build). All nine synthetic Chromium tests passed, including
forced-route/reload isolation, validation, wrong-password mapping and clearing
tokens with the login success notice. Real re-login with a new password is
covered by Task 4's combined synthetic flow; live backend verification is pending.

## Credential login (Task 4)

The root login page now submits `POST /v1/auth/login` with
`{ username, password }` and `auth: false`; required fields are checked locally.
It accepts the supplied token-set contract, passes tokens and request start time
to `portalSession.accept`, and replaces navigation with `/portal` or
`/change-password`. The previous Student/Professor and Admin demo navigation
buttons are removed. No roles are inferred from user-entered credentials.

`auth.invalid_credentials` shows one localized username-or-password error using
the code, independent of backend message wording. Other backend messages are
rendered directly, with field arrays below the corresponding inputs and shared
429/5xx diagnostics. Duplicate submits are blocked; unmount cancels a pending
login and prevents a late response from creating a session. Passwords are never
stored in browser persistence. The password-change success notice is shown once
on login; successful login clears the in-memory password field.

Task 4 verified on 2026-11-11: `npm run check` passed (25 Node tests, 55 Vitest
tests, lint, TypeScript and production build). All 14 synthetic Chromium tests
passed, including invalid credentials without refresh, normal login/reload, and
initial-password change followed by login with the new password without another
mandatory change. GitHub Pages static export also built successfully with the
repository base path. No live Keycloak/backend credentials were used.

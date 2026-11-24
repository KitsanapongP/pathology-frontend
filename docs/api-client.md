# API and authentication

## Configuration

```dotenv
NEXT_PUBLIC_AUTH_MODE=demo
NEXT_PUBLIC_API_BASE_URL=http://localhost:9100
```

Use `.env.local` for Next development. Portal dev is `http://<DEV_IP>:9100`
(same network/VPN); keep the actual private address in ignored local config.
Prod is `http://portal.<domain>` with the domain pending. The client adds `/v1`
exactly once and also accepts an env URL ending in `/v1`. Swagger is at
`/swagger/index.html` on local/dev, not under `/v1`.

`NEXT_PUBLIC_*` values are public and fixed at build time. Set them before
building Docker or GitHub Pages; Pages reads the API URL from its repository
Actions variable. An HTTPS page cannot call the current HTTP API (mixed content).

`demo` shows small skip-role shortcuts alongside real login. Choosing one clears
the local real session and stores only `pathology:demo-session:v1`; preview makes
no backend calls or tokens. Reload preserves the role; logout clears it. Real
authenticated/password-required states retain their guards. `api` (also the
unset/default mode) hides shortcuts. Preferences and report drafts are preserved.

Portal owns auth, profiles and users. Request service uses port 8000 separately;
its business API, grossing, matching and inventory contracts remain pending.

## Client and errors

Use `portalApi` from `src/lib/portal-api.ts` for service HTTP. Server code must
create a request-scoped `createApiClient`; never share a user's token globally.
ESLint restricts direct fetch/XMLHttpRequest/axios use outside the transport.

```ts
const result = await portalApi.request("users/me", { signal });
const users = await portalApi.paginated("users?page=1&size=20", { signal });
// result.data; users.data; users.pagination.total_records
```

- Success: `{ message, status, status_code, data }`.
- Pagination: array `data` plus `pagination` with `total_records`, `total_pages`,
  `current_page`, `page_size`. The query parameter is `size`, not `page_size`.
- Error: `{ message, status, status_code, error_code, request_id, errors? }`,
  where `errors` maps canonical field names to message arrays.

Authenticated requests read the current token/language and send Bearer auth plus
`Accept-Language: th|en`. Public login/refresh explicitly use `auth: false`.
JSON is serialized; FormData retains native multipart boundaries. Paths stay
within the configured origin and `/v1`, redirects/cookies are disabled and
responses are not cached. Generic DTO types do not runtime-validate business data.
Empty, non-JSON or malformed success envelopes produce `client.invalid_response`.

Catch `ApiError` and branch on `error.errorCode`, never translated messages.
Render backend text directly without PortalText/retranslation or HTML. Use
`error.fieldErrors[field]` beneath its field with `aria-invalid` and
`aria-describedby`; `ApiFieldErrors` is the shared renderer. `ApiErrorNotice` or
`apiErrorMessage(error)` provides general feedback, 5xx request IDs and 429 wait
guidance (`Retry-After` seconds/date when readable). Unknown field errors still
need general feedback. Network failures use `client.network_error`; aborts
propagate unchanged. Rate-limit errors do not automatically retry writes.

## Login and sessions

| Action | Contract |
| --- | --- |
| Login hospitals | `GET /v1/auth/tenants`, no bearer token — `[{ code, name }]` of hospitals that can log in; hospital selection is temporarily hidden; use the only hospital or the remembered code matching the list (on discovery failure, use the remembered code). Unresolved hospitals block login with form feedback |
| Login | `POST /v1/auth/login` with `{ tenant_code, username, password }`, no bearer token — `tenant_code` is the hospital code (`tenants.code`; one Keycloak realm per hospital), remembered after a successful login in `pathology:tenant-code:v1` localStorage |
| Refresh | `POST /v1/auth/refresh` with `{ refresh_token }` |
| Logout | `POST /v1/auth/logout` with `{ refresh_token }` |
| Change password | `PUT /v1/users/me/password` with `{ old_password, new_password }` |

Login hands `data` to `portalSession.accept(data, requestStartedAt)`. Tokens contain
`access_token`, `refresh_token`, `token_type`, `expires_in`, `refresh_expires_in`
(seconds), plus login's boolean `must_change_password`. Username/password limits
are 100/256 Unicode characters; new passwords require at least 8 and matching
client confirmation. Passwords are never persisted or truncated.

Access tokens stay in memory; refresh tokens, refresh expiry and the password
gate use `pathology:session:v1` sessionStorage. This preserves reload sessions but
is readable by JavaScript/XSS. Blocked storage falls back to tab memory. Reload
restores via refresh; tabs do not share a refresh promise or synchronized logout.

Refresh runs before access expiry (30 seconds early for a five-minute token),
with one shared promise. Requests and focus/visibility also check expiry. HTTP
401 gets one refresh/retry; a second 401 or failed refresh clears the session and
returns to login. Late responses cannot resurrect a logged-out/replaced session.
Refresh may omit `must_change_password`; it never clears an existing password gate.

Root guards hide protected content while restoring. A password-required session
can access only `/change-password`, including when trying login or portal routes.
`auth.invalid_credentials` shows a generic credentials error;
`users.wrong_password` marks the old-password field. Password-change success ends
all backend sessions, clears local tokens and shows a one-time login notice
(`pathology:login-notice:v1`). A fresh login is required.

Logout clears local tokens even if the endpoint fails. Backend has no access-token
blocklist: an issued token may remain valid until expiry (up to five minutes).
Backend authorization is required independently of frontend guards.

## My profile

`/portal/profile` is linked from `PortalAccountMenu` in the shared portal header.
The account dropdown also opens the single shared settings dialog and signs out;
administration does not duplicate account controls or show notifications.
The menu supports keyboard focus, Escape and dismissal outside the dropdown.
The header makes no extra identity requests and uses a generic account label for
real sessions; it never infers their names or roles from the preview Admin fixture.
`GET /v1/users/me` returns `user_id`, `username`, `first_name`, `last_name`,
`email`, optional/nullable `phone_number`, `status`, `tenant_id`,
`must_change_password` and Unix-seconds `created_at`.
`PUT /v1/users/me` sends only `{ first_name, last_name, email, phone_number }`.
Names are required and at most 255 Unicode characters; email is required and
phone is optional, digits only, up to 20 digits. Empty phone is sent as `""`.
Username, status and account creation date are read-only. Backend field errors
use canonical names and remain untranslated. Only an explicit save writes changes;
discard restores the last loaded/saved values. Reload fetches the server again.

The profile reuses `ChangePasswordForm` with `purpose="profile"`, including the
all-device sign-out consequence, old/new passwords, confirmation and the existing
session-clearing/login-notice flow. Profile save and password change disable each
other while pending. Mandatory-password sessions still cannot open this page.
Demo shortcuts show disabled forms without reading or writing service data;
no profile or password values are persisted in browser storage.

## Hospital user directory and permissions

`/portal/admin/users` reads `GET /v1/users?page=&size=` or
`GET /v1/users/search?q=&page=&size=` through `portalApi.paginated`.
Rows use the same `UserResponse` contract as the profile. Pagination returns
`total_records`, `total_pages`, `current_page`, `page_size`; requests use `size`.
Search is debounced 350 ms, resets to page 1 and cancels superseded reads.
Search, page and page size live in the URL for reload and browser history.
The directory links from portal home and the administration dashboard. All
`/portal/admin` routes share `AdminShell`, including persistent desktop navigation
and a mobile menu dialog; the directory does not mount another header or sidebar.
Administration request, storage and log destinations retain local dashboard
fixtures and do not use the portal user API. Reset and delete remain separate
work and have no placeholder controls here. Preview makes no directory HTTP calls.

The updated backend auth document confirms portal RBAC is pending: authenticated
hospital users currently access all hospital pages, scoped to their tenant by
the backend. `canPortal` in `src/lib/portal-permissions.ts` is the single UI
permission policy; it grants `users.read`, `users.create` and `users.update` only
after normal authentication.
Do not infer roles or token claims from the document's illustrative examples.
Keep authentication and mandatory-password guards independent of that policy.
Directory HTTP 403 renders `PortalForbidden`, preserving backend feedback and
the session; it does not trigger refresh or logout. HTTP 401 retains the shared
refresh/retry behavior. Superadmin uses separate accounts, tokens and a service
on port 9200 over VPN; never send portal tokens to that service.

## Create and edit hospital users

The directory opens `AdminUserDialog` for create or edit while preserving its
current `q`, `page` and `size`. Edit first reads `GET /v1/users/{user_id}`; cancel
discards the local buffer. Successful writes refresh the current directory query.

- Create: `POST /v1/users` sends `username`, `email`, `first_name`, `last_name`,
  `phone_number`, `status`, `password`. The initial password requires at least
  eight Unicode characters and local confirmation; new users must change it at
  first login. Confirmation is never sent to the service.
- Edit: `PUT /v1/users/{user_id}` sends the same six account fields without a
  password. Resetting a password remains a separate endpoint/task.
- Username has 3–100 Unicode characters; names have 1–255, email is required and
  phone is optional digits up to 20. Text fields trim whitespace, passwords do not.
  Empty phone is `""`. Status values stay `active`/`inactive` in both languages.
  Tenant is determined by the backend; no tenant or role fields are sent.
- Canonical backend field errors render unchanged. Username/email duplicate codes
  attach the backend message to the corresponding field if field errors are
  absent; combined field errors remain intact. Other codes use general feedback.
  Missing users stop editing; forbidden reads/writes show the shared denied view.
- Reads are abortable and bounded to 15 seconds; writes to 30. Pending writes
  prevent repeated submit, cancel and Escape. A network/timeout error cannot prove
  that the server did not save, so feedback asks the user to check the directory.
  Closing or successful save discards the form buffer; passwords never enter URL,
  browser storage or logs. Preview can open a disabled create form with no HTTP.

## Backend handoff

Ask backend to allow the exact frontend origins in `APP AllowOrigins`, including
`http://localhost:3000` or the actual local port. Permit API methods and request
headers Authorization, Content-Type, Accept and Accept-Language. Expose
`Retry-After` and `X-Request-ID` on errors/proxy responses as well as success.

The last read-only dev check returned health 200 for both services and translated
portal messages for th/en. CORS allowed `*` but did not expose those diagnostic
headers. Live login/refresh/logout, error codes and 429 behavior still need an
approved test account. Automated auth tests use synthetic network responses.

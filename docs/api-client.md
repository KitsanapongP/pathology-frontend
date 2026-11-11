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
| Login | `POST /v1/auth/login` with `{ username, password }`, no bearer token |
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

## Backend handoff

Ask backend to allow the exact frontend origins in `APP AllowOrigins`, including
`http://localhost:3000` or the actual local port. Permit API methods and request
headers Authorization, Content-Type, Accept and Accept-Language. Expose
`Retry-After` and `X-Request-ID` on errors/proxy responses as well as success.

The last read-only dev check returned health 200 for both services and translated
portal messages for th/en. CORS allowed `*` but did not expose those diagnostic
headers. Live login/refresh/logout, error codes and 429 behavior still need an
approved test account. Automated auth tests use synthetic network responses.

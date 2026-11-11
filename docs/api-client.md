# pathology-portal-service API client

All service HTTP traffic goes through `portalApi` in browser code. There were no
existing HTTP calls to migrate when this foundation was added. Business modules
still use fixtures/IndexedDB pending real endpoint contracts. Session management
now uses the supplied refresh/logout endpoints; see `docs/session.md`.
ESLint rejects direct fetch/XMLHttpRequest calls and axios imports elsewhere in
`src`; native HTTP transport belongs in `src/lib/api-client.ts`.

## Configuration

Copy `.env.example` to `.env.local` for local Next development:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8088
```

For dev and prod, set this variable to the actual API nginx subdomain using
`http://` while that infrastructure serves HTTP. Do not use the local 8088 port
on those environments. The actual hostnames have not been supplied; obtain them
from backend rather than committing guessed values. `/v1` is added exactly once;
an env value ending in `/v1` is also accepted. Missing/invalid config fails on
the first API call with an actionable configuration error; fixture-only builds
remain usable without API configuration.

`NEXT_PUBLIC_*` is public and frozen at build time. Set it in CI before
`npm run build`. Compose forwards the variable as a build argument (copy the
example to `.env` for Compose); direct Docker builds use
`docker build --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8088 .`.
Rebuild when changing the API origin. No credentials belong in build arguments.
GitHub Pages builds read the repository Actions variable
`NEXT_PUBLIC_API_BASE_URL`; set its approved API URL in GitHub before expecting
live login. An unset variable leaves API calls unavailable rather than guessing
a production host. This task does not change repository variables or backend CORS.
An HTTPS frontend cannot call an HTTP API because of browser mixed-content rules;
coordinate matching schemes or HTTPS nginx before that deployment.

## Usage

After login obtains a token set, call `portalSession.accept(data, startedAt)`
from `@/lib/portal-api`. Access tokens stay in memory; refresh tokens persist in
sessionStorage. The session manager owns refresh, logout and root route guards.
The client replays authenticated requests once after HTTP 401; other errors do
not automatically retry writes. Public auth requests bypass the refresh hook.

```tsx
import { portalApi } from "@/lib/portal-api";
import { ApiError } from "@/lib/api-client";

// Illustrative paths and DTOs only: confirm these with the backend contract.
const result = await portalApi.request<User>("users/123", { signal });
const list = await portalApi.paginated<User>("users?page=1&page_size=20", { signal });
// result.data; list.data; list.pagination.total_records
try {
  await portalApi.request<User>("users", { method: "POST", body: values, signal });
} catch (error) {
  if (error instanceof ApiError) {
    setError(error);
    if (error.errorCode === "users.username_already_exists") {
      // Optional code-based behavior; never compare translated message strings.
    }
  } else { throw error; }
}
```

Every authenticated request reads the latest token and `th`/`en` portal preference
and sends `Authorization: Bearer …` plus `Accept-Language`. Without a token it
fails before network I/O. Only public endpoints such as the future login may
explicitly pass `{ auth: false }`; these still send the language header. Custom
headers cannot override authorization/language. JSON bodies are serialized;
`FormData` leaves multipart boundaries to fetch. Paths stay within the configured
origin and `/v1`; redirects are rejected, cookies omitted and caching disabled.
Server code must create a request-scoped `createApiClient` with that request's
language/token getters, never reuse browser state or a global user token.

The success envelope is `{ message, status, status_code, data }`. `request<T>`
returns the envelope; `paginated<T>` also validates an array `data` and
`pagination: { total_records, total_pages, current_page, page_size }`. DTO generic
types describe the endpoint contract; they do not runtime-validate business data.
An empty/non-JSON/malformed success is `client.invalid_response` (including a 204,
which is outside the supplied envelope contract).

## Forms and errors

Keep `ApiError | null` in form state, clear it before a new submission, and place
general feedback inside the active form/dialog. `ApiError` preserves backend
`message`, `status`, `status_code`, `error_code`, `request_id`, and `errors`.
`httpStatus` separately exposes the actual HTTP status. Use canonical backend
field keys, including exact dotted keys if supplied; do not translate field keys.

```tsx
import { ApiErrorNotice, ApiFieldErrors } from "@/components/api-feedback";

<label htmlFor="username">Username</label>
<input id="username"
  aria-invalid={!!error?.fieldErrors.username?.length}
  aria-describedby={error?.fieldErrors.username?.length ? "username-errors" : undefined}
/>
<ApiFieldErrors id="username-errors" field="username" error={error} />
<ApiErrorNotice error={error} />
```

Render these backend messages directly, outside `PortalText` translation. Multiple
messages stay under the correct field and React escapes their text. Unknown
field keys remain available on `fieldErrors`; keep the general error visible
when a server error cannot be mapped to a rendered field. A form with different
UI field names must explicitly map those names to backend keys.

General feedback adds `Request ID: …` on 5xx when supplied by the response body
or `X-Request-ID`. It adds localized wait guidance on 429 and parses `Retry-After`
as seconds or an HTTP date. Rate-limited requests are not automatically retried. Non-JSON proxy
errors retain the HTTP status and header request ID. Network failures use
`client.network_error`; aborts propagate unchanged so cancellation is not shown
as a failure. Local failures use the `client.*` code namespace.

## Backend CORS handoff — pending backend action

Send the following to the pathology-portal-service maintainer once the owner and
environment URLs are confirmed. No backend contact/channel was supplied and no
message was sent by this task; adding this file does not change live CORS.

> Please add each frontend origin to `APP AllowOrigins` in local, dev and prod.
> Local: `http://localhost:3000` (plus actual alternate ports used by the team;
> isolated browser QA uses `http://127.0.0.1:3100` if it calls the service).
> Dev/prod: use the exact deployed frontend scheme, hostname and port; confirm
> those URLs with the frontend maintainer. Origins contain no path or `/v1`.
> Permit OPTIONS preflight and the methods each API supports, and allow request
> headers `Authorization`, `Accept-Language`, `Accept`, `Content-Type`.
> Expose `Retry-After` and `X-Request-ID` so browser clients can read them on 429
> and proxy failures. Return CORS headers on errors as well as successful calls.
> Confirm the real nginx API subdomains and verify an OPTIONS + authenticated
> request from each frontend origin. The client uses bearer auth without cookies.

## Verification

`tests/unit/api-client.test.ts` covers URL boundaries, auth/language headers,
success/pagination, validation arrays, 5xx IDs, 429, proxy/network errors and
cancellation. `tests/unit/api-feedback.test.tsx` submits an isolated synthetic
form through the client and checks field placement/accessibility/text escaping,
plus current token and language behavior in the shared portal client.
These mocked tests do not establish live backend/CORS or real login integration.

Verified on 2026-11-11: `npm run check` passed (lint, TypeScript, 24 Node tests,
18 Vitest tests and production build). The existing Chromium language-preference
reload test also passed against a fresh isolated production server on port 3100.
No live backend request, CORS change or Docker image build was performed.

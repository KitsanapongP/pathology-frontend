# Development

Use Node.js 24 and `npm ci`. Configure `.env.local` from `.env.example`; see
[API/auth](api-client.md). Public env values are fixed at build time, so restart
dev or rebuild after changing them. Compose reads `.env`, not `.env.local`.

## Checks

| Command | Purpose |
| --- | --- |
| `npm run check` | Lint, TypeScript, unit tests and production build |
| `npm test` | Node examination tests plus Vitest `tests/unit` |
| `npm run test:e2e` | Playwright `tests/e2e`, mocked API authentication |
| `npm run test:e2e:demo` | Playwright skip-login preview |
| `npm run security:audit` | Production dependency audit |

Install Chromium with `npx --no-install playwright install chromium`; Linux CI
uses `--with-deps`. A missing executable needs installation in the test user's
environment; use `--force` only for a damaged download. Inspect failures with
`npm run test:e2e:report`.

The E2E wrapper builds a synthetic API origin and the selected auth mode on both
Windows and Linux, then starts a fresh production server on 127.0.0.1:3100.
Run browser suites sequentially and do not reuse the user's server/browser.
Tests use synthetic data and never prove live Keycloak, microphone or hardware
behavior. For a normal `npm start` after E2E, rebuild with your intended env.

After dependency changes, verify `npm ci` on Windows and Linux. If Linux reports
missing optional native lockfile entries, regenerate the lockfile in a clean
Linux container; do not replace CI's `npm ci` with `npm install`.

## Docker and deployment

Start Docker Desktop with Linux containers, then:

```powershell
docker compose config --quiet
docker compose up --build -d --wait
docker compose logs --tail 80 frontend
docker compose down
```

Local Compose binds only loopback (`FRONTEND_PORT`, default 3000). Images run as
non-root; `.env*` and private keys are excluded from the build context. Pass
`NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_AUTH_MODE` as build arguments.
Standalone output is enabled only with `DOCKER_BUILD=true`; GitHub Pages keeps
its separate static-export build.

GitLab jobs use the group's `pathology-dev` runner: branch-name validation,
check, audit and browser tests. While an MR is open, its pipeline replaces the
duplicate branch pipeline. A branch push does not deploy. Tags `dev-v*` deploy
dev; tags `prod-v*` require manual deployment on `pathology-prod`.

Server deployment uses `deploy/compose.yml`, network `pathology-<env>` and infra
nginx (`UPSTREAM_WEB`), with no published application port. The maintainer must
validate CI/runner setup and Docker build arguments before tagging: the current
deploy job passes neither public env argument. No runtime env file can replace
values already embedded in the browser build. Preserve the team's CI/deploy files.

## GitHub / GitLab

Small tasks (text, docs, styling or isolated fixes) go directly on `dev`. Keep
GitLab `dev` and GitHub `dev` on the same commits with clear task messages. Start
with a clean working tree and fetch both remotes:

```powershell
git fetch gitlab dev
git fetch origin dev
git switch dev
git merge --ff-only gitlab/dev
# Implement, check, and commit the task, then publish the same commits.
git push gitlab dev
git push origin dev
```

Use descriptive messages such as `[FE][Task 5] Add profile editing`. If either
remote has independent changes, reconcile them while preserving history before
retrying; never force sync or independently squash the same work on each service.

For a new system/module, broad refactor or changes needing coordinated integration
tests, create a separate `feature/*` branch from dev and push that branch to both
remotes. GitLab also accepts `fix/*` and `hotfix/*`; its CI rejects arbitrary
feature prefixes. Integrate the completed, checked work back into dev and copy
the actual resulting commit to the other remote. Reserve the batch review MR
into main until the user requests it.

If the maintainer has already merged work into GitLab `dev`, copy that result:

```powershell
git fetch gitlab dev
git push origin refs/remotes/gitlab/dev:refs/heads/dev
git switch dev
git merge --ff-only gitlab/dev
```

Temporary branches may be deleted once their commits are confirmed in `dev`;
deleting the branch leaves merged commits and files intact. Keep the merged
history instead of resetting branches to hide merge commits.

When the full batch is ready, the user can request a GitLab `dev` -> `main` MR
for the senior reviewer. Do not open or merge that MR early. Promotion of either
`main` branch and deployment tags are separate explicit actions. Never upload
ignored local env files.

## Data and integration limits

Keep tokens, original scans, private IP environments and patient data out of Git,
screenshots, traces and CI logs. Preserve browser drafts/audio during QA. Browser
STT may use an external provider; confirm permitted providers and retention
before processing real clinical data. Frontend guards do not enforce backend
record/tenant permissions. Live API/CORS and release verification remain team tasks.

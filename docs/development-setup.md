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

`gitlab/dev` is the reviewed integration source; `origin/dev` mirrors it.
Use one `feature/*`, `fix/*` or `hotfix/*` branch per reviewable task. GitLab CI
rejects other feature prefixes, including `codex/`.

```powershell
git fetch gitlab dev
git switch -c feature/short-task-name gitlab/dev
# Implement, check, and commit the task, then push the same branch to both remotes.
git push -u origin HEAD
git push -o merge_request.create -o merge_request.target=dev gitlab HEAD
```

The last command creates the GitLab MR into `dev`. Further commits go to the
same branch and update that MR; do not open a second GitHub review queue.
Use descriptive messages such as `[FE][Task 5] Add profile editing`. Do not
independently merge/squash the same task on both services.

After the maintainer merges the MR, sync the actual resulting commit:

```powershell
git fetch gitlab dev
git push origin refs/remotes/gitlab/dev:refs/heads/dev
git switch dev
git merge --ff-only gitlab/dev
```

These normal pushes reject divergent history; reconcile it through a GitLab MR
instead of forcing it. Keep the working tree clean before switching branches.
Promote GitHub `main` explicitly for Pages preview/release. GitLab `main` and
deployment tags are separate maintainer actions. Never rewrite shared history
to rename old commits or upload ignored local env files.

## Data and integration limits

Keep tokens, original scans, private IP environments and patient data out of Git,
screenshots, traces and CI logs. Preserve browser drafts/audio during QA. Browser
STT may use an external provider; confirm permitted providers and retention
before processing real clinical data. Frontend guards do not enforce backend
record/tenant permissions. Live API/CORS and release verification remain team tasks.

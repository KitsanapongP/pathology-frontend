# Development setup and practice

The standard development flow remains `npm ci` followed by `npm run dev` with
Node.js 24. Docker and browser testing are optional workflows described below.
The frontend currently uses fixtures, so local UI development needs no VPN,
backend credentials or API environment variables. Live API checks need the
backend network/VPN and approved configuration.

Repository files do not configure GitLab project settings, runners, secrets,
registry access or deployment targets automatically.

## 1. Tests in the terminal

Use Node.js 24 and npm. From the repository root:

```powershell
npm ci
npm test
npm run check
```

`npm test` runs the existing Node gesture/focus suite plus Vitest unit/component
tests. `check` additionally runs lint, TypeScript and a normal production build.
`npm run test:watch` is the optional interactive development mode.

Unit examples cover identifier scoping, multiple search terms and receipt dates
crossing midnight in Asia/Bangkok. The component example checks password visibility
without submitting credentials. These do not prove real authentication.

Install Chromium once, then run the browser suite:

```powershell
npx --no-install playwright install chromium
npm run test:e2e
```

If the tests fail immediately with `browserType.launch: Executable doesn't exist`,
the browser binary is unavailable; no UI assertions have run yet. `npm ci`
installs the Playwright package separately from its per-user browser downloads.
Run the Chromium install command above from the same Windows account/terminal
environment used for tests. If installation reports success but the executable
is still missing, repair that download with:

```powershell
npx --no-install playwright install --force chromium
npm run test:e2e
```

Do not delete all browser caches or reinstall project dependencies for this error.

The E2E command builds production and starts its own server on loopback port 3100.
Stop any other process on that port before running; it deliberately refuses to
reuse an unknown server. Each test has an isolated browser context. It does not
touch the user's existing drafts, microphone or clinical confirmation workflow.
On Linux CI, use `playwright install --with-deps chromium` to install OS packages.
Failure artifacts are in `test-results/` and `playwright-report/`; inspect with
`npm run test:e2e:report` (opens a local report server; Ctrl+C stops it).

## 2. Docker

Open Docker Desktop, using Linux containers, and wait until `docker info` works.
If it reports `dockerDesktopLinuxEngine` unavailable, start/restart Docker Desktop
and check its WSL backend before retrying. Do not reset/delete Docker data.

```powershell
docker compose config --quiet
docker compose up --build -d --wait
docker compose ps
docker compose logs --tail 80 frontend
docker compose down
```

The app is at http://localhost:3000 while running. Docker builds Linux dependencies
with `npm ci`, then copies Next's standalone output into a non-root runtime image.
This is a production-mode practice container, without hot reload. Rebuild after
source changes. Browser IndexedDB remains browser storage, not a Docker volume.

If port 3000 is already occupied, copy `.env.example` to `.env` and set
`FRONTEND_PORT=3001`, then open http://localhost:3001. Compose binds only loopback.
No API secret/configuration is required while the app uses fixtures. Never put
secrets in `NEXT_PUBLIC_*`; these values are public and baked into a build.
`DOCKER_BUILD=true` enables standalone only inside Docker; GitHub Pages retains
its existing static-export behavior. Base images currently track Node 24 security
updates; pin reviewed image digests when the team establishes release policy.

## 3. GitLab CI

`.gitlab-ci.yml` follows the same pattern as the backend services. Every job runs
on the group's self-hosted runner (`tags: [pathology-dev]`); gitlab.com instance
runners are disabled, so a job without that tag never starts.

- MR / every branch (only the MR pipeline while an MR is open): `branch-name` (branch must be `main`, `dev`,
  `feature/*`, `fix/*` or `hotfix/*`), `verify` (lint, typecheck, unit tests, build), `dependency-audit`
  and `e2e` (Chromium browser tests).
- Tag `dev-v*`: the same tests, then `deploy-dev` builds `pathology-web:<tag>` on
  the dev server and runs `docker compose up -d` with `deploy/compose.yml` in
  `/opt/pathology/dev/apps/pathology-web/`.
- Tag `prod-v*`: the same tests, then a manual `deploy-prod` on the
  `pathology-prod` runner does the same in `/opt/pathology/prod/apps/pathology-web/`.

The container is `pathology-web` on network `pathology-<env>`, publishes no port
and is reached through the infra nginx at `app.<NGINX_DOMAIN>` (`UPSTREAM_WEB`).
The app has no runtime `.env` yet; `NEXT_PUBLIC_*` values are fixed at build time.
Run the configuration through GitLab's CI Lint before pushing a tag.

Audit fails for high/critical production dependency findings. Triage findings;
do not run `npm audit fix --force` automatically. Development dependencies should
also be reviewed with `npm audit` before upgrades. This is dependency scanning,
not a complete security assessment. No registry credentials are needed yet.

## 4. API and Postman

See `postman/README.md`. Health checks use the supplied base-URL handoff; the dev
IP may be configured in a Git-ignored `postman/dev.local.json`; this file is not
included in a clone. Start with the committed blank environment template and
request approved URLs from backend. Obtain the actual OpenAPI
specification, authentication flow, test roles and synthetic data from backend
before adding login or business requests. The supplied portal Swagger path is
`/swagger/index.html`, not inside `/v1`. Tell backend the browser origin
`http://localhost:3000` (or the actual alternate port) for its CORS allowlist.

Initial audit on 2026-11-05: production audit returned no vulnerabilities. Full
audit reported eight moderate findings in the ESLint/typescript-eslint/minimatch
development dependency chain. npm's suggested force fix downgrades
`eslint-config-next` across major versions; do not apply it automatically.

## 5. Security work before real data

- Current login is a demo role selector. Implement server-verified identity and
  per-record/tenant authorization before connecting real records. Hiding a button
  does not enforce access.
- Use only synthetic data in fixtures, screenshots, traces, Postman and CI logs.
  Playwright traces may contain DOM/network details. CI failure artifacts expire
  after three days; confirm this with organizational retention policy.
- Inventory stored data: in-memory uploads/edits, IndexedDB reports/audio and the
  temporary browser STT provider. Confirm permitted providers and data locations
  before processing health data or recordings. Docker does not enforce PDPA.
- Agree retention/deletion, audit events, backup/restore, least-privilege roles,
  approved hosting, HTTPS and incident handling with IT/security and the DPO.
  Legal basis and health-data processing requirements need organizational review.
- Keep `.env`, tokens, original scans and private keys out of Git/build contexts.
  A private repository does not justify storing credentials or patient records.
  Audit output alone does not detect embedded secrets, image vulnerabilities,
  authorization failures or policy compliance. Add those checks with the team.

## Verification on 2026-11-05

- Clean `npm ci` passed on Windows and in the Linux Docker build. The lockfile was
  repaired in a clean Linux container after optional `@emnapi` entries were missing.
- `npm run check` passed: lint, typecheck, 24 Node tests, four Vitest tests and build.
- `npm run test:e2e` passed both Chromium scenarios against the production build.
- Docker multi-stage build passed. Compose reported healthy; runtime was uid 1000
  (`node`). `/`, `/portal`, `/portal/requests` and referenced static assets returned
  successful responses on loopback port 3000 during verification.
- Compose configuration, CI YAML parsing and Postman JSON parsing passed locally.
  GitLab CI Lint, runner execution, registry publishing and deployment were not run.
- Dev portal health and Swagger GETs timed out from this machine (8-second timeout).
  Verify network/VPN/server reachability; this does not establish an API outage.

## Official references

- https://docs.docker.com/build/building/best-practices/
- https://docs.gitlab.com/ci/yaml/workflow/
- https://playwright.dev/docs/ci
- https://nextjs.org/docs/app/guides/testing
- https://learning.postman.com/latest-v-12/docs/getting-started/importing-and-exporting/importing-data

# Pathology Frontend

Next.js App Router, React, TypeScript and Tailwind CSS. Requires Node.js 24 and npm.

## Start

On the first setup, copy `.env.example` to `.env.local` and configure the API URL.
Keep private dev addresses and tokens out of Git.

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. The normal login form uses the portal API.
`NEXT_PUBLIC_AUTH_MODE=demo` adds small skip-login shortcuts for Student /
Professor and Admin; `api` hides them. Business modules currently use synthetic
fixtures, with local edits/reports stored in browser memory, sessionStorage or
IndexedDB. They are not hospital submissions.

## Checks

```powershell
npm run check
npx --no-install playwright install chromium
npm run test:e2e
npm run test:e2e:demo
```

Run the two browser commands separately; both use an isolated production server
on port 3100. For a normal production server, run `npm run build` then `npm start`.

## Guides

- [Development](docs/development-setup.md): tests, Docker, CI, branches and MR workflow.
- [API and authentication](docs/api-client.md): configuration, client, errors and sessions.
- [Examination interaction](docs/examinations-interaction-spec.md) and [QA](docs/examinations-qa.md): pedal/voice workflow and hardware limits.
- [OCR mapping](docs/ocr-api-mapping.md): request schema and pending business API contract.
- [Portal QA](docs/portal-ui-qa.md): layout/language checks.
- [Postman](postman/README.md): health checks only.

## Preview and modules

[GitHub Pages preview](https://KitsanapongP.github.io/pathology-frontend/) updates
when GitHub `main` is promoted. Its workflow uses a static export with the
repository base path; normal local development uses `/`.

Modules are `/portal/requests`, `/portal/examinations`, `/portal/matching` and
`/portal/storage`; the admin dashboard is `/portal/admin`. Real login needs backend
connectivity and a test account. Skip-login preview does not create auth tokens.

The campus background and slide-tray PNGs were generated with ImageGen; container
and box illustrations are project SVGs. No private patient scans belong in fixtures.

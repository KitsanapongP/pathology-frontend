# Pathology Frontend

Frontend starter for the pathology platform, with one home page.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Requirements

- Node.js 24 LTS
- npm

## Local development

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks and production

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

The home page is in `src/app/page.tsx`. Global styles are in
`src/app/globals.css`, and the root layout is in `src/app/layout.tsx`.

This starter does not require environment variables or a backend service.

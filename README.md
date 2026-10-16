# Pathology Frontend

Frontend starter for the pathology platform, with a demo login and a portal placeholder.

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

The login page is at `/` and the portal placeholder is at `/portal`.
Clicking the login button opens the portal without checking credentials.
This is a UI demo: there is no authentication or route protection yet.
SSO is disabled until a real integration is available.

The login page is in `src/app/page.tsx`. Global styles are in
`src/app/globals.css`, and the root layout is in `src/app/layout.tsx`.

This starter does not require environment variables or a backend service.

## Background asset

`public/images/campus-background.png` was generated using the built-in ImageGen tool.
Prompt: A photorealistic modern Thai university medical campus, white buildings
on the left, a white clock tower on the right, tropical trees, a stone plaza and
reflecting pool, soft morning light and pale blue sky, wide 16:9 composition with
open central space. No people, text, logos, signage, or watermarks.

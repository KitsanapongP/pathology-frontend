# Pathology Frontend

Frontend starter for the pathology platform, with a demo role selector,
an admin dashboard, and a Student / Professor workspace.

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

The login page at `/` temporarily provides two mock login buttons:

- Student / Professor opens the module portal at `/portal`.
- Admin opens the existing dashboard at `/portal/admin`.

Both buttons work without credentials. Pressing Enter defaults to Student / Professor.
This role selector is temporary and should be replaced by the primary login
button and server-verified role routing when authentication is integrated.
This is a UI demo: there is no authentication or route protection yet.
SSO is disabled until a real integration is available.

The dashboard uses sample counts, requests, service health, and logs.
Log filters, search, detail dialogs, navigation previews, and the account menu
work locally. Refresh updates the display time; it does not fetch service health.

The Student / Professor portal provides four module entry cards. The first
opens `/portal/requests`, the second opens `/portal/examinations`, and the
remaining two open placeholder dialogs.

Request intake supports local PDF/JPG/PNG selection (up to 10 MB per file),
drag-and-drop, attachment previews, filters, sorting, pagination, and editing.
New files remain queued for OCR until the backend is connected. Records and
attachments currently live in browser memory and reset on a page reload.
The four downloadable HTML forms can be opened and printed from a browser.

## Examination workflow

`/portal/examinations` provides three connected views: request selection,
voice recording, and review/confirmation. Only scanned, ready requests with
an accession number can proceed. Accession numbers currently come from fixtures.

Microphone recording uses `getUserMedia` and `MediaRecorder` after an explicit
button click. Pause, resume, stop, and audio playback operate locally. The foot
switch is not connected. STT/LLM integration is pending; transcript lines can
be entered manually and edited across Parts A–E, with search, replacement,
undo, and redo. No generated clinical text is inserted automatically.

Draft and confirmed text is saved in this tab's `sessionStorage`, keyed by
request ID, and restored when that request is selected again. Audio remains
in memory and is lost on reload. Confirmation locks text editing locally.
The backend must enforce permissions, accession validity, and finalization
when the API is integrated.

The login page is in `src/app/page.tsx`. Global styles are in
`src/app/globals.css`, and the root layout is in `src/app/layout.tsx`.

This starter does not require environment variables or a backend service.

## Background asset

`public/images/campus-background.png` was generated using the built-in ImageGen tool.
Prompt: A photorealistic modern Thai university medical campus, white buildings
on the left, a white clock tower on the right, tropical trees, a stone plaza and
reflecting pool, soft morning light and pale blue sky, wide 16:9 composition with
open central space. No people, text, logos, signage, or watermarks.

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
opens `/portal/requests`, the second opens `/portal/examinations`, the third
opens `/portal/matching`, and the fourth opens a placeholder dialog.

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

## Slide and cassette matching

`/portal/matching` includes a tray image with clickable slot overlays,
filterable QR results, bulk selection, manual pairing, draft persistence,
and confirmation. Duplicate or unreadable codes and missing request links
cannot be confirmed. Confirmed rows are locked locally.

The initial tray and associations are fixtures. Camera access is requested
only after a user action; moving to a live camera clears fixture results.
Scanning captures a frame and uses the browser's `BarcodeDetector` when
available. Unsupported browsers show the captured frame and an error,
without simulated detection results. Real QR lookup and validation still
require the backend. No confidence percentage is invented for browser scans.

Drafts, including the current frame, are saved in this tab's `sessionStorage`.
Camera tracks are stopped after capture and on unmount. Frames and patient
data are not uploaded to any external service by this frontend.

The project asset `public/images/slide-tray.png` was generated using the
built-in ImageGen tool. Prompt: An orthographic overhead photograph of a
black laboratory tray with exactly eight columns and four rows of vertical
glass microscope slides, small white QR-like labels and purple/pink histology
stains, realistic neutral clinical light, aligned grid, no text, numbered
badges, colored borders, interface, hands, people, or watermarks.

The login page is in `src/app/page.tsx`. Global styles are in
`src/app/globals.css`, and the root layout is in `src/app/layout.tsx`.

This starter does not require environment variables or a backend service.

## Background asset

`public/images/campus-background.png` was generated using the built-in ImageGen tool.
Prompt: A photorealistic modern Thai university medical campus, white buildings
on the left, a white clock tower on the right, tropical trees, a stone plaza and
reflecting pool, soft morning light and pale blue sky, wide 16:9 composition with
open central space. No people, text, logos, signage, or watermarks.

### Storage directory
- `/portal/storage`: choose examination containers or slide request boxes.
- `/portal/storage/examinations` and `/portal/storage/requests`: searchable local fixtures, date/status filters, pagination, selected details, location editing and printing.
- Box loans and returns require explicit confirmation; changes persist in sessionStorage for the current tab. Source fixtures are separate from live examination and matching records until storage APIs are supplied. Record detail dialogs do not fabricate clinical report content.
- Container and box illustrations are original SVG components. Backend storage locations, QR manifests, audit history and concurrent inventory validation are pending integration.

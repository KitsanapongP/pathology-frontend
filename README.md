# Pathology Frontend

## Public demo on GitHub Pages

Demo URL: https://KitsanapongP.github.io/pathology-frontend/

The `Deploy to GitHub Pages` workflow builds and deploys on pushes to `main`.
The repository's Settings → Pages must use **GitHub Actions** as the source.
This is the UI demo described below; data is stored locally in each browser,
not shared between visitors.

The workflow sets `GITHUB_PAGES=true` and
`NEXT_PUBLIC_BASE_PATH=/pathology-frontend` to export the site into `.next-pages/`.
Normal `npm run dev` continues to serve at the root of localhost.

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
opens `/portal/matching`, and the fourth opens `/portal/storage`.

Request intake is a full-width directory using pathology request-form labels.
It supports scoped search (name, HN, AN, accession), Ward/OPD and examination
filters, date ranges, OCR/review states, sorting, pagination and review editing.
Manual PDF/JPG/PNG selection (up to 10 MB per file) opens from a header button;
there is no template download section. Local edits/files live in browser memory.
Normal ingestion is scanner folder -> backend -> database -> request directory.
The optional normalized snapshot loader supports refresh/polling once connected;
no university endpoint, OCR parsing, upload or database write is wired yet.
See `docs/ocr-api-mapping.md` for schema observations and the proposed handoff.
All OCR examples are authored synthetic fixtures with no original patient data.

## Examination workstation

`/portal/examinations` has a bounded icon-based command rail. Left/right pedals
cycle only the visible rail actions; center activates. Recording has five
choices: voice mode, Part, save draft, review and tools. Part, voice mode,
editing and other tools open dedicated choosers with their own target sets.
Header controls, report content and ordinary fields are excluded from the cycle.

Center hold (250ms) opens push-to-talk; release stops capture. Left double-tap
backs/closes; right double-tap toggles help. F13/F14/F15 are hardware keys and
F8/F9/F10 are test aliases. Final confirmation requires selecting its button,
holding center 1.5 seconds, then releasing. There is no always-on microphone.

Try request `0038` (say ศูนย์ ศูนย์ สาม แปด) or `0036`. Thai speech uses a removable
browser SpeechRecognition adapter (`th-TH`); browser services may process audio
remotely. Prepare browser microphone permission before hands-free use. Text and
audio are saved locally in IndexedDB; confirmation does not submit to a backend.

See [the interaction spec](docs/examinations-interaction-spec.md) and
[the QA record](docs/examinations-qa.md). Run `npm run test:examinations` for
controller/STT-adapter tests without a microphone or network.

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

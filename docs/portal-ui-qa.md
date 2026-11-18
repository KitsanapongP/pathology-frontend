# Portal UI QA

## Current language and layout checks — 18 November 2026

- Hospital selection is temporarily hidden on login, including pending and failed
  discovery. A sole or remembered hospital still supplies `tenant_code`; unresolved
  hospitals and backend tenant errors use form feedback. No tenant is invented.

- Login and password change share the portal language switch and stored language.
  Authentication keeps the default text size; portal Aa presets still persist.
  Browser checks cover keyboard switching, reload, module navigation, logout,
  mandatory-password guards and Thai/English request headers/backend field errors.
- Dashboard dates, including dialogs and refresh, use the selected locale with
  Asia/Bangkok. Settings reports the actual selected language. Dashboard tables
  have their own scrollers and no longer inherit the intake table's minimum width.
- Inspected English login, portal and dashboard at 1896×1244, 1280×720 and
  390×844, with portal text at 120%. Summary cards use two columns at 1280px;
  labels wrap within cards and tables scroll within panels. No document overflow
  was found in the checked views. The examination route still omits the shared
  header, including its trailing-slash URL; no pedal/STT behavior was changed.
- Lint, TypeScript, 25 Node examination tests, 69 unit tests and the 17 selected
  login/password/language browser checks plus 7 demo checks passed. Browser tests use synthetic
  API responses; live backend translation and CORS still need integration QA.
- Production builds succeeded on retry. The installed Next.js 16.4.2 build emits
  a security upgrade warning and can initially exit with `SecurityFatalError`;
  dependency remediation remains separate from these UI changes.

## Authentication additions — 11 November 2026

- Inspected login at 1280×720, 1896×1244 and 390×844: the main form and small
  skip-role shortcuts do not overlap or overflow. Shortcuts are bottom-right
  on desktop and right-aligned below the card on mobile.
- Synthetic browser checks cover role destinations, reload/logout, field errors,
  real-auth mocks with shortcuts visible, and mandatory-password restrictions.
- The password-change form fits both desktop sizes without a portal header or
  pedal targets. Tests use synthetic data; live backend, STT and hardware remain
  outside these authentication checks.

## Previous portal checks

- The shared header is mounted once by the portal layout, with Thai/English selection, three Aa font presets and a Thai/UK flag switch. Per browser feedback, the module navigation bar has been removed, and existing breadcrumb trails use 1.25rem text and larger icons across modules. Font presets are 90%, 100% and 120%; language and font preferences survive module navigation.
- Module 1 uses a single persistent search panel: keyword, search scope, ward, examination, doctor, sex, received-date range, OCR status and review status. Results update immediately. Clear filters resets the same filter state as before.
- Browser checks: desktop 1280×720, English at 100% and 130%, and Thai at mobile 390×844. No document-wide horizontal overflow in the checked request and slide storage screens. Request tables intentionally scroll horizontally within their own container.
- Selecting the English `Ready` option retains the canonical `พร้อมใช้งาน` value and returns 17 fixture records. The initial unfiltered dataset contains 41 records. Selected font/language persist when navigating to Storage.
- Checked both storage landing links and the slide request storage screen with English labels at 130%. Dates use English Gregorian formatting in English and Thai Buddhist formatting in Thai, with Asia/Bangkok maintained.
- Raw OCR and patient-entered/fixture data are not machine translated. The examination workstation retains its existing Thai speech commands and clinical workflow; the shared header is omitted there and the rail retains its Aa control.
- TypeScript, changed-file ESLint, 18 existing examination tests and production build are the required checks for this change. Browser QA does not exercise a real scanner, OCR backend, database, camera or microphone.
- Preset update: browser-verified Aa at 90% (14.4px), 100% (16px) and 120% (19.2px); Thai/English flag switch updates the interface and checked state. Reload preserves settings. Restored Thai/100% after checking. Earlier 130% checks above refer to the previous stepper control.
- Wide-screen fix: at 1920×942 with the 120% preset, request main right edge matches the document content edge (1905px, excluding scrollbar) and document scrollWidth is also 1905px. Removed the 1760px main-width cap responsible for the blank right strip. Aa preset buttons use horizontal centering and bottom alignment.
- Breadcrumb/summary refinement: verified breadcrumb and request panel both start at x=64px in the current desktop viewport; main has 20px top spacing. Summary cards are approximately 102px tall at the normal font preset, reduced from approximately 126px.
- Module gutter update: matching, storage landing, stored slide requests and stored examinations use the same centered 1600px content cap and horizontal gutters as Module 1. All four routes return 200 with the wrapper. Module 2 has no wrapper; its workstation component and stylesheet hashes were unchanged by this update. TypeScript and changed-component ESLint passed.

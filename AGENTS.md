<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project instructions

- UI: don't add taglines, eyebrow labels, decorative subtitles or helper text by default. If a screen only makes sense with them, fix the layout instead. Keep text that carries information the layout can't: errors, units, consequences of destructive actions, accessibility labels.
- In code you write or change, keep it agent-friendly: scripts run non-interactively, errors say what to do next, and the project's CLAUDE.md is updated when a non-obvious convention is set.

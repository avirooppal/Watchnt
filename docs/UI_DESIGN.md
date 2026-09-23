# WatchNT UI system

The extension uses one local stylesheet (`extension/src/index.css`) and shared React controls. The palette is warm white, charcoal green, and jade: quiet reading surfaces, a clearly separated navigation rail, and one consistent action accent. No remote fonts, images, analytics, or UI services are needed.

- Tailwind v4 theme tokens define colors, a 4 px spacing base, typography, radii, and shadows. CSS variables carry the same tokens into the meeting controller's isolated Shadow DOM.
- Shared Button, Input, Icon/Brand, Notice, Skeleton, EmptyState, Dialog, and StatusPill components keep focus, pending, disabled, error, and empty states consistent.
- The popup shows connection state, source selection, recording time, live preview, and a clear explanation when capture is unavailable. The controller shares these patterns in a compact dark surface.
- Library, folders, task filters, meeting sections, chat, and provider settings use responsive layouts. Settings offer local Ollama and twelve cloud providers with explicit cloud text consent.
- Native modal dialogs replace browser prompts for rename/delete. Tabs support arrow keys, Home, and End; dialogs support Escape and focus restoration. Reduced-motion preferences disable transitions and animations.
- Async updates preserve existing content, prevent duplicate submission, and roll back failed task writes. Polls pause in hidden documents. Screen-reader labels and English/Spanish copy are shared.

## Run and verify

From the repository root, run `npm ci --prefix extension`, `npm run build --prefix extension`, then reload the unpacked extension from `extension/dist` in Chromium's extensions page. Refresh existing meeting tabs to load the new controller. This UI update needs no data migration or new runtime service.

`python scripts/ui_smoke.py` launches the actual built extension and an isolated backend, using temporary data. It needs Python Playwright, Chromium (`python -m playwright install chromium`), backend dependencies, and a free port 8000. `axe-core` is a development-only dependency loaded by the test; it is not bundled into the product.

The smoke suite covers folders, search, saved task completion and failed-save rollback, meeting rename, keyboard tabs, transcript, JSON export, settings persistence, Spanish, narrow layouts, popup states, and controller expand/collapse. It runs automated WCAG A/AA rules with axe and writes screenshots into `artifacts/`. These checks do not replace a screen-reader audit or real Meet/Zoom/Teams call testing. Simulated recording UI states do not prove browser capture permission flows.

Manual follow-up: exercise start/stop during real calls on each platform, inspect unusually long/mixed-language meeting content, and test with keyboard/screen-reader users. Avoid treating any automated tool as proof that every UX guideline is satisfied.

## Verified in this workspace

- Production TypeScript/Vite build and oxlint passed.
- Backend regression suite: 29 passed.
- Chromium smoke suite passed with no page errors; tested desktop and 390 px layouts.
- Axe reported no WCAG A/AA violations on the tested library, actions, detail, settings, mobile library, popup idle/recording, and injected controller states.
- npm audit: zero reported vulnerabilities.
- Visual screenshots reviewed for the library, tasks, meeting detail, settings, popup, controller, and mobile screens. Real meeting calls and a full assistive-technology audit remain manual follow-ups.

## Popup sizing and offline recovery

The popup document now declares a fixed 400 px intrinsic width instead of deriving its initial width from `100vw`. This prevents Chromium toolbar popups from collapsing during initial layout. The smoke test also checks a 190 px starting viewport. Dashboard sizing stays responsive. Remote font links and promotional privacy cards/taglines have been removed. Operational cloud consent stays in provider settings.

When the backend is unavailable, Settings displays a startup command and Retry. On Windows, `powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1` starts the loopback backend. The launcher reuses `data/watchnt.db` and root meeting files when a Docker-backed database exists and no native backend database exists, while respecting explicit storage environment variables. It does not configure automatic startup.

## Toolbar-only capture controls

The meeting-page panel has been removed. Call-presence detection remains in the content script for captions and the toolbar reminder. An amber `!` badge alternates brightness when a visible leave/hang-up control indicates a call is active. A red `REC` badge alternates brightness during recording; processing displays an ellipsis. Recording takes precedence over reminders. Leave/end controls are platform DOM heuristics and may need maintenance when Meet, Zoom, or Teams changes. The badge resets after call controls disappear or the tab closes.

Run `python scripts/toolbar_smoke.py` to verify the actual extension badge states and absence of injected UI in a synthetic meeting page. Reload the unpacked extension and refresh existing call tabs to remove an already-injected old panel.

## First-run setup

A fresh extension installation automatically opens the four-step onboarding page:
1. Connect to the local backend, with dependency and startup commands.
2. Request optional microphone permission and save spoken/interface languages.
3. Save the AI provider configuration and test both Whisper and the chosen provider. Failed checks prevent completion; cloud consent remains explicit.
4. Review capture instructions, then finish and open the library.

Progress is stored in extension-local storage. The popup offers **Finish setup** until completion; Settings offers **Run setup again**. Model installation commands are explicit user actions, never automatic downloads. Existing installations can reload the extension and launch setup from the popup or Settings.

`python scripts/onboarding_smoke.py` tests automatic installation launch, connection failures, microphone denial, step persistence, language saving, cloud consent, failed-model handling, completion, narrow layout, and restarting setup. Backend responses are mocked in this isolated browser test so the user's provider settings are not changed.

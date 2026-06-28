# WatchNT Architecture Notes

The canonical architecture source is `WatchNT_Browser_Architecture_Blueprint.md`.

Implementation work must preserve the blueprint's browser-first, offline-first, and privacy-first constraints. Architecture notes in this folder are implementation records, not replacement architecture.

## Current Milestone

Milestone 1 establishes repository tooling only:

- pnpm workspace boundaries for `apps/*` and `packages/*`
- strict TypeScript configuration
- ESLint and Prettier configuration
- Vitest unit test runner
- Playwright browser test runner

No application subsystem is implemented in this milestone.

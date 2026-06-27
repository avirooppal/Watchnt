
# @watchnt/contracts

## Purpose
Defines all shared TypeScript interfaces and types used throughout the Watchn't V2 application.

## Responsibilities
- Provide a single source of truth for domain models (Meetings, Transcripts, Memory).
- Define contracts for decoupled services (Providers, Storage, Plugins, Workflows).
- Prevent circular dependencies by centralizing types.

## Public API
The package exports all types through `src/index.ts`.

## Extension Points
Adding a new domain model requires adding a file here and exporting it from `index.ts`.

## Constraints
- **Types ONLY**. No runtime code or business logic may be placed here.
- **No external dependencies**. This package must compile independently.

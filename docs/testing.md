# Testing Strategy

WatchNT uses two test layers from the first milestone:

- Vitest for package-level unit tests.
- Playwright for real-browser behavior, especially APIs that cannot be validated reliably in jsdom, such as OPFS, Workers, File System Access capability detection, and PWA behavior.

Future milestones should add tests in the same change that introduces each module.

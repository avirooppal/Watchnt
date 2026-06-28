import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 5_000
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: "test-results",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "tests/e2e",
  timeout: 30_000
});

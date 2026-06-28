import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "html"]
    },
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    passWithNoTests: false
  }
});

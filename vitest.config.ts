import { defineConfig } from "vitest/config";

// Vitest keeps an inherited NODE_ENV. Under "production" React loads its
// production build, which has no act().
process.env.NODE_ENV = "test";

// CI logs list each test file with its count and duration, then the totals;
// a failed test keeps its error and console output. Naming the reporters
// replaces Vitest's default, so the github-actions one it adds on GitHub is
// listed too.
const ciReporting = process.env.CI
  ? {
      reporters: [
        "default",
        ...(process.env.GITHUB_ACTIONS === "true" ? ["github-actions"] : []),
      ],
      silent: "passed-only" as const,
      slowTestThreshold: 10_000,
    }
  : {};

export default defineConfig({
  test: {
    ...ciReporting,
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
  },
});

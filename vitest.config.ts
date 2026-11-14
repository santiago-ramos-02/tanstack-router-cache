import { fileURLToPath } from "node:url";

import { redact } from "@tanstack/redact/vite";
import { defineConfig } from "vitest/config";

// Vitest keeps an inherited NODE_ENV. Under "production" React loads its
// production build, which has no act().
process.env.NODE_ENV = "test";

// CI logs list each test file and, under it, each test by name with its
// duration, then the totals; a failed test keeps its error and console output. Naming the reporters
// replaces Vitest's default, so the github-actions one it adds on GitHub is
// listed too, without its job summary: Quality Gate writes the run's only one.
const githubActions: ["github-actions", { jobSummary: { enabled: boolean } }] =
  ["github-actions", { jobSummary: { enabled: false } }];
const ciReporting = process.env.CI
  ? {
      reporters: [
        "tree",
        ...(process.env.GITHUB_ACTIONS === "true" ? [githubActions] : []),
      ],
      silent: "passed-only" as const,
      slowTestThreshold: 10_000,
    }
  : {};

const environment = {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./test/setup.ts"],
};

// Apps may run the cache on TanStack Redact instead of React DOM. Its
// <Activity> renders hidden content in the same pass instead of at a lower
// priority, so the tests of what a navigation renders run on both runtimes.
// The router and Testing Library are inlined so they import the aliased
// runtime; Testing Library's ESM build, because its CommonJS one requires
// react-dom directly.
const redactProject = {
  plugins: [redact()],
  resolve: {
    alias: [
      {
        find: /^@testing-library\/react$/u,
        replacement: fileURLToPath(
          import.meta
            .resolve("@testing-library/react/dist/@testing-library/react.esm.js")
        ),
      },
    ],
  },
  test: {
    ...environment,
    include: [
      "test/components/hidden-route-work.test.tsx",
      "test/components/off-screen.test.tsx",
      "test/components/single-mount.test.tsx",
    ],
    name: "redact",
    server: {
      deps: {
        inline: [/@tanstack\/(?!redact)/u, /@testing-library/u],
      },
    },
  },
};

export default defineConfig({
  test: {
    ...ciReporting,
    projects: [
      {
        test: {
          ...environment,
          include: ["test/**/*.test.{ts,tsx}"],
          name: "react-dom",
        },
      },
      redactProject,
    ],
  },
});

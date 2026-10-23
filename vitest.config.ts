import { defineConfig } from "vitest/config";

// Vitest keeps an inherited NODE_ENV. Under "production" React loads its
// production build, which has no act().
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
  },
});

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// jest-dom 7 types its matchers for Vitest 4's one-parameter Assertion and
// Jest's global namespace; Vitest 5 reads neither. Its extension point is
// Matchers<R, T>, declared here with the same parameters.
declare module "vitest" {
  // oxlint-disable-next-line typescript/consistent-type-definitions, typescript/no-empty-interface, typescript/no-empty-object-type -- Vitest discovers matchers through declaration merging.
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}

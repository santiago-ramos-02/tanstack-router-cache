import * as domMatchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";

expect.extend(domMatchers);

// jsdom does not scroll; it logs "not implemented" for every call.
window.scrollTo = () => {};

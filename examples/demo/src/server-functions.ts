import { DEMO_DRAFT_LINES, DEMO_RECORDS } from "./data";

const SAVED_PAGE_DELAY_MS = 1200;
const CACHED_FORM_DELAY_MS = 1300;
const RESET_FORM_DELAY_MS = 900;
const SAVED_DRAFT_DELAY_MS = 1500;
const SAVED_LIST_DELAY_MS = 1600;
const RESET_PAGE_DELAY_MS = 1000;

const requestIdRadix = 36;
const requestIdStart = 2;
const requestIdEnd = 8;
const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function createLoadId(prefix: string) {
  return `${prefix}-${Math.random()
    .toString(requestIdRadix)
    .slice(requestIdStart, requestIdEnd)
    .toUpperCase()}`;
}

function formatPreparedAt() {
  return timeFormatter.format(new Date());
}

function waitForDemoDelay(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", handleAbort);
      reject(signal?.reason);
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function withDemoDelay(delayMs: number, signal?: AbortSignal) {
  await waitForDemoDelay(delayMs, signal);

  return {
    delayMs,
    loadId: createLoadId("load"),
    preparedAt: formatPreparedAt(),
  };
}

export async function getSavedPageDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(SAVED_PAGE_DELAY_MS, signal);

  return {
    ...receipt,
    label: "Saved page example",
    note: "Edit this text, leave the page, and return to confirm it is still here.",
    sampleId: "demo-001",
    status: "Ready",
  };
}

export async function getCachedFormDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(CACHED_FORM_DELAY_MS, signal);

  return {
    ...receipt,
    notes: "This text is loaded once and kept while the page is cached.",
    title: "Cached form value",
  };
}

export async function getResetFormDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(RESET_FORM_DELAY_MS, signal);

  return {
    ...receipt,
    title: "Reset form value",
  };
}

export async function getSavedDraftDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(SAVED_DRAFT_DELAY_MS, signal);

  return {
    ...receipt,
    notes: DEMO_DRAFT_LINES.join("\n"),
    owner: "Example owner",
    priority: "High",
    title: "Saved draft example",
  };
}

export async function getSavedListDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(SAVED_LIST_DELAY_MS, signal);

  return {
    ...receipt,
    records: DEMO_RECORDS,
  };
}

export async function getResetPageDemo(signal?: AbortSignal) {
  const receipt = await withDemoDelay(RESET_PAGE_DELAY_MS, signal);

  return {
    ...receipt,
    title: "Reset page example",
  };
}

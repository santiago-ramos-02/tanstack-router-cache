import { CUSTOMER_NOTES, REPAIR_PARTNERS } from "./data";

const LIVE_CASE_DELAY_MS = 1200;
const SAVED_CLAIM_DELAY_MS = 1300;
const SCRATCH_NOTE_DELAY_MS = 900;
const CASE_PLAN_DELAY_MS = 1500;
const REPAIR_NETWORK_DELAY_MS = 1600;
const FRESH_PAGE_DELAY_MS = 1000;

const requestIdRadix = 36;
const requestIdStart = 2;
const requestIdEnd = 8;
const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function createDeskId(prefix: string) {
  return `${prefix}-${Math.random()
    .toString(requestIdRadix)
    .slice(requestIdStart, requestIdEnd)
    .toUpperCase()}`;
}

function formatPreparedAt() {
  return timeFormatter.format(new Date());
}

function waitForDesk(delayMs: number, signal?: AbortSignal) {
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

async function withDeskDelay(delayMs: number, signal?: AbortSignal) {
  await waitForDesk(delayMs, signal);

  return {
    delayMs,
    deskId: createDeskId("desk"),
    preparedAt: formatPreparedAt(),
  };
}

export async function getLiveClaimFile(signal?: AbortSignal) {
  const receipt = await withDeskDelay(LIVE_CASE_DELAY_MS, signal);

  return {
    ...receipt,
    adjuster: "Maya Chen",
    claimNote:
      "Customer approved Oak Street Collision. Call before 3 PM if the windshield quote changes.",
    claimNumber: "C-1842",
    status: "Reviewing estimate",
  };
}

export async function getSavedClaimFile(signal?: AbortSignal) {
  const receipt = await withDeskDelay(SAVED_CLAIM_DELAY_MS, signal);

  return {
    ...receipt,
    claim: "C-1842 windshield claim",
    notes: "Customer wants the first available morning appointment.",
  };
}

export async function getScratchNotePad(signal?: AbortSignal) {
  const receipt = await withDeskDelay(SCRATCH_NOTE_DELAY_MS, signal);

  return {
    ...receipt,
    title: "Temporary inbox note",
  };
}

export async function getCasePlan(signal?: AbortSignal) {
  const receipt = await withDeskDelay(CASE_PLAN_DELAY_MS, signal);

  return {
    ...receipt,
    notes: CUSTOMER_NOTES.join("\n"),
    owner: "Maya Chen",
    priority: "Today",
    title: "Water damage follow-up",
  };
}

export async function getRepairNetwork(signal?: AbortSignal) {
  const receipt = await withDeskDelay(REPAIR_NETWORK_DELAY_MS, signal);

  return {
    ...receipt,
    partners: REPAIR_PARTNERS,
  };
}

export async function getFreshWorkspace(signal?: AbortSignal) {
  const receipt = await withDeskDelay(FRESH_PAGE_DELAY_MS, signal);

  return {
    ...receipt,
    headline: "Temporary note",
  };
}

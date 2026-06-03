export type Product = {
  id: string;
  name: string;
  segment: "Growth" | "Retention" | "Launch";
  owner: string;
  revenue: string;
  health: number;
};

export type ActivityEntry = {
  id: string;
  label: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "p-001",
    name: "Renewal cockpit",
    segment: "Retention",
    owner: "Ari",
    revenue: "$82k",
    health: 92,
  },
  {
    id: "p-002",
    name: "Onboarding queue",
    segment: "Launch",
    owner: "Mika",
    revenue: "$38k",
    health: 76,
  },
  {
    id: "p-003",
    name: "Executive snapshot",
    segment: "Growth",
    owner: "Noor",
    revenue: "$120k",
    health: 88,
  },
  {
    id: "p-004",
    name: "Expansion planner",
    segment: "Growth",
    owner: "Lea",
    revenue: "$54k",
    health: 69,
  },
  {
    id: "p-005",
    name: "Account recovery",
    segment: "Retention",
    owner: "Ira",
    revenue: "$47k",
    health: 81,
  },
  {
    id: "p-006",
    name: "Release desk",
    segment: "Launch",
    owner: "Sol",
    revenue: "$64k",
    health: 73,
  },
  {
    id: "p-007",
    name: "Partner runway",
    segment: "Growth",
    owner: "Vale",
    revenue: "$99k",
    health: 95,
  },
  {
    id: "p-008",
    name: "Risk review",
    segment: "Retention",
    owner: "Remy",
    revenue: "$41k",
    health: 58,
  },
  {
    id: "p-009",
    name: "Trial warmer",
    segment: "Launch",
    owner: "Tess",
    revenue: "$33k",
    health: 71,
  },
  {
    id: "p-010",
    name: "Board packet",
    segment: "Growth",
    owner: "Oli",
    revenue: "$146k",
    health: 90,
  },
  {
    id: "p-011",
    name: "Churn radar",
    segment: "Retention",
    owner: "Nico",
    revenue: "$57k",
    health: 66,
  },
  {
    id: "p-012",
    name: "Pilot tracker",
    segment: "Launch",
    owner: "Jules",
    revenue: "$49k",
    health: 79,
  },
];

export const CUSTOMER_NOTES = [
  "Pricing approved by finance",
  "Legal review pending",
  "Design partner wants Friday recap",
  "Support handoff is ready",
  "Forecast needs one more call",
  "Security form returned",
];

export const SECOND_MS = 1000;
export const ACTIVITY_LOG_LIMIT = 5;
export const ACTIVITY_ID_INCREMENT = 1;
export const HEALTH_MAX = 100;

const SESSION_STAMP_RADIX = 36;
const SESSION_STAMP_START = 2;
const SESSION_STAMP_END = 7;
const clockFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

let activityEntrySequence = 0;

export function createSessionStamp() {
  return Math.random()
    .toString(SESSION_STAMP_RADIX)
    .slice(SESSION_STAMP_START, SESSION_STAMP_END)
    .toUpperCase();
}

export function createActivityEntry(label: string): ActivityEntry {
  activityEntrySequence += ACTIVITY_ID_INCREMENT;

  return {
    id: `activity-${activityEntrySequence}`,
    label,
  };
}

export function formatClock() {
  return clockFormatter.format(new Date());
}

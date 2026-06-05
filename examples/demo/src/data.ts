export type RepairPartner = {
  id: string;
  name: string;
  claimType: "Auto" | "Home" | "Injury";
  city: string;
  estimate: string;
  readiness: number;
};

export type ActivityEntry = {
  id: string;
  label: string;
};

export const REPAIR_PARTNERS: RepairPartner[] = [
  {
    id: "p-001",
    name: "Oak Street Collision",
    claimType: "Auto",
    city: "Chicago",
    estimate: "$2,840",
    readiness: 92,
  },
  {
    id: "p-002",
    name: "Riverbend Roofing",
    claimType: "Home",
    city: "Madison",
    estimate: "$7,430",
    readiness: 76,
  },
  {
    id: "p-003",
    name: "ClearPath Physical Therapy",
    claimType: "Injury",
    city: "Milwaukee",
    estimate: "$1,180",
    readiness: 88,
  },
  {
    id: "p-004",
    name: "North Loop Glass",
    claimType: "Auto",
    city: "Minneapolis",
    estimate: "$640",
    readiness: 69,
  },
  {
    id: "p-005",
    name: "Pinecrest Drywall",
    claimType: "Home",
    city: "Des Moines",
    estimate: "$3,210",
    readiness: 81,
  },
  {
    id: "p-006",
    name: "Summit Rehab Network",
    claimType: "Injury",
    city: "Cleveland",
    estimate: "$2,360",
    readiness: 73,
  },
  {
    id: "p-007",
    name: "Harbor Auto Body",
    claimType: "Auto",
    city: "Detroit",
    estimate: "$4,190",
    readiness: 95,
  },
  {
    id: "p-008",
    name: "Evergreen Restoration",
    claimType: "Home",
    city: "Toledo",
    estimate: "$8,720",
    readiness: 58,
  },
  {
    id: "p-009",
    name: "Lakeside Imaging",
    claimType: "Injury",
    city: "Grand Rapids",
    estimate: "$910",
    readiness: 71,
  },
  {
    id: "p-010",
    name: "Atlas Tow Service",
    claimType: "Auto",
    city: "Indianapolis",
    estimate: "$520",
    readiness: 90,
  },
  {
    id: "p-011",
    name: "Cedar Ridge Contractors",
    claimType: "Home",
    city: "Cincinnati",
    estimate: "$5,980",
    readiness: 66,
  },
  {
    id: "p-012",
    name: "Metro Care Clinic",
    claimType: "Injury",
    city: "St. Louis",
    estimate: "$1,640",
    readiness: 79,
  },
];

export const CUSTOMER_NOTES = [
  "Customer uploaded hallway photos",
  "Water mitigation visit booked for Thursday",
  "Temporary housing approved through June 18",
  "Roof report still needs the contractor signature",
  "Payment hold clears after the recorded statement",
  "Send final repair choice to the customer by 3 PM",
];

export const SECOND_MS = 1000;
export const ACTIVITY_LOG_LIMIT = 5;
export const ACTIVITY_ID_INCREMENT = 1;
export const READINESS_MAX = 100;

const clockFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

let activityEntrySequence = 0;

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

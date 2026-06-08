type DemoRecord = {
  id: string;
  name: string;
  category: "Form" | "List" | "Detail";
  group: string;
  metric: string;
  progress: number;
};

export type ActivityEntry = {
  id: string;
  label: string;
};

export const DEMO_RECORDS = [
  {
    id: "record-001",
    name: "Sample item 01",
    category: "Form",
    group: "Group A",
    metric: "92ms",
    progress: 92,
  },
  {
    id: "record-002",
    name: "Sample item 02",
    category: "List",
    group: "Group A",
    metric: "76ms",
    progress: 76,
  },
  {
    id: "record-003",
    name: "Sample item 03",
    category: "Detail",
    group: "Group B",
    metric: "88ms",
    progress: 88,
  },
  {
    id: "record-004",
    name: "Sample item 04",
    category: "Form",
    group: "Group B",
    metric: "69ms",
    progress: 69,
  },
  {
    id: "record-005",
    name: "Sample item 05",
    category: "List",
    group: "Group C",
    metric: "81ms",
    progress: 81,
  },
  {
    id: "record-006",
    name: "Sample item 06",
    category: "Detail",
    group: "Group C",
    metric: "73ms",
    progress: 73,
  },
  {
    id: "record-007",
    name: "Sample item 07",
    category: "Form",
    group: "Group D",
    metric: "95ms",
    progress: 95,
  },
  {
    id: "record-008",
    name: "Sample item 08",
    category: "List",
    group: "Group D",
    metric: "58ms",
    progress: 58,
  },
  {
    id: "record-009",
    name: "Sample item 09",
    category: "Detail",
    group: "Group E",
    metric: "71ms",
    progress: 71,
  },
  {
    id: "record-010",
    name: "Sample item 10",
    category: "Form",
    group: "Group E",
    metric: "90ms",
    progress: 90,
  },
  {
    id: "record-011",
    name: "Sample item 11",
    category: "List",
    group: "Group F",
    metric: "66ms",
    progress: 66,
  },
  {
    id: "record-012",
    name: "Sample item 12",
    category: "Detail",
    group: "Group F",
    metric: "79ms",
    progress: 79,
  },
] satisfies DemoRecord[];

export const DEMO_DRAFT_LINES = [
  "First line stays in the cached textarea",
  "Second line remains after visiting another route",
  "Selected priority stays with the draft",
  "The timer pauses while the page is cached",
  "Activity entries show route cache visibility",
  "Manual close removes the saved page",
];

export const SECOND_MS = 1000;
export const ACTIVITY_LOG_LIMIT = 5;
export const ACTIVITY_ID_INCREMENT = 1;
export const PROGRESS_MAX = 100;

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

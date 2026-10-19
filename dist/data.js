export const demoEvents = [
  {
    id: "demo-spring",
    title: "Spring Drag Shootout",
    date: "2026-10-10",
    location: "Preview Raceway, Gauteng",
    distance: "1/4 mile",
    system_id: "01",
    status: "upcoming",
    description:
      "An example of an upcoming race day. The event schedule, venue and organisers shown here are demonstration content.",
    demo: true,
  },
  {
    id: "demo-quarter",
    title: "Quarter Mile Showdown",
    date: "2026-11-07",
    location: "Preview Raceway, Gauteng",
    distance: "1/4 mile",
    system_id: "02",
    status: "upcoming",
    description:
      "A sample quarter-mile event listing. Confirmed event details will appear here once published by the organisers.",
    demo: true,
  },
  {
    id: "demo-night",
    title: "Saturday Night Drags",
    date: "2026-12-05",
    location: "Example Drag Strip, Western Cape",
    distance: "1/8 mile",
    system_id: "03",
    status: "upcoming",
    description:
      "A sample evening event to demonstrate the future events calendar. This is not a confirmed booking.",
    demo: true,
  },
  {
    id: "demo-winter",
    title: "Winter Drag Series",
    date: "2026-08-22",
    location: "Preview Raceway, Gauteng",
    distance: "1/4 mile",
    system_id: "01",
    status: "past",
    description:
      "Demonstration archive with sample timing data. These times are not official racing results.",
    demo: true,
  },
  {
    id: "demo-street",
    title: "Street to Strip",
    date: "2026-07-18",
    location: "Example Drag Strip, Western Cape",
    distance: "1/8 mile",
    system_id: "03",
    status: "past",
    description:
      "Example race archive showing the type of event information members can search.",
    demo: true,
  },
  {
    id: "demo-speed",
    title: "Half Mile Challenge",
    date: "2026-06-13",
    location: "Example Airfield, Free State",
    distance: "1/2 mile",
    system_id: "02",
    status: "past",
    description:
      "Example half-mile event. All participant names and timing values are sample data.",
    demo: true,
  },
];
export const demoResults = [
  {
    run_no: 1,
    driver: "Sample driver A",
    vehicle: "Drag coupe",
    race_class: "Open",
    lane: 1,
    reaction: 0.241,
    elapsed: 10.824,
    speed: 211.6,
  },
  {
    run_no: 1,
    driver: "Sample driver B",
    vehicle: "Street hatch",
    race_class: "Street",
    lane: 2,
    reaction: 0.386,
    elapsed: 12.537,
    speed: 182.4,
  },
  {
    run_no: 2,
    driver: "Sample driver C",
    vehicle: "Turbo sedan",
    race_class: "Open",
    lane: 1,
    reaction: 0.192,
    elapsed: 11.206,
    speed: 201.8,
  },
  {
    run_no: 2,
    driver: "Sample driver D",
    vehicle: "Street coupe",
    race_class: "Street",
    lane: 2,
    reaction: 0.324,
    elapsed: 13.102,
    speed: 172.2,
  },
];
export function filterEvents(
  events,
  { status, query = "", distance = "", system = "" } = {},
) {
  const q = query.trim().toLowerCase();
  return events
    .filter(
      (e) =>
        (!status || e.status === status) &&
        (!distance || e.distance === distance) &&
        (!system || e.system_id === system) &&
        (!q || `${e.title} ${e.location} ${e.date}`.toLowerCase().includes(q)),
    )
    .sort((a, b) =>
      status === "past"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date),
    );
}
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}
export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

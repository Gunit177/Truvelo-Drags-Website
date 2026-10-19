import test from "node:test";
import assert from "node:assert/strict";
import { filterEvents, demoEvents, safeUrl, escapeHtml } from "../dist/data.js";
import { config } from "../dist/config.js";
let clientArguments;
globalThis.window = { supabase: { createClient: (...args) => { clientArguments = args; return {}; } } };
const { makeQuoteEmail, configured, readPages } = await import("../dist/services.js");

test("large result archives continue past the API page limit", async () => {
  const source = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const rows = await readPages(async (from, to) => ({
    data: source.slice(from, to + 1),
    error: null,
  }));
  assert.equal(rows.length, 1201);
  assert.equal(rows.at(-1).id, 1200);
});
test("pagination fails without returning a misleading partial archive", async () => {
  await assert.rejects(
    readPages(async () => ({ data: null, error: new Error("Offline") })),
    /Offline/,
  );
});
test("filters combine case-insensitive search, status, distance and system", () => {
  assert.deepEqual(
    filterEvents(demoEvents, {
      status: "upcoming",
      query: " GAUTENG ",
      distance: "1/4 mile",
      system: "02",
    }).map((e) => e.id),
    ["demo-quarter"],
  );
});
test("past events sort newest first; upcoming sort soonest first", () => {
  assert.equal(
    filterEvents(demoEvents, { status: "past" })[0].id,
    "demo-winter",
  );
  assert.equal(
    filterEvents(demoEvents, { status: "upcoming" })[0].id,
    "demo-spring",
  );
});
test("unmatched searches return an empty result without modifying source", () => {
  assert.deepEqual(filterEvents(demoEvents, { query: "no such event" }), []);
  assert.equal(demoEvents.length, 6);
});
test("live link allowlist rejects executable, insecure and malformed URLs", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "http://example.com",
    "//example.com",
    "",
  ])
    assert.equal(safeUrl(value), "");
  assert.equal(
    safeUrl("https://gunit177.github.io/Truvelo-Timing-Results/"),
    "https://gunit177.github.io/Truvelo-Timing-Results/",
  );
});
test("event and profile text cannot introduce HTML or attribute markup", () => {
  assert.equal(
    escapeHtml("<img src=x onerror=\"bad()\"> & 'x'"),
    "&lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; &#39;x&#39;",
  );
});
test("quote fields are URI-encoded and retained in the email body", () => {
  const uri = makeQuoteEmail({
    event_name: "A & B #1",
    name: "Sample Visitor",
    email: "sample@example.com",
    phone: "0123456789",
    venue: "Test track",
    distance: "1/4 mile",
    message: "Hello\nA & B",
  });
  const parsed = new URL(uri);
  assert.equal(parsed.pathname, "ralfgebert01@gmail.com");
  assert.equal(
    parsed.searchParams.get("subject"),
    "Event timing quotation — A & B #1",
  );
  assert.match(parsed.searchParams.get("body"), /Hello\nA & B/);
});
test("configured build initializes the browser client with verified public settings", () => {
  assert.equal(configured, true);
  assert.deepEqual(clientArguments, [config.supabase.url, config.supabase.publishableKey]);
  assert.equal(config.supabase.url, "https://jozxswzkuzdinkpmymel.supabase.co");
  assert.equal(config.previewData, false);
});

test("system identity keeps each owner linked to the correct dashboard", () => {
  assert.deepEqual(config.systems.map(({id, number, name, url}) => ({id, number, name, url})), [
    {id: "01", number: "001", name: "System 001 - Ralf", url: "https://gebert55.github.io/live-results/"},
    {id: "02", number: "002", name: "System 002 - Gareth", url: "https://gunit177.github.io/Truvelo-Timing-Results/"},
    {id: "03", number: "003", name: "System 003 - Pierre", url: "https://trudrags.github.io/live-results/"},
  ]);
});

test("member event requests select published events and results stay within the selected event", async () => {
  const {client, getEvents, getResults} = await import("../dist/services.js");
  const requests = [];
  client.from = (table) => {
    const request = { table, filters: [] }; requests.push(request);
    const query = {
      select: (columns) => { request.columns = columns; return query; },
      eq: (field, value) => { request.filters.push([field,value]); return query; },
      order: () => query,
      range: async () => ({data: [], error: null}),
    };
    return query;
  };
  await getEvents();
  await getResults("chosen-event");
  assert.deepEqual(requests, [
    {table: "events", columns: "*", filters: [["published", true]]},
    {table: "race_results", columns: "id,run_no,driver,vehicle,race_class,lane,reaction,sixty_ft,elapsed,speed", filters: [["event_id", "chosen-event"]]},
  ]);
});

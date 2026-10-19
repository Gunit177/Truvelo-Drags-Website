import { config } from "./config.js";
import { safeUrl } from "./data.js";
export const configured = Boolean(
  safeUrl(config.supabase.url) && config.supabase.publishableKey,
);
export const client = configured
  ? window.supabase.createClient(
      config.supabase.url,
      config.supabase.publishableKey,
    )
  : null;
export async function getEvents() {
  return readPages((from, to) =>
    client
      .from("events")
      .select("*")
      .eq("published", true)
      .order("date")
      .order("id")
      .range(from, to),
  );
}
export async function getResults(eventId) {
  return readPages((from, to) =>
    client
      .from("race_results")
      .select("id,run_no,driver,vehicle,race_class,lane,reaction,sixty_ft,elapsed,speed")
      .eq("event_id", eventId)
      .order("run_no")
      .order("lane")
      .range(from, to),
  );
}
export async function readPages(fetchPage, pageSize = 500) {
  const records = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    records.push(...data);
    if (data.length < pageSize) return records;
  }
}
export function makeQuoteEmail(data) {
  const subject = `Event timing quotation — ${data.event_name}`;
  const body = `Hello Ralf,\n\nI would like a quotation for event timing.\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nOrganisation: ${data.organisation || "Not specified"}\nEvent: ${data.event_name}\nDate: ${data.event_date || "To be confirmed"}\nVenue: ${data.venue}\nRace distance: ${data.distance}\n\nRequirements:\n${data.message}\n\nKind regards,\n${data.name}`;
  return `mailto:${config.company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

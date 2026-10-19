import { config } from "./config.js";
import {
  demoEvents,
  demoResults,
  filterEvents,
  escapeHtml as esc,
  safeUrl,
} from "./data.js";
import {
  client,
  configured,
  getEvents,
  getResults,
  makeQuoteEmail,
} from "./services.js";
const systemName = (id) => config.systems.find((system) => system.id === id)?.name || `System ${id}`;
const main = document.querySelector("main");
const modal = document.querySelector("#modal");
let events = config.previewData ? demoEvents : [];
let user = null,
  loadError = "",
  loading = false,
  eventRequest = 0;
let filters = { query: "", distance: "", system: "" };
const arrow = '<span aria-hidden="true">↗</span>';
const dateParts = (date) => {
  const d = new Date(date + "T12:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-ZA", { month: "short" }).toUpperCase(),
    full: d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
};
function systemCards() {
  return `<div class="system-grid">${config.systems.map((s) => `<article class="system-card"><div class="system-top"><span class="system-no">SYSTEM / ${esc(s.number)}</span><span class="status ${safeUrl(s.url) && s.status === "live" ? "live" : ""}">${safeUrl(s.url) && s.status === "live" ? "● Live now" : safeUrl(s.url) ? "Dashboard" : "Standby"}</span></div><div class="system-content"><h3>${esc(s.name)}</h3><p>${esc(s.team)}</p></div><div class="system-footer">${safeUrl(s.url) ? `<a class="text-link" href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">Open timing dashboard ${arrow}</a>` : '<span>Live link coming soon</span><span aria-hidden="true">↗</span>'}</div></article>`).join("")}</div>`;
}
function eventRows(list) {
  return list
    .map((e) => {
      const d = dateParts(e.date);
      return `<article class="event-row"><div class="event-date"><strong>${d.day}</strong><span>${d.month}</span></div><div class="event-body"><h3>${esc(e.title)}</h3><p>${esc(e.location)} <span aria-hidden="true">·</span> ${esc(e.distance)}</p></div><button class="arrow-button" data-event="${esc(e.id)}" aria-label="View ${esc(e.title)}">↗</button></article>`;
    })
    .join("");
}
function previewNotice() {
  return config.previewData
    ? '<div class="notice"><span class="sample-label">PREVIEW</span><span>Event listings and results are sample data. Confirmed events and team links will be added before launch.</span></div>'
    : "";
}
function renderHome() {
  main.innerHTML = `<div class="shell"><div class="intro-bar"><span class="eyebrow">Welcome to the race hub</span><span class="date-line">SOUTH AFRICA <span> / SAST</span></span></div><section class="hero"><div class="hero-content"><div class="eyebrow">Every run. Every reaction. Every result.</div><h1>YOUR SEAT AT<br><span>THE START LINE.</span></h1><p>Follow the action. Find your next event.<br>Relive every run with Truvelo Drags.</p><div class="hero-actions"><a class="button primary" href="#live">Explore live timing ${arrow}</a><a class="button" href="#events">Find an event <span aria-hidden="true">→</span></a></div></div><div class="hero-stamp"><strong>TRUVELO DRAGS</strong>BUILT FOR THE STRIP</div></section><div class="info-strip"><div class="strip-item"><span class="strip-icon">03</span><div><b>Timing systems</b><small>One connected race hub</small></div></div><div class="strip-item"><span class="strip-icon">↗</span><div><b>Trackside to your screen</b><small>Follow the teams’ timing dashboards</small></div></div><div class="strip-item"><span class="strip-icon">¼</span><div><b>Every distance. Every run.</b><small>⅛ mile · ¼ mile · ½ mile</small></div></div></div><section class="section"><div class="section-head"><div><h2>LIVE FROM THE STRIP</h2><p>Choose a timing system to follow the action.</p></div><a href="#live">All systems ${arrow}</a></div>${systemCards()}</section><div class="split"><section><div class="section-head"><h2>NEXT ON THE GRID</h2>${config.previewData ? '<span class="sample-label">SAMPLE EVENTS</span>' : ""}<a href="#events">View calendar ${arrow}</a></div><div class="event-list">${events.length ? eventRows(filterEvents(events, { status: "upcoming" }).slice(0, 2)) : '<div class="empty">' + (user ? "The next events will be announced here." : "Log in to view the event calendar.") + "</div>"}</div></section><section><div class="section-head"><h2>THE FINISH LINE</h2><span class="kicker" style="margin:0">Results archive</span></div><div class="member-panel"><div class="kicker">YOUR RUN. ON RECORD.</div><h3>THE NUMBERS TELL THE STORY.</h3><p>Search past events, find your run and explore reaction times, elapsed times and speeds.</p><a href="#history" class="button small">Explore race results ${arrow}</a></div></section></div>${previewNotice()}</div>`;
}
function pageTitle(kicker, title, description) {
  return `<div class="page-top"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>`;
}
function openModal(content, wide = false) {
  modal.classList.toggle("wide-dialog", wide);
  document.querySelector("#modal-content").innerHTML = content;
  if (!modal.open) modal.showModal();
}
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.style.display = "none"), 6000);
}
function authGate() {
  return `<div class="empty"><div class="eyebrow" style="justify-content:center;margin-bottom:17px">The members’ race hub</div><h3>All your events. Every result.</h3><p>Log in or create a free account to search the calendar and race archive.</p><button class="button primary" data-action="login">Log in to continue ${arrow}</button></div>`;
}
function renderLive() {
  main.innerHTML = `<div class="shell">${pageTitle("Trackside, wherever you are", "LIVE TIMING", "Three timing systems. Follow the official team dashboards for current runs and trackside results.")}${systemCards()}<div class="notice"><span>Timing dashboards open in a new tab. Availability and the information shown are managed by each trackside team.</span></div><section class="contact-panel" style="margin:30px 0 45px"><div class="section-head"><div><h2>BRING PRECISION TO YOUR EVENT</h2><p>Contact Ralf to discuss timing for your next drag racing event.</p></div><a class="button primary" href="#contact">Request a quote ${arrow}</a></div></section></div>`;
}
function eventCards(list) {
  if (!list.length)
    return '<div class="empty"><h3>No events found</h3><p>Try another event name, location or distance.</p><button class="button" data-action="clear-filters">Clear filters</button></div>';
  return list
    .map((e) => {
      const d = dateParts(e.date);
      return `<article class="event-card"><div class="event-card-band"><div class="display">${d.day}<span>${d.month} ${e.date.slice(0, 4)}</span></div><span class="distance">${esc(e.distance)}</span></div><div class="event-card-content">${e.demo ? '<div class="kicker" style="color:#e9cb68">Sample event</div>' : ""}<h3>${esc(e.title)}</h3><p>${esc(e.location)}<br>${esc(systemName(e.system_id))}</p><button class="button" data-event="${esc(e.id)}">${e.status === "past" ? "View results" : "Event details"} ${arrow}</button></div></article>`;
    })
    .join("");
}
function renderEvents(past = false) {
  main.innerHTML = `<div class="shell">${pageTitle(past ? "The race archive" : "Plan your next race day", past ? "HISTORY & RESULTS" : "FUTURE EVENTS", past ? "Every run leaves a record. Explore past events and find the numbers that matter." : "Find what’s next on the strip. Search by event, location or race distance.")}${previewNotice()}${!config.previewData && !user ? authGate() : `<div class="toolbar" role="search"><div class="search-wrap"><span aria-hidden="true">⌕</span><label class="visually-hidden" for="event-search">Search events or locations</label><input id="event-search" type="search" placeholder="Search events or locations…" value="${esc(filters.query)}"></div><label class="visually-hidden" for="distance-filter">Race distance</label><select id="distance-filter"><option value="">All distances</option>${["1/8 mile", "1/4 mile", "1/2 mile"].map((d) => `<option ${filters.distance === d ? "selected" : ""}>${d}</option>`).join("")}</select><label class="visually-hidden" for="system-filter">Timing system</label><select id="system-filter"><option value="">All systems</option>${config.systems.map((s) => `<option value="${esc(s.id)}" ${filters.system === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div><div class="section-head"><p id="result-count" role="status" aria-live="polite"></p><span class="kicker">${past ? "Newest first" : "Soonest first"}</span></div><div class="event-grid" id="event-results"></div>`}<div style="height:35px"></div></div>`;
  updateEventResults(past);
}
function updateEventResults(past = location.hash === "#history") {
  const target = document.querySelector("#event-results");
  if (!target) return;
  if (loading) {
    target.innerHTML = '<div class="empty" role="status">Loading events…</div>';
    return;
  }
  if (loadError) {
    target.innerHTML =
      '<div class="empty"><h3>Events are temporarily unavailable</h3><p>Please try again in a moment.</p><button class="button" data-action="retry">Try again</button></div>';
    return;
  }
  const list = filterEvents(events, {
    ...filters,
    status: past ? "past" : "upcoming",
  });
  document.querySelector("#result-count").textContent =
    `${list.length} ${list.length === 1 ? "event" : "events"}${config.previewData ? " · demonstration listings" : ""}`;
  target.innerHTML = eventCards(list);
}
function renderContact() {
  const c = config.company;
  main.innerHTML = `<div class="shell">${pageTitle("Let’s make race day happen", "CONTACT THE TEAM", "Planning a drag racing event? Tell us what you have in mind and we’ll help you get the timing right.")}<div class="contact-layout"><aside><div class="contact-panel"><div class="eyebrow">Your event timing contact</div><h2 style="margin-top:15px">RALF GEBERT</h2><p class="muted">${esc(c.name)}</p><div class="contact-item"><strong>Call Ralf</strong><a href="tel:${esc(c.phoneInternational)}">${esc(c.phone)}</a></div><div class="contact-item"><strong>Email</strong><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div><div class="contact-item"><strong>Address & location</strong><p>${esc(c.address || "Address to be confirmed")}</p>${safeUrl(c.mapUrl) ? `<a href="${esc(safeUrl(c.mapUrl))}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>` : '<small class="muted">Contact Ralf for meeting and venue arrangements.</small>'}</div><div class="partner"><img src="assets/ralf-gebert-logo.png" alt="Ralf Gebert Timing Systems logo"><p>Event timing by<strong>Ralf Gebert Timing Systems</strong>Truvelo drag racing systems</p></div></div></aside><section class="contact-panel"><h2>REQUEST A QUOTATION</h2><p class="form-note">${config.quoteFunctionUrl ? "Send your event requirements to the team." : "Complete the details below to prepare an email to Ralf. You’ll review and send it in your email app."}</p><form id="quote-form"><div class="form-grid"><label class="field">Full name<input name="name" autocomplete="name" required maxlength="100"></label><label class="field">Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label class="field">Contact number<input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label><label class="field">Organisation <span class="muted">(optional)</span><input name="organisation" autocomplete="organization" maxlength="120"></label><label class="field full">Event name<input name="event_name" required maxlength="160" placeholder="What’s your event called?"></label><label class="field">Preferred date <span class="muted">(optional)</span><input name="event_date" type="date" min="${new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" })}"></label><label class="field">Race distance<select name="distance"><option>1/4 mile</option><option>1/8 mile</option><option>1/2 mile</option><option>Other / to be confirmed</option></select></label><label class="field full">Venue / town<input name="venue" required maxlength="200" placeholder="Where will the event take place?"></label><label class="field full">Tell us about your event<textarea name="message" required maxlength="2000" placeholder="Expected number of entrants, timing requirements and anything else we should know…"></textarea></label><label class="honey" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label class="checkbox full"><input type="checkbox" name="consent" required><span>I agree that Ralf Gebert Timing Systems may use these details to respond to my quotation request. <button type="button" class="text-button" data-action="privacy">View privacy information.</button></span></label><div id="quote-verification" class="full"></div><button type="submit" class="button primary full">${config.quoteFunctionUrl ? "Send quote request" : "Prepare quote email"} ${arrow}</button></div><div id="quote-status" class="form-status" role="status" aria-live="polite"></div></form></section></div></div>`;
  if (config.quoteFunctionUrl) loadTurnstile();
}
function privacy() {
  openModal(
    `<div class="eyebrow">Your information</div><h2 id="modal-title">PRIVACY & YOUR DATA</h2><div class="privacy-body"><p>Ralf Gebert Timing Systems uses your contact details to manage your account and respond to event enquiries.</p><h3>Accounts</h3><p>When registration is enabled, Supabase manages email authentication and passwords. Your name, email and optional phone number are used for your member profile. Your password is never stored in a profile table.</p><h3>Quotation requests</h3><p>In email mode, this form prepares a message in your email app. Nothing is sent until you send the email. If direct submission is enabled, your request is stored privately for the event team.</p><h3>Storage and access</h3><p>The site uses browser storage for your sign-in session. There are no advertising trackers or automatic marketing subscriptions. Google Fonts supplies the typefaces. Bot verification is used only when direct quotation submission is enabled.</p><p>To request access, correction or deletion of your information, contact <a class="text-link" href="mailto:${esc(config.company.email)}">${esc(config.company.email)}</a>.</p></div>`,
  );
}
function authDialog(mode = "login") {
  if (user && mode === "login") {
    openModal(
      `<div class="eyebrow">Your race hub account</div><h2 id="modal-title">WELCOME BACK</h2><p>${esc(user.user_metadata?.full_name || user.email)}</p><a class="button primary" href="#history" data-close>Explore results ${arrow}</a><button style="margin-left:10px" class="button" data-action="logout">Log out</button>`,
    );
    return;
  }
  const signup = mode === "signup",
    reset = mode === "reset",
    update = mode === "update";
  const title = signup
    ? "JOIN THE RACE HUB"
    : reset
      ? "RESET YOUR PASSWORD"
      : update
        ? "SET A NEW PASSWORD"
        : "BACK AT THE START LINE";
  openModal(
    `<div class="eyebrow">Ralf Gebert Timing Systems</div><h2 id="modal-title">${title}</h2><p>${signup ? "Create your account to explore events and race results." : reset ? "We’ll email you a link to choose a new password." : update ? "Choose a new password for your account." : "Log in for event history and your race results."}</p>${!configured ? '<div class="connection-note">Member accounts are not open yet. Registration and login will be available when the membership service is connected.</div>' : ""}<form id="auth-form" data-mode="${mode}">${signup ? '<label class="field">Full name<input name="full_name" autocomplete="name" required maxlength="100"></label><label class="field">Phone <span class="muted">(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="30"></label>' : ""}${!update ? '<label class="field">Email address<input name="email" type="email" autocomplete="email" required maxlength="254"></label>' : ""}${!reset ? `<label class="field">Password<input name="password" type="password" autocomplete="${signup || update ? "new-password" : "current-password"}" minlength="${signup || update ? 12 : 1}" required maxlength="128" ${signup || update ? 'placeholder="At least 12 characters"' : ""}></label>` : ""}${signup ? '<label class="checkbox"><input name="consent" type="checkbox" required><span>I agree to the use of my details for my account. <button type="button" class="text-button" data-action="privacy">Privacy information</button></span></label>' : ""}${!signup && !reset && !update ? '<div class="auth-options"><span>Welcome back to the strip.</span><button type="button" class="text-button" data-auth="reset">Forgot password?</button></div>' : ""}<button class="button primary" ${!configured ? "disabled" : ""}>${signup ? "Create account" : reset ? "Send reset link" : update ? "Update password" : "Log in"} ${arrow}</button><div class="form-status" id="auth-status" role="status"></div></form><div class="auth-switch">${signup || reset ? '<span>Already have an account?</span><button class="text-button" data-auth="login">Log in</button>' : update ? "" : '<span>New to the race hub?</span><button class="text-button" data-auth="signup">Create an account</button>'}</div>`,
  );
}
async function submitAuth(form) {
  if (!client) return;
  const data = Object.fromEntries(new FormData(form));
  const mode = form.dataset.mode;
  const button = form.querySelector('button[type="submit"],button.button');
  const status = form.querySelector("#auth-status");
  button.disabled = true;
  status.textContent = "Please wait…";
  try {
    let result;
    if (mode === "signup")
      result = await client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: location.origin + location.pathname,
          data: {
            full_name: data.full_name.trim(),
            phone: data.phone?.trim() || "",
            privacy_accepted_at: new Date().toISOString(),
          },
        },
      });
    else if (mode === "reset")
      result = await client.auth.resetPasswordForEmail(data.email, {
        redirectTo: location.origin + location.pathname + "?recovery=1",
      });
    else if (mode === "update")
      result = await client.auth.updateUser({ password: data.password });
    else
      result = await client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
    if (result.error) throw result.error;
    if (mode === "reset") {
      status.textContent =
        "If this address has an account, a reset link is on its way. Check your inbox.";
    } else if (mode === "signup" && !result.data.session) {
      form.reset();
      status.textContent =
        "Check your email to confirm your account, then log in.";
    } else {
      modal.close();
      toast(
        mode === "update"
          ? "Your password has been updated."
          : "You’re signed in. Welcome to the race hub.",
      );
      if (mode === "update")
        history.replaceState(null, "", location.pathname + "#history");
    }
  } catch (error) {
    status.textContent =
      error.message || "We could not complete that request. Please try again.";
  } finally {
    button.disabled = false;
  }
}
async function showEvent(id) {
  const e = events.find((item) => item.id === id);
  if (!e) return;
  if (e.status === "past") {
    if (!e.demo && !user) {
      authDialog();
      return;
    }
    const token = ++eventRequest;
    openModal(
      `<div class="eyebrow">${e.demo ? "Sample event · demonstration results" : "Official event archive"}</div><h2 id="modal-title">${esc(e.title)}</h2><p>${dateParts(e.date).full} · ${esc(e.location)} · ${esc(e.distance)}</p><div id="race-results" role="status">Loading results…</div>`,
      true,
    );
    try {
      const results = e.demo ? demoResults : await getResults(e.id);
      if (token !== eventRequest || !modal.open) return;
      document.querySelector("#race-results").innerHTML = results.length
        ? `<p class="form-note">${e.demo ? "These are sample runs, not official timing records. " : ""}Times in seconds. Speed in km/h. ET measured over ${esc(e.distance)}.</p><label class="field" for="run-search">Find a driver, vehicle, class or run</label><input id="run-search" type="search" placeholder="Search this event’s results…"><p id="run-count" class="form-note" role="status"></p><div class="table-wrap"><table id="runs-table"><thead><tr><th>Run / lane</th><th>Driver / vehicle</th><th>Class</th><th>Reaction (s)</th><th>60 ft (s)</th><th>ET (s)</th><th>Speed (km/h)</th></tr></thead><tbody>${results.map((r) => `<tr><td>${esc(r.run_no)} / ${esc(r.lane)}</td><td>${esc(r.driver)}<br><small class="muted">${esc(r.vehicle)}</small></td><td>${esc(r.race_class)}</td><td class="metric">${metric(r.reaction, 3)}</td><td class="metric">${metric(r.sixty_ft, 3)}</td><td class="metric">${metric(r.elapsed, 3)}</td><td class="metric">${metric(r.speed, 1)}</td></tr>`).join("")}</tbody></table></div>`
        : '<div class="empty">No results have been published for this event yet.</div>';
    } catch {
      if (token === eventRequest && document.querySelector("#race-results"))
        document.querySelector("#race-results").textContent =
          "Results could not be loaded. Close this window and try again.";
    }
  } else {
    openModal(
      `<div class="eyebrow">${e.demo ? "Sample event" : "Upcoming event"}</div><h2 id="modal-title">${esc(e.title)}</h2><dl class="modal-details"><div><dt>Date</dt><dd>${dateParts(e.date).full}</dd></div><div><dt>Distance</dt><dd>${esc(e.distance)}</dd></div><div><dt>Venue</dt><dd>${esc(e.location)}</dd></div><div><dt>Timing</dt><dd>${esc(systemName(e.system_id))}</dd></div></dl><p>${esc(e.description || "Contact the team for event arrangements.")}</p><a href="#contact" class="button primary" data-close>Contact the team ${arrow}</a>`,
    );
  }
}
function metric(value, digits) {
  return value === null || value === undefined
    ? "—"
    : Number.isFinite(Number(value))
      ? Number(value).toFixed(digits)
      : "—";
}
async function refreshEvents() {
  const request = ++refreshEvents.sequence;
  if (config.previewData) {
    events = demoEvents;
    render();
    return;
  }
  if (!client || !user) {
    events = [];
    render();
    return;
  }
  loading = true;
  loadError = "";
  render();
  try {
    const data = await getEvents();
    if (request === refreshEvents.sequence) events = data;
  } catch {
    if (request === refreshEvents.sequence) loadError = "unavailable";
  } finally {
    if (request === refreshEvents.sequence) {
      loading = false;
      render();
    }
  }
}
refreshEvents.sequence = 0;
function render() {
  const route = location.hash.slice(1) || "home";
  if (route === "events" || route === "history")
    renderEvents(route === "history");
  else if (route === "contact") renderContact();
  else if (route === "live") renderLive();
  else renderHome();
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === route;
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelector("#account-label").textContent = user
    ? "My account"
    : "Log in";
}
let turnstileWidget = null;
function loadTurnstile() {
  if (!config.turnstileSiteKey) return;
  const mount = () => {
    if (document.querySelector("#quote-verification")) {
      if (turnstileWidget !== null)
        try {
          window.turnstile.remove(turnstileWidget);
        } catch {}
      turnstileWidget = window.turnstile.render("#quote-verification", {
        sitekey: config.turnstileSiteKey,
        theme: "dark",
      });
    }
  };
  if (window.turnstile) {
    mount();
    return;
  }
  let script = document.querySelector("#turnstile-script");
  if (!script) {
    script = document.createElement("script");
    script.id = "turnstile-script";
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    document.head.append(script);
  }
  script.addEventListener("load", mount, { once: true });
}
async function submitQuote(form) {
  const data = Object.fromEntries(new FormData(form));
  if (data.website) return;
  const status = form.querySelector("#quote-status");
  if (!config.quoteFunctionUrl) {
    const href = makeQuoteEmail(data);
    status.innerHTML = `Your email draft is ready. <a class="text-link" id="open-quote-email" href="${esc(href)}">Open your email app ${arrow}</a><br>Review the message and press Send in your email app. Nothing has been sent yet.`;
    document.querySelector("#open-quote-email").focus();
    return;
  }
  const button = form.querySelector('[type="submit"]');
  const token = window.turnstile?.getResponse(turnstileWidget);
  if (!token) {
    status.textContent = "Please complete the verification before sending.";
    return;
  }
  button.disabled = true;
  status.textContent = "Sending your request…";
  try {
    const response = await fetch(config.quoteFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, turnstile_token: token }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "The request could not be sent.");
    form.reset();
    status.textContent = `Your request has been saved for the team. Reference: ${result.reference}. For urgent enquiries, call ${config.company.phone}.`;
  } catch (error) {
    status.textContent =
      error.name === "TimeoutError"
        ? "The connection timed out. Please contact Ralf to check whether your request arrived before resending."
        : error.message || "We could not send your request. Please try again.";
  } finally {
    button.disabled = false;
    window.turnstile?.reset(turnstileWidget);
  }
}
document.addEventListener("click", async (e) => {
  const target = e.target.closest(
    "[data-action],[data-auth],[data-event],[data-close]",
  );
  if (!target) return;
  if (target.hasAttribute("data-close")) {
    modal.close();
    return;
  }
  if (target.dataset.auth) {
    authDialog(target.dataset.auth);
    return;
  }
  if (target.dataset.event) {
    showEvent(target.dataset.event);
    return;
  }
  switch (target.dataset.action) {
    case "login":
      authDialog();
      break;
    case "privacy":
      privacy();
      break;
    case "logout": {
      const { error } = await client.auth.signOut();
      if (error) {
        toast("Could not log out. Please try again.");
        break;
      }
      events = [];
      user = null;
      modal.close();
      render();
      toast("You have been logged out.");
      break;
    }
    case "clear-filters":
      filters = { query: "", distance: "", system: "" };
      renderEvents(location.hash === "#history");
      break;
    case "retry":
      refreshEvents();
      break;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "run-search") {
    const query = e.target.value.trim().toLowerCase();
    const rows = [...document.querySelectorAll("#runs-table tbody tr")];
    for (const row of rows)
      row.hidden = !row.textContent.toLowerCase().includes(query);
    document.querySelector("#run-count").textContent =
      rows.filter((row) => !row.hidden).length + " matching runs";
  }
  if (e.target.id === "event-search") {
    filters.query = e.target.value;
    updateEventResults();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "distance-filter") {
    filters.distance = e.target.value;
    updateEventResults();
  }
  if (e.target.id === "system-filter") {
    filters.system = e.target.value;
    updateEventResults();
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "auth-form") {
    e.preventDefault();
    submitAuth(e.target);
  }
  if (e.target.id === "quote-form") {
    e.preventDefault();
    submitQuote(e.target);
  }
});
document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector(".menu-button").addEventListener("click", (e) => {
  const open = document.querySelector("nav").classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", String(open));
});
document
  .querySelector(".modal-close")
  .addEventListener("click", () => modal.close());
window.addEventListener("hashchange", () => {
  filters = { query: "", distance: "", system: "" };
  document.querySelector("nav").classList.remove("open");
  document.querySelector(".menu-button").setAttribute("aria-expanded", "false");
  modal.close();
  render();
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
});
modal.addEventListener("close", () => {
  eventRequest++;
});
render();
if (client) {
  client.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    if (event === "TOKEN_REFRESHED") return;
    refreshEvents.sequence++;
    if (!user && !config.previewData) events = [];
    setTimeout(async () => {
      if (event === "PASSWORD_RECOVERY") {
        authDialog("update");
        return;
      }
      if (user) {
        const { error } = await client
          .from("profiles")
          .upsert(
            {
              id: user.id,
              full_name: user.user_metadata?.full_name || "",
              phone: user.user_metadata?.phone || "",
              privacy_accepted_at:
                user.user_metadata?.privacy_accepted_at || null,
            },
            { onConflict: "id" },
          );
        if (error)
          toast(
            "Signed in, but your profile could not be updated. Contact the team if this continues.",
          );
      }
      refreshEvents();
    }, 0);
  });
}
// Optional browser-agent tool. Uses exactly the same search state and access rules as the UI.
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: "search_race_events",
        description:
          "Search the visible future events or history page. Only sample events are available without an account in preview mode.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            view: { type: "string", enum: ["upcoming", "past"] },
          },
          required: ["query", "view"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          if (
            !input ||
            typeof input.query !== "string" ||
            input.query.length > 200 ||
            !["upcoming", "past"].includes(input.view)
          )
            throw new Error("Provide query text and an upcoming or past view.");
          if (!config.previewData && !user)
            throw new Error("Please log in first.");
          history.replaceState(
            null,
            "",
            "#" + (input.view === "past" ? "history" : "events"),
          );
          filters = { query: input.query, distance: "", system: "" };
          render();
          return {
            events: filterEvents(events, {
              ...filters,
              status: input.view,
            }).map(({ id, title, date, location }) => ({
              id,
              title,
              date,
              location,
            })),
          };
        },
      }),
    ).catch(() => {});
  } catch {}
}

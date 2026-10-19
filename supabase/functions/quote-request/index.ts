// Optional public quotation inbox. Email-draft mode works without this function.
// Deploy only after setting ALLOWED_ORIGINS, TURNSTILE_SECRET_KEY and
// QUOTE_DATABASE_SECRET_KEY (a Supabase secret key, held on the server only).
const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (!allowed.includes(origin))
    return json({ error: "This website is not authorised." }, 403, {});
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405, cors);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSON required." }, 415, cors);
  try {
    // Limit the body while streaming; Content-Length alone is not trustworthy.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Request body is required." }, 400, cors);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        return json({ error: "Request too large." }, 413, cors);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json({ error: "Invalid request." }, 400, cors);
    }
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      body.website
    )
      return json({ error: "Invalid request." }, 400, cors);
    const limits: Record<string, number> = {
      name: 100,
      email: 254,
      phone: 30,
      organisation: 120,
      event_name: 160,
      venue: 200,
      message: 2000,
    };
    const fields: Record<string, unknown> = {};
    for (const [key, max] of Object.entries(limits)) {
      const value =
        typeof body[key] === "string" ? (body[key] as string).trim() : "";
      if ((key !== "organisation" && !value) || value.length > max)
        return json(
          { error: "Please check the " + key.replaceAll("_", " ") + " field." },
          400,
          cors,
        );
      fields[key] = value;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email as string))
      return json({ error: "Please enter a valid email address." }, 400, cors);
    if (body.consent !== "on" && body.consent !== true)
      return json({ error: "Your consent is required." }, 400, cors);
    if (
      !["1/8 mile", "1/4 mile", "1/2 mile", "Other / to be confirmed"].includes(
        body.distance as string,
      )
    )
      return json({ error: "Invalid race distance." }, 400, cors);
    const date = body.event_date || null;
    if (
      date &&
      (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      return json({ error: "Invalid event date." }, 400, cors);
    if (
      typeof body.turnstile_token !== "string" ||
      body.turnstile_token.length > 2048
    )
      return json({ error: "Please complete verification." }, 400, cors);
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    const databaseKey = Deno.env.get("QUOTE_DATABASE_SECRET_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    if (!secret || !databaseKey || !url)
      return json(
        {
          error:
            "Enquiries are temporarily unavailable. Please email or call Ralf.",
        },
        503,
        cors,
      );
    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: body.turnstile_token }),
        signal: AbortSignal.timeout(10000),
      },
    );
    const check = await verify.json();
    if (!check.success || check.hostname !== new URL(origin).hostname)
      return json(
        { error: "Verification expired. Please try again." },
        400,
        cors,
      );
    const response = await fetch(url + "/rest/v1/quote_requests?select=id", {
      method: "POST",
      headers: {
        apikey: databaseKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        ...fields,
        event_date: date,
        distance: body.distance,
        consent: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      return json(
        { error: "We could not save your enquiry. Please email or call Ralf." },
        503,
        cors,
      );
    const rows = await response.json();
    return json({ reference: rows[0].id }, 201, cors);
  } catch {
    return json(
      {
        error:
          "We could not complete the request. Please contact Ralf before trying again.",
      },
      503,
      cors,
    );
  }
});

export interface Env {
  DB: D1Database;
}

const ALLOWED_ORIGINS = new Set([
  "https://whitneylcj.github.io",
  "http://127.0.0.1:4321",
  "http://localhost:4321"
]);

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://whitneylcj.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(request: Request, body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...(init.headers ?? {})
    }
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clampDays(value: string | null) {
  const parsed = Number(value ?? "30");
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(365, Math.max(1, Math.floor(parsed)));
}

function startDay(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

function readCountryCode(request: Request) {
  const cf = request.cf as IncomingRequestCfProperties | undefined;
  const country = String(cf?.country ?? "XX").toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "XX";
}

async function collectVisit(request: Request, env: Env) {
  const countryCode = readCountryCode(request);
  if (countryCode === "XX" || countryCode === "T1") {
    return jsonResponse(request, { ok: true, collected: false, reason: "unknown-country" });
  }

  const day = today();
  await env.DB.prepare(
    `INSERT INTO visits (country_code, day, count)
     VALUES (?, ?, 1)
     ON CONFLICT(country_code, day)
     DO UPDATE SET count = count + 1`
  )
    .bind(countryCode, day)
    .run();

  await env.DB.prepare(
    `INSERT INTO meta (key, value)
     VALUES ('last_updated', ?)
     ON CONFLICT(key)
     DO UPDATE SET value = excluded.value`
  )
    .bind(new Date().toISOString())
    .run();

  return jsonResponse(request, { ok: true, collected: true, countryCode });
}

async function summary(request: Request, env: Env) {
  const url = new URL(request.url);
  const days = clampDays(url.searchParams.get("days"));
  const since = startDay(days);

  const result = await env.DB.prepare(
    `SELECT country_code, SUM(count) AS visits
     FROM visits
     WHERE day >= ?
     GROUP BY country_code
     ORDER BY visits DESC`
  )
    .bind(since)
    .all<{ country_code: string; visits: number }>();

  const countries = (result.results ?? []).map((row) => ({
    countryCode: row.country_code,
    countryName: countryNames.of(row.country_code) ?? row.country_code,
    visits: Number(row.visits)
  }));

  const total = countries.reduce((sum, country) => sum + country.visits, 0);
  const meta = await env.DB.prepare("SELECT value FROM meta WHERE key = 'last_updated'").first<{ value: string }>();

  return jsonResponse(request, {
    total,
    countries,
    lastUpdated: meta?.value ?? new Date().toISOString()
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    if (url.pathname === "/collect" && request.method === "POST") {
      return collectVisit(request, env);
    }

    if (url.pathname === "/summary" && request.method === "GET") {
      return summary(request, env);
    }

    return jsonResponse(request, { error: "Not found" }, { status: 404 });
  }
};

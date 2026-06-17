/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
}

const ALLOWED_ORIGINS = new Set([
  "https://whitneylcj.github.io",
  "https://changjianliu.cn",
  "http://127.0.0.1:4321",
  "http://localhost:4321"
]);

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

type RequestCfGeo = IncomingRequestCfProperties & {
  city?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  region?: string | null;
  regionCode?: string | null;
};

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
  const cf = request.cf as RequestCfGeo | undefined;
  const country = String(cf?.country ?? "XX").toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "XX";
}

function cleanText(value: unknown, maxLength = 80) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLength);
}

function cleanRegionCode(value: unknown) {
  const code = cleanText(value, 24).toUpperCase();
  return /^[A-Z0-9-]{1,24}$/.test(code) ? code : "";
}

function slugRegion(value: string) {
  const asciiSlug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (asciiSlug) return asciiSlug;

  return Array.from(value)
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-")
    .slice(0, 48);
}

function cleanCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return Math.round(parsed * 10) / 10;
}

function readRegionVisit(request: Request) {
  const cf = request.cf as RequestCfGeo | undefined;
  const countryCode = readCountryCode(request);
  const regionName = cleanText(cf?.region);
  const cityName = cleanText(cf?.city);
  const regionCode = cleanRegionCode(cf?.regionCode);
  const regionKey = regionCode || (regionName ? slugRegion(regionName) : "");

  if (!regionKey || !regionName) {
    return null;
  }

  return {
    countryCode,
    regionCode,
    regionKey,
    regionName,
    cityName,
    latitude: cleanCoordinate(cf?.latitude, -90, 90),
    longitude: cleanCoordinate(cf?.longitude, -180, 180)
  };
}

async function collectRegionVisit(request: Request, env: Env, day: string) {
  const region = readRegionVisit(request);
  if (!region || region.countryCode === "XX" || region.countryCode === "T1") return;

  await env.DB.prepare(
    `INSERT INTO regional_visits
       (country_code, region_key, region_code, region_name, city_name, latitude, longitude, day, count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(country_code, region_key, city_name, day)
     DO UPDATE SET
       count = count + 1,
       region_code = excluded.region_code,
       region_name = excluded.region_name,
       latitude = COALESCE(excluded.latitude, regional_visits.latitude),
       longitude = COALESCE(excluded.longitude, regional_visits.longitude)`
  )
    .bind(
      region.countryCode,
      region.regionKey,
      region.regionCode || null,
      region.regionName,
      region.cityName,
      region.latitude,
      region.longitude,
      day
    )
    .run();
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

  try {
    await collectRegionVisit(request, env, day);
  } catch {
    // Keep country-level analytics working until the regional D1 migration is applied.
  }

  await env.DB.prepare(
    `INSERT INTO meta (key, value)
     VALUES ('last_updated', ?)
     ON CONFLICT(key)
     DO UPDATE SET value = excluded.value`
  )
    .bind(new Date().toISOString())
    .run();

  return jsonResponse(request, { ok: true, collected: true, countryCode, granularity: "region" });
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

  const countryRows = (result.results ?? []) as { country_code: string; visits: number }[];
  const countries = countryRows.map((row) => ({
    countryCode: row.country_code,
    countryName: countryNames.of(row.country_code) ?? row.country_code,
    visits: Number(row.visits)
  }));

  const total = countries.reduce((sum, country) => sum + country.visits, 0);
  const meta = await env.DB.prepare("SELECT value FROM meta WHERE key = 'last_updated'").first<{ value: string }>();
  const { regions, cities } = await regionalSummary(env, since);

  return jsonResponse(request, {
    total,
    countries,
    regions,
    cities,
    lastUpdated: meta?.value ?? new Date().toISOString()
  });
}

async function regionalSummary(env: Env, since: string) {
  try {
    const regionsResult = await env.DB.prepare(
      `SELECT
         country_code,
         region_key,
         region_code,
         region_name,
         SUM(count) AS visits,
         AVG(latitude) AS latitude,
         AVG(longitude) AS longitude,
         COUNT(DISTINCT NULLIF(city_name, '')) AS city_count
       FROM regional_visits
       WHERE day >= ?
       GROUP BY country_code, region_key, region_code, region_name
       ORDER BY visits DESC
       LIMIT 24`
    )
      .bind(since)
      .all<{
        country_code: string;
        region_key: string;
        region_code: string | null;
        region_name: string;
        visits: number;
        latitude: number | null;
        longitude: number | null;
        city_count: number;
      }>();

    const citiesResult = await env.DB.prepare(
      `SELECT
         country_code,
         region_key,
         region_name,
         city_name,
         SUM(count) AS visits,
         AVG(latitude) AS latitude,
         AVG(longitude) AS longitude
       FROM regional_visits
       WHERE day >= ? AND city_name != ''
       GROUP BY country_code, region_key, region_name, city_name
       ORDER BY visits DESC
       LIMIT 12`
    )
      .bind(since)
      .all<{
        country_code: string;
        region_key: string;
        region_name: string;
        city_name: string;
        visits: number;
        latitude: number | null;
        longitude: number | null;
      }>();

    const regionRows = (regionsResult.results ?? []) as {
      country_code: string;
      region_key: string;
      region_code: string | null;
      region_name: string;
      visits: number;
      latitude: number | null;
      longitude: number | null;
      city_count: number;
    }[];
    const regions = regionRows.map((row) => ({
      countryCode: row.country_code,
      countryName: countryNames.of(row.country_code) ?? row.country_code,
      regionKey: row.region_key,
      regionCode: row.region_code ?? "",
      regionName: row.region_name,
      visits: Number(row.visits),
      cityCount: Number(row.city_count ?? 0),
      latitude: row.latitude,
      longitude: row.longitude
    }));

    const cityRows = (citiesResult.results ?? []) as {
      country_code: string;
      region_key: string;
      region_name: string;
      city_name: string;
      visits: number;
      latitude: number | null;
      longitude: number | null;
    }[];
    const cities = cityRows.map((row) => ({
      countryCode: row.country_code,
      countryName: countryNames.of(row.country_code) ?? row.country_code,
      regionKey: row.region_key,
      regionName: row.region_name,
      cityName: row.city_name,
      visits: Number(row.visits),
      latitude: row.latitude,
      longitude: row.longitude
    }));

    return { regions, cities };
  } catch {
    return { regions: [], cities: [] };
  }
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

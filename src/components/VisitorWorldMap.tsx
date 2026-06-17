import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json";
import { countryCatalog, type VisitorRegionStat, type VisitorSummary } from "@data/visitorStats";

type ApiCountryStat = {
  countryCode?: string;
  country_code?: string;
  countryName?: string;
  country_name?: string;
  visits?: number;
  count?: number;
};

type ApiRegionStat = ApiCountryStat & {
  regionKey?: string;
  region_key?: string;
  regionCode?: string;
  region_code?: string;
  regionName?: string;
  region_name?: string;
  cityName?: string;
  city_name?: string;
  cityCount?: number;
  city_count?: number;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type ApiSummary = {
  total?: number;
  countries?: ApiCountryStat[];
  regions?: ApiRegionStat[];
  cities?: ApiRegionStat[];
  lastUpdated?: string;
  last_updated?: string;
};

type Props = {
  fallback: VisitorSummary;
  apiBase?: string;
};

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name?: string } | null> & {
  id?: string | number;
};

const topoCountries = countries110 as unknown as {
  objects: { countries: unknown };
};

function normalizeSummary(payload: ApiSummary, fallback: VisitorSummary): VisitorSummary {
  const countries = (payload.countries ?? [])
    .map((item) => {
      const countryCode = String(item.countryCode ?? item.country_code ?? "").toUpperCase();
      const catalogItem = countryCatalog[countryCode];
      const visits = Number(item.visits ?? item.count ?? 0);
      if (!countryCode || !catalogItem || !Number.isFinite(visits) || visits <= 0) return null;
      return {
        countryCode,
        countryName: catalogItem.name,
        numericCode: catalogItem.numeric,
        visits
      };
    })
    .filter((item): item is VisitorSummary["countries"][number] => Boolean(item))
    .sort((a, b) => b.visits - a.visits);

  if (countries.length === 0) return fallback;
  const regions = normalizeRegions(payload.regions ?? []);
  const cities = normalizeRegions(payload.cities ?? []);

  return {
    source: "api",
    total: Number(payload.total ?? countries.reduce((sum, item) => sum + item.visits, 0)),
    lastUpdated: String(payload.lastUpdated ?? payload.last_updated ?? new Date().toISOString()),
    countries,
    regions,
    cities
  };
}

function normalizeRegions(items: ApiRegionStat[]): VisitorRegionStat[] {
  const normalized = items
    .map((item) => {
      const countryCode = String(item.countryCode ?? item.country_code ?? "").toUpperCase();
      const catalogItem = countryCatalog[countryCode];
      const visits = Number(item.visits ?? item.count ?? 0);
      const regionName = String(item.regionName ?? item.region_name ?? "").trim();
      const regionKey = String(item.regionKey ?? item.region_key ?? item.regionCode ?? item.region_code ?? regionName).trim();
      if (!countryCode || !catalogItem || !regionName || !regionKey || !Number.isFinite(visits) || visits <= 0) {
        return null;
      }

      const latitude = Number(item.latitude);
      const longitude = Number(item.longitude);
      const hasPoint =
        Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;

      const region: VisitorRegionStat = {
        countryCode,
        countryName: String(item.countryName ?? item.country_name ?? catalogItem.name),
        regionKey,
        regionName,
        visits
      };

      const regionCode = String(item.regionCode ?? item.region_code ?? "").trim();
      const cityName = String(item.cityName ?? item.city_name ?? "").trim();
      const cityCount = Number(item.cityCount ?? item.city_count ?? 0);
      if (regionCode) region.regionCode = regionCode;
      if (cityName) region.cityName = cityName;
      if (Number.isFinite(cityCount) && cityCount > 0) region.cityCount = cityCount;
      if (hasPoint) {
        region.latitude = latitude;
        region.longitude = longitude;
      }

      return region;
    })
    .filter((item): item is VisitorRegionStat => item !== null);

  return normalized
    .sort((a, b) => b.visits - a.visits);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function VisitorWorldMap({ fallback, apiBase }: Props) {
  const [summary, setSummary] = useState<VisitorSummary | null>(() => (apiBase ? null : fallback));
  const isLoading = summary === null;
  const displaySummary: VisitorSummary =
    summary ?? {
      source: "fallback",
      total: 0,
      countries: [],
      regions: [],
      cities: [],
      lastUpdated: ""
    };

  const countryFeatures = useMemo(() => {
    const collection = feature(topoCountries as never, topoCountries.objects.countries as never) as unknown as GeoJSON.FeatureCollection;
    return collection.features as CountryFeature[];
  }, []);

  const visitsByNumericCode = useMemo(() => {
    const map = new Map<string, number>();
    displaySummary.countries.forEach((country) => map.set(country.numericCode, country.visits));
    return map;
  }, [displaySummary]);

  const maxVisits = Math.max(...displaySummary.countries.map((country) => country.visits), 1);
  const maxRegionVisits = Math.max(...displaySummary.regions.map((region) => region.visits), 1);
  const topRegions = displaySummary.regions.slice(0, 6);
  const topRegionRows =
    topRegions.length > 0
      ? topRegions
      : displaySummary.countries.slice(0, 6).map((country) => ({
          countryCode: country.countryCode,
          countryName: "Country total while regions warm up",
          regionKey: country.countryCode,
          regionName: country.countryName,
          visits: country.visits
        }));
  const topCities = displaySummary.cities.slice(0, 4);
  const projection = geoNaturalEarth1().scale(165).translate([480, 250]);
  const path = geoPath(projection);
  const regionPoints = displaySummary.regions
    .filter((region) => typeof region.latitude === "number" && typeof region.longitude === "number")
    .slice(0, 18);

  useEffect(() => {
    if (!apiBase) return;
    const controller = new AbortController();
    const base = apiBase.replace(/\/$/, "");

    async function collectAndLoad() {
      try {
        const storageKey = "cj-site-visitor-collected";
        if (sessionStorage.getItem(storageKey) !== "1") {
          await fetch(`${base}/collect`, {
            method: "POST",
            mode: "cors",
            signal: controller.signal
          });
          sessionStorage.setItem(storageKey, "1");
        }

        const response = await fetch(`${base}/summary?days=30`, {
          mode: "cors",
          signal: controller.signal
        });
        if (!response.ok) {
          setSummary(fallback);
          return;
        }
        const payload = (await response.json()) as ApiSummary;
        setSummary(normalizeSummary(payload, fallback));
      } catch {
        setSummary(fallback);
      }
    }

    void collectAndLoad();
    return () => controller.abort();
  }, [apiBase, fallback]);

  return (
    <section className="visitor-shell" aria-labelledby="visitors-title">
      <div className="visitor-copy">
        <p className="section-label">Visitor Analytics</p>
        <h2 id="visitors-title">Global research reach</h2>
        <p>
          Region-level visitor aggregation for the academic homepage. The production path uses a
          Cloudflare Worker and D1, without storing IP addresses.
        </p>
        <div className="visitor-metrics" aria-label="Visitor summary">
          <div>
            <strong>{isLoading ? "..." : displaySummary.total.toLocaleString("en")}</strong>
            <span>Total visits</span>
          </div>
          <div>
            <strong>{isLoading ? "..." : displaySummary.countries.length}</strong>
            <span>Countries</span>
          </div>
          <div>
            <strong>{isLoading ? "..." : displaySummary.regions.length}</strong>
            <span>Regions</span>
          </div>
          <div>
            <strong>{isLoading ? "Loading" : displaySummary.source === "api" ? "Live" : "Fallback"}</strong>
            <span>Data source</span>
          </div>
        </div>
      </div>

      <div className="visitor-map-panel">
        <svg className="visitor-map" viewBox="0 0 960 500" role="img" aria-label="World visitor heatmap">
          <rect x="0" y="0" width="960" height="500" rx="8" className="map-ocean" />
          {countryFeatures.map((country) => {
            const numericCode = String(country.id ?? "").padStart(3, "0");
            const visits = visitsByNumericCode.get(numericCode) ?? 0;
            const intensity = visits > 0 ? Math.max(0.24, Math.log1p(visits) / Math.log1p(maxVisits)) : 0;
            const fill = visits > 0 ? `rgba(8, 124, 118, ${0.26 + intensity * 0.72})` : undefined;
            return (
              <path
                key={numericCode}
                d={path(country) ?? undefined}
                className="map-country"
                style={fill ? { fill } : undefined}
              >
                <title>{visits > 0 ? `${visits.toLocaleString("en")} visits` : "No visits yet"}</title>
              </path>
            );
          })}
          {regionPoints.map((region) => {
            const coords = projection([region.longitude as number, region.latitude as number]);
            if (!coords) return null;
            const intensity = Math.max(0.25, Math.log1p(region.visits) / Math.log1p(maxRegionVisits));
            const radius = 3.5 + intensity * 8;
            const label = `${region.regionName}, ${region.countryName}: ${region.visits.toLocaleString("en")} visits`;
            return (
              <g
                key={`${region.countryCode}-${region.regionKey}`}
                className="map-region-point"
                aria-label={label}
                transform={`translate(${coords[0]} ${coords[1]})`}
              >
                <circle className="map-region-pulse" r={radius + 5} style={{ opacity: 0.08 + intensity * 0.16 }} />
                <circle className="map-region-dot" r={radius} style={{ opacity: 0.48 + intensity * 0.46 }} />
                <title>{label}</title>
              </g>
            );
          })}
        </svg>
        <div className="visitor-map-footer">
          <span>Updated {isLoading ? "Loading live data" : formatDate(displaySummary.lastUpdated)}</span>
          <span>Region aggregate · No IP storage</span>
        </div>
      </div>

      <aside className="visitor-ranking" aria-label="Top visitor regions">
        <h3>Top regions</h3>
        <ol>
          {isLoading ? (
            <li>
              <span>Loading live data</span>
              <strong>...</strong>
            </li>
          ) : (
            topRegionRows.map((region) => (
              <li key={`${region.countryCode}-${region.regionKey}`}>
                <span>
                  {region.regionName}
                  <small>{region.countryName}</small>
                </span>
                <strong>{region.visits.toLocaleString("en")}</strong>
              </li>
            ))
          )}
        </ol>
        {!isLoading && topCities.length > 0 ? (
          <div className="visitor-city-signals">
            <h4>City signals</h4>
            <ul>
              {topCities.map((city) => (
                <li key={`${city.countryCode}-${city.regionKey}-${city.cityName}`}>
                  <span>{city.cityName}</span>
                  <strong>{city.visits.toLocaleString("en")}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

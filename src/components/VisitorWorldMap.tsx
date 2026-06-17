import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json";
import { countryCatalog, type VisitorSummary } from "@data/visitorStats";

type ApiCountryStat = {
  countryCode?: string;
  country_code?: string;
  visits?: number;
  count?: number;
};

type ApiSummary = {
  total?: number;
  countries?: ApiCountryStat[];
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

  return {
    source: "api",
    total: Number(payload.total ?? countries.reduce((sum, item) => sum + item.visits, 0)),
    lastUpdated: String(payload.lastUpdated ?? payload.last_updated ?? new Date().toISOString()),
    countries
  };
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
      lastUpdated: ""
    };

  const countryFeatures = useMemo(() => {
    const collection = feature(topoCountries, topoCountries.objects.countries) as GeoJSON.FeatureCollection;
    return collection.features as CountryFeature[];
  }, []);

  const visitsByNumericCode = useMemo(() => {
    const map = new Map<string, number>();
    displaySummary.countries.forEach((country) => map.set(country.numericCode, country.visits));
    return map;
  }, [displaySummary]);

  const maxVisits = Math.max(...displaySummary.countries.map((country) => country.visits), 1);
  const topCountries = displaySummary.countries.slice(0, 6);
  const projection = geoNaturalEarth1().scale(165).translate([480, 250]);
  const path = geoPath(projection);

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
          Country-level visitor aggregation for the academic homepage. The production path uses a
          Cloudflare Worker and D1, while this static build remains publishable with fallback data.
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
        </svg>
        <div className="visitor-map-footer">
          <span>Updated {isLoading ? "Loading live data" : formatDate(displaySummary.lastUpdated)}</span>
          <span>Country-level only · No IP storage</span>
        </div>
      </div>

      <aside className="visitor-ranking" aria-label="Top countries">
        <h3>Top countries</h3>
        <ol>
          {isLoading ? (
            <li>
              <span>Loading live data</span>
              <strong>...</strong>
            </li>
          ) : (
            topCountries.map((country) => (
              <li key={country.countryCode}>
                <span>{country.countryName}</span>
                <strong>{country.visits.toLocaleString("en")}</strong>
              </li>
            ))
          )}
        </ol>
      </aside>
    </section>
  );
}

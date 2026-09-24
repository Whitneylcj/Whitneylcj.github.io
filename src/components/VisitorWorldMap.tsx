import { geoNaturalEarth1, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json";
import { countryCatalog, normalizeVisitorSummary, visitorColor, visitorColorBands, type VisitorSummary } from "@data/visitorStats";

declare global {
  interface Window { __cjVisitorCollection?: Promise<void>; }
}

type Props = { fallback: VisitorSummary; apiBase?: string };
type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name?: string } | null> & { id?: string | number };
const topoCountries = countries110 as unknown as { objects: { countries: unknown } };
const projection = geoNaturalEarth1().fitExtent([[14, 14], [946, 470]], { type: "Sphere" });
const path = geoPath(projection);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function VisitorWorldMap({ fallback, apiBase }: Props) {
  const [summary, setSummary] = useState<VisitorSummary | null>(() => (apiBase ? null : fallback));
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const isLoading = summary === null;
  const isUnavailable = summary?.source === "fallback";
  const displaySummary = summary ?? fallback;
  const selected = displaySummary.countries.find((country) => country.countryCode === selectedCode);
  const countryFeatures = useMemo(() => {
    const collection = feature(topoCountries as never, topoCountries.objects.countries as never) as unknown as GeoJSON.FeatureCollection;
    return collection.features as CountryFeature[];
  }, []);
  const countriesByNumeric = new Map(displaySummary.countries.filter((country) => country.numericCode).map((country) => [country.numericCode, country]));
  const largestCount = Math.max(1, ...displaySummary.countries.map((country) => country.visits));
  const topRegions = displaySummary.regions.slice(0, 6);
  const topCities = displaySummary.cities.slice(0, 6);
  const emptyMessage = isLoading ? "Loading visitor data…" : isUnavailable ? "Visitor data is currently unavailable." : "No visits recorded in the last 30 days.";

  useEffect(() => {
    if (!apiBase) return;
    const controller = new AbortController();
    const base = apiBase.replace(/\/$/, "");
    async function loadSummary() {
      try {
        // Entry collection remains independent of map rendering and scrolling.
        await window.__cjVisitorCollection;
        if (controller.signal.aborted) return;
        const response = await fetch(`${base}/summary?days=30`, { mode: "cors", signal: controller.signal });
        const next = response.ok ? normalizeVisitorSummary(await response.json()) : fallback;
        if (!controller.signal.aborted) setSummary(next);
      } catch {
        if (!controller.signal.aborted) setSummary(fallback);
      }
    }
    void loadSummary();
    return () => controller.abort();
  }, [apiBase, fallback]);

  return (
    <section className="visitor-shell" aria-labelledby="visitors-title">
      <header className="visitor-heading">
        <div>
          <p className="section-label">Visitor Analytics</p>
          <h2 id="visitors-title">Readers around the world</h2>
          <p className="visitor-description">A view of visits over the last 30 days.</p>
        </div>
        <dl className="visitor-metrics" aria-label="Visitor summary">
          <div><dt>Visits</dt><dd>{isLoading ? "…" : isUnavailable ? "—" : displaySummary.total.toLocaleString("en")}</dd></div>
          <div><dt>Countries / regions</dt><dd>{isLoading ? "…" : isUnavailable ? "—" : displaySummary.countries.length}</dd></div>
        </dl>
      </header>

      <div className="visitor-map-panel">
        <svg className="visitor-map" viewBox="0 0 960 484" role="img" aria-labelledby="visitor-map-title visitor-map-description">
          <title id="visitor-map-title">Visitor distribution by country</title>
          <desc id="visitor-map-description">Blue indicates recorded visits. Dots mark country reference locations, including countries too small to see at this scale. Select a country in the list below to highlight it.</desc>
          {countryFeatures.map((geometry, index) => {
            const numericCode = String(geometry.id ?? "").padStart(3, "0");
            const country = countriesByNumeric.get(numericCode);
            const name = country?.countryName ?? geometry.properties?.name ?? "Country";
            return <path key={`${numericCode}-${index}`} d={path(geometry) ?? undefined}
              className={`map-country${country?.countryCode === selectedCode ? " is-selected" : ""}`}
              style={{ fill: visitorColor(country?.visits ?? 0) }}>
              <title>{`${name}: ${country ? `${country.visits} visits` : "no recorded visits"}`}</title>
            </path>;
          })}
          {displaySummary.countries.map((country) => {
            const location = countryCatalog[country.countryCode];
            const point = location && projection([location.longitude, location.latitude]);
            if (!point) return null;
            return <g key={country.countryCode} data-country={country.countryCode}
              className={`map-country-marker${selectedCode === country.countryCode ? " is-selected" : ""}`}
              transform={`translate(${point[0]} ${point[1]})`}>
              <title>{`${country.countryName}: ${country.visits} visits`}</title>
              <circle className="map-marker-halo" r="17" />
              <circle className="map-marker-dot" r="8" style={{ fill: visitorColor(country.visits) }} />
            </g>;
          })}
        </svg>
        <div className="visitor-map-caption" aria-live="polite">
          {selected ? <><strong>{selected.countryName}</strong><span>{selected.visits.toLocaleString("en")} visits · last 30 days</span></> :
            displaySummary.countries.length ? <><strong>Country overview</strong><span>Select a country below to highlight it.</span></> : <span>{emptyMessage}</span>}
        </div>
        <div className="visitor-legend" aria-label="Visits per country: gray means no recorded visits; blue ranges from 1 to 20 or more visits">
          <div className="visitor-legend-label"><strong>Visits per country</strong><span><i className="visitor-no-data-swatch" />No recorded visits</span></div>
          <ol className="visitor-color-scale">
            {visitorColorBands.map((band) => <li key={band.min}><i style={{ background: band.color }} /><span>{band.label}</span></li>)}
          </ol>
        </div>
      </div>

      <div className="visitor-breakdown">
        <div className="visitor-countries">
          <h3>Countries &amp; regions</h3>
          <ol>
            {displaySummary.countries.map((country) => <li key={country.countryCode}>
              <button type="button" aria-pressed={selectedCode === country.countryCode}
                onClick={() => setSelectedCode(selectedCode === country.countryCode ? null : country.countryCode)}>
                <span className="visitor-country-name"><i style={{ background: visitorColor(country.visits) }} />{country.countryName}</span>
                <strong>{country.visits.toLocaleString("en")}</strong>
                <span className="visitor-country-bar" aria-hidden="true"><i style={{ width: `${country.visits / largestCount * 100}%`, background: visitorColor(country.visits) }} /></span>
              </button>
            </li>)}
          </ol>
          {!displaySummary.countries.length && <p className="visitor-empty">{emptyMessage}</p>}
        </div>
        <div className="visitor-regions">
          <h3>Regional detail</h3>
          <ol>{topRegions.map((region) => <li key={`${region.countryCode}-${region.regionKey}`}>
            <span>{region.regionName}<small>{region.countryName}</small></span><strong>{region.visits.toLocaleString("en")}</strong>
          </li>)}</ol>
          {!topRegions.length && <p className="visitor-empty">{isLoading ? "Loading…" : "Regional detail is not available."}</p>}
          {!!topCities.length && <details className="visitor-cities"><summary>City detail</summary><ol>
            {topCities.map((city) => <li key={`${city.countryCode}-${city.regionKey}-${city.cityName}`}><span>{city.cityName}<small>{city.regionName}</small></span><strong>{city.visits.toLocaleString("en")}</strong></li>)}
          </ol></details>}
        </div>
      </div>
      <footer className="visitor-map-footer">
        <p>{isLoading ? "Loading visitor data…" : isUnavailable ? "Visitor data unavailable" : `Updated ${formatDate(displaySummary.lastUpdated)}`}<span> · IP addresses are not stored.</span></p>
        <p>Dots indicate country locations, not individual visitors. <a href="https://github.com/mledoze/countries">Country data</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</a></p>
      </footer>
    </section>
  );
}

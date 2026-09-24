import geography from "./visitorCountries.json" with { type: "json" };

export type VisitorCountryStat = {
  countryCode: string;
  countryName: string;
  numericCode: string;
  visits: number;
};

export type VisitorRegionStat = {
  countryCode: string;
  countryName: string;
  regionKey: string;
  regionCode?: string;
  regionName: string;
  cityName?: string;
  cityCount?: number;
  latitude?: number;
  longitude?: number;
  visits: number;
};

export type VisitorSummary = {
  total: number;
  countries: VisitorCountryStat[];
  regions: VisitorRegionStat[];
  cities: VisitorRegionStat[];
  lastUpdated: string;
  source: "api" | "fallback";
};

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

export const countryCatalog: Record<string, {
  name: string;
  numeric: string;
  latitude: number;
  longitude: number;
}> = geography;

// Fixed bins keep the legend comparable as traffic changes. Zero stays neutral.
export const visitorColorBands = [
  { min: 1, label: "1", color: "var(--visitor-blue-1)" },
  { min: 2, label: "2–4", color: "var(--visitor-blue-2)" },
  { min: 5, label: "5–9", color: "var(--visitor-blue-3)" },
  { min: 10, label: "10–19", color: "var(--visitor-blue-4)" },
  { min: 20, label: "20+", color: "var(--visitor-blue-5)" }
] as const;

export function visitorColor(visits: number): string | undefined {
  if (!Number.isFinite(visits) || visits < 1) return undefined;
  return visitorColorBands.findLast((band) => visits >= band.min)?.color;
}

function countryName(code: string, item: ApiCountryStat) {
  return countryCatalog[code]?.name || String(item.countryName ?? item.country_name ?? code);
}

function coordinate(value: number | string | null | undefined, limit: number) {
  if (value === null || value === undefined || String(value).trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : undefined;
}

function normalizeRegions(items: ApiRegionStat[]): VisitorRegionStat[] {
  return items.flatMap((item) => {
    const countryCode = String(item.countryCode ?? item.country_code ?? "").trim().toUpperCase();
    const visits = Number(item.visits ?? item.count ?? 0);
    const regionName = String(item.regionName ?? item.region_name ?? "").trim();
    const regionKey = String(item.regionKey ?? item.region_key ?? item.regionCode ?? item.region_code ?? regionName).trim();
    if (!countryCode || !regionName || !regionKey || !Number.isFinite(visits) || visits <= 0) return [];

    const region: VisitorRegionStat = { countryCode, countryName: countryName(countryCode, item), regionKey, regionName, visits };
    const regionCode = String(item.regionCode ?? item.region_code ?? "").trim();
    const cityName = String(item.cityName ?? item.city_name ?? "").trim();
    const cityCount = Number(item.cityCount ?? item.city_count ?? 0);
    const latitude = coordinate(item.latitude, 90);
    const longitude = coordinate(item.longitude, 180);
    if (regionCode) region.regionCode = regionCode;
    if (cityName) region.cityName = cityName;
    if (Number.isFinite(cityCount) && cityCount > 0) region.cityCount = cityCount;
    if (latitude !== undefined && longitude !== undefined) {
      region.latitude = latitude;
      region.longitude = longitude;
    }
    return [region];
  }).sort((a, b) => b.visits - a.visits);
}

export function normalizeVisitorSummary(payload: ApiSummary): VisitorSummary {
  const countries = (payload.countries ?? []).flatMap((item): VisitorCountryStat[] => {
    const countryCode = String(item.countryCode ?? item.country_code ?? "").trim().toUpperCase();
    const visits = Number(item.visits ?? item.count ?? 0);
    if (!countryCode || !Number.isFinite(visits) || visits <= 0) return [];
    // Retain unfamiliar country codes in the list even if geometry is unavailable.
    return [{ countryCode, countryName: countryName(countryCode, item), numericCode: countryCatalog[countryCode]?.numeric ?? "", visits }];
  }).sort((a, b) => b.visits - a.visits);
  const total = Number(payload.total ?? countries.reduce((sum, item) => sum + item.visits, 0));
  return {
    source: "api",
    total: Number.isFinite(total) && total >= 0 ? total : countries.reduce((sum, item) => sum + item.visits, 0),
    countries,
    regions: normalizeRegions(payload.regions ?? []),
    cities: normalizeRegions(payload.cities ?? []),
    lastUpdated: String(payload.lastUpdated ?? payload.last_updated ?? "")
  };
}

// API failures must not be represented as fabricated visitor traffic.
export const fallbackVisitorSummary: VisitorSummary = {
  source: "fallback", total: 0, lastUpdated: "", countries: [], regions: [], cities: []
};
